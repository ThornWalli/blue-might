/* eslint-disable complexity */

import { Vector3 } from 'three';
import { EMPTY, filter, fromEvent, ReplaySubject, switchMap } from 'rxjs';

import type { AnimationLoopValue } from '../../Renderer';
import MovableUnitModule, {
  type MovableUnitModuleObservables,
  type MovableUnitModuleOptions,
  type MovableUnitModuleState
} from '../Movable';
import type HelicopterUnit from '../../unit/vehicle/Helicopter';
import { getDefaultControls } from '../../playerModule/Controls';

declare module '../../Unit' {
  interface ModuleStates {
    helicopter: Partial<HelicopterUnitModuleState>;
  }
  interface ModuleOptions {
    helicopter: Partial<HelicopterUnitModuleOptions>;
  }
  interface ModuleDebug {
    helicopter: boolean;
  }
}

interface HelicopterUnitObservables extends MovableUnitModuleObservables {
  flightStatus$: ReplaySubject<FLIGHT_STATUS>;
  gearsActive$: ReplaySubject<boolean>;
  gearsOpened$: ReplaySubject<boolean>;
}

export interface HelicopterUnitModuleOptions extends MovableUnitModuleOptions {
  gearsHeight: number;
  maxSpeed: number;
  acceleration: number;
  yawSpeed: number; // how fast yaw rotates
  pitchPower: number; // forward/back tilt strength
  rollPower: number; // side tilt strength
  friction: number;
  liftPower: number; // vertical acceleration
  maxAltitude: number; // clamp altitude
  fixedAltitude?: number; // if set, use takeoff/land to snap here
  autoAltitude?: boolean; // if true, automatically maintain a certain altitude
  autoLevelRate?: number; // how fast tilt recenters
}

export enum FLIGHT_STATUS {
  LANDED = 'landed',
  TAKING_OFF = 'taking_off',
  FLYING = 'flying',
  LANDING = 'landing'
}

export interface HelicopterUnitModuleState extends MovableUnitModuleState {
  tilt: Vector3; // x=pitch, y=unused, z=roll (right-handed; adjust as needed)
  groundNormal: Vector3;
  isAirborne?: boolean;
  yawVelocity?: number;
  targetAltitude?: number;
  flightStatus: FLIGHT_STATUS;
  //#region gears
  gearsOpened: boolean;
  gearsActive: boolean;
  //#endregion
}

export default class HelicopterUnitModule<
  Options extends HelicopterUnitModuleOptions = HelicopterUnitModuleOptions,
  State extends HelicopterUnitModuleState = HelicopterUnitModuleState,
  Obervables extends HelicopterUnitObservables = HelicopterUnitObservables,
  U extends HelicopterUnit = HelicopterUnit
> extends MovableUnitModule<Options, State, Obervables, U> {
  static override TYPE = 'helicopter';
  private _right = new Vector3();

  override getControls() {
    const human = super.getControls();
    const ai = this.getAIControls();
    if (!ai) return human;

    return {
      ...getDefaultControls(),

      ascend: ai.ascend ?? human.ascend,
      descend: ai.descend ?? human.descend,

      gear: ai.gear ?? human.gear,
      landing: ai.landing ?? human.landing,
      rotateLeft: ai.rotateLeft ?? human.rotateLeft,
      rotateRight: ai.rotateRight ?? human.rotateRight,

      pitchUp: ai.pitchUp ?? human.pitchUp,
      pitchDown: ai.pitchDown ?? human.pitchDown,
      rollLeft: ai.rollLeft ?? human.rollLeft,
      rollRight: ai.rollRight ?? human.rollRight
    };
  }

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        gearsHeight: options.gearsHeight ?? 0,
        maxSpeed: options.maxSpeed ?? 10,
        acceleration: options.acceleration ?? 2,
        yawSpeed: options.yawSpeed ?? 4,
        pitchPower: options.pitchPower ?? 1,
        rollPower: options.rollPower ?? 0.5,
        friction: options.friction ?? 0.96,
        liftPower: options.liftPower ?? 2,
        maxAltitude: options.maxAltitude ?? 10,
        autoAltitude: options.autoAltitude ?? true,
        autoLevelRate: options.autoLevelRate ?? 2
      } as Options,
      {
        ...state,
        tilt: state.tilt ?? new Vector3(0, 0, 0),
        groundNormal: state.groundNormal ?? new Vector3(0, 1, 0),
        isAirborne: state.isAirborne ?? false,
        yawVelocity: state.yawVelocity ?? 0,
        gearsActive: false,
        gearsOpened: state.gearsOpened ?? true,
        flightStatus: FLIGHT_STATUS.LANDED,
        maxPower: state.maxPower ?? 4,
        minPower: state.minPower ?? 2,
        idlePower: state.idlePower ?? 0.2
      } as State,
      debug
    );

    //#region observables
    this.observables.gearsActive$ = new ReplaySubject<boolean>(1);
    this.observables.gearsActive$.next(this.state.gearsActive);
    this.observables.gearsOpened$ = new ReplaySubject<boolean>(1);
    this.observables.gearsOpened$.next(this.state.gearsOpened);
    this.observables.flightStatus$ = new ReplaySubject<FLIGHT_STATUS>(1);
    this.observables.flightStatus$.next(this.state.flightStatus);
    //#endregion
  }

  override async afterSetup() {
    await super.afterSetup();

    const unit = this.getUnit();

    this.subscription.add(
      unit.modules.player.observables.player$
        .pipe(
          switchMap(
            player => player?.modules.controls.observables.controls$ ?? EMPTY
          )
        )
        .subscribe(controls => {
          if (controls.gear) {
            this.toggleGears();
          }
        })
    );

    this.subscription.add(
      fromEvent(unit.modules.animation.getMixer(), 'finished')
        .pipe(
          filter(
            e => e.action === unit.modules.animation.getAction('land_gears')
          )
        )
        .subscribe(e => {
          if ('direction' in e) {
            this.setGearsOpened(e.direction < 0);
          }
        })
    );
  }

  toggleGears() {
    if (!this.state.gearsActive) {
      this.state.gearsActive = true;
      this.observables.gearsActive$.next(this.state.gearsActive);
      console.log('Toggling gears to', this.state.gearsActive);
    }
  }
  getGearsOpened() {
    return this.state.gearsOpened;
  }

  private setGearsOpened(opened: boolean) {
    this.state.gearsActive = false;
    this.state.gearsOpened = opened;
    this.observables.gearsOpened$.next(this.state.gearsOpened);
    this.observables.gearsActive$.next(this.state.gearsActive);
  }

  override getMaxPower(): number {
    if (this.state.active) {
      if (
        this.state.flightStatus === FLIGHT_STATUS.FLYING ||
        this.state.flightStatus === FLIGHT_STATUS.TAKING_OFF ||
        this.state.flightStatus === FLIGHT_STATUS.LANDING
      ) {
        return this.state.maxPower;
      }
      return this.state.idlePower;
    }
    return 0;
  }
  getMaxPitch() {
    // Wenn die Gears gerade animiert werden ODER ausgefahren sind, begrenze die Neigung stark.
    return this.state.gearsActive || this.state.gearsOpened ? 0.2 : 0.6;
  }

  getMaxRoll() {
    // Wenn die Gears gerade animiert werden ODER ausgefahren sind, begrenze die Neigung stark.
    return this.state.gearsActive || this.state.gearsOpened ? 0.2 : 0.6;
  }
  override update({ delta, time }: AnimationLoopValue): void {
    super.update({ delta, time });
    this.moveUpdate({ delta });
  }

  lastPosition = new Vector3();
  moveUpdate({ delta }: { delta: number }) {
    const unit = this.getUnit();

    const controls = this.getControls();
    // console.log('YYYY', controls.ascend);
    const active = this.state.active;

    if (controls.gear) {
      this.toggleGears();
    }

    const friction = this.options.friction;
    const maxSpeed = this.options.maxSpeed;
    const yawAccel = this.options.yawSpeed; // use as angular accel
    const pitchPower = this.options.pitchPower;
    const rollPower = this.options.rollPower;
    const liftPower = this.options.liftPower;
    const autoAltitude = this.options.autoAltitude;
    const autoLevelRate = this.options.autoLevelRate ?? 2;
    const currentPower = this.getCurrentPower();

    const isLanded = this.getFlightStatus() === FLIGHT_STATUS.LANDED;
    const isTakingOff = this.getFlightStatus() === FLIGHT_STATUS.TAKING_OFF;
    const canRollPitch = !isLanded && !isTakingOff;
    const eps = 1e-4;

    const velocity = this.state.velocity;
    const tilt = this.state.tilt;
    let forward = this.getTmpDirection();
    if (active) {
      // Inputs
      const pitchInput = canRollPitch
        ? (typeof controls.pitchUp === 'number'
            ? controls.pitchUp
            : controls.pitchUp
              ? 1
              : 0) -
          (typeof controls.pitchDown === 'number'
            ? controls.pitchDown
            : controls.pitchDown
              ? 1
              : 0)
        : 0;
      const rollInput = canRollPitch
        ? (typeof controls.rollLeft === 'number'
            ? controls.rollLeft
            : controls.rollLeft
              ? 1
              : 0) -
          (typeof controls.rollRight === 'number'
            ? controls.rollRight
            : controls.rollRight
              ? 1
              : 0)
        : 0;
      // Yaw: invertiere, wenn deine Welt rechtsdrehend ist
      const yawInput =
        (typeof controls.rotateLeft === 'number'
          ? controls.rotateLeft
          : controls.rotateLeft
            ? 1
            : 0) -
        (typeof controls.rotateRight === 'number'
          ? controls.rotateRight
          : controls.rotateRight
            ? 1
            : 0);

      // Tilt integrate
      tilt.x += pitchInput * pitchPower * delta;
      tilt.z += rollInput * rollPower * delta;

      const maxPitch = this.getMaxPitch();
      const maxRoll = this.getMaxRoll();
      tilt.x = Math.max(-maxPitch, Math.min(maxPitch, tilt.x));
      tilt.z = Math.max(-maxRoll, Math.min(maxRoll, tilt.z));

      // Auto-level
      if (pitchInput === 0) {
        tilt.x += (0 - tilt.x) * Math.min(1, autoLevelRate * delta);
      }
      if (rollInput === 0) {
        tilt.z += (0 - tilt.z) * Math.min(1, autoLevelRate * delta);
      }

      // Smooth Yaw via angular velocity (zeitbasiert, weniger snappy)
      const yawDamp = 3.5;
      const yawFriction = Math.exp(-yawDamp * delta);
      const maxYawVel = 2.5; // Erhöht von 2.0 für höhere maximale Drehgeschwindigkeit

      // nutze delta im angular accel
      this.state.yawVelocity! += yawInput * yawAccel * delta;
      this.state.yawVelocity! *= yawFriction;

      if (Math.abs(this.state.yawVelocity!) < 0.003) this.state.yawVelocity = 0;
      this.state.yawVelocity! = Math.max(
        -maxYawVel,
        Math.min(maxYawVel, this.state.yawVelocity!)
      );
      unit.setYaw(unit.getYaw() + this.state.yawVelocity! * delta);

      // Flight direction (Forward aus Yaw+Pitch)
      const yaw = unit.getYaw();
      this.setTmpDirection(
        Math.sin(yaw) * Math.cos(tilt.x),
        Math.sin(tilt.x),
        Math.cos(yaw) * Math.cos(tilt.x)
      );
      forward = this.getTmpDirection();

      // Right NUR aus Yaw (kein Pitch-Einfluss, garantiert echte Seitwärtsbewegung)
      this.getTmpRight().set(Math.cos(yaw), 0, -Math.sin(yaw));
      const right = this.getTmpRight();

      // Translational thrust
      const forwardAccel = pitchPower * 8;
      const strafeAccel = rollPower * 6;

      // Direct strafe on input: invertiere nicht mehr, "Right" → +right
      const strafeInput = canRollPitch
        ? (controls.rollLeft ? 1 : 0) - (controls.rollRight ? 1 : 0)
        : 0;
      const strafeControlAccel = strafeAccel * 0.75;
      if (strafeInput !== 0) {
        velocity.addScaledVector(
          right,
          strafeControlAccel * strafeInput * delta
        );
      }

      // Tilt-based thrust (nur XZ-Ebene)
      const forwardFlat = forward.clone();
      forwardFlat.y = 0;
      forwardFlat.normalize();
      velocity.addScaledVector(forwardFlat, forwardAccel * tilt.x * delta);

      // Roll → seitliche Bewegung: gleiches Vorzeichen wie strafeInput
      velocity.addScaledVector(right, strafeAccel * tilt.z * delta);
    }

    let status = this.getFlightStatus();

    // Vertical (Lift)
    const hasFixedAltitude = this.options.fixedAltitude != null;
    let targetAltitude: number | null = null;
    if (hasFixedAltitude) {
      if (controls.ascend) this.state.isAirborne = true;
      if (!this.state.isAirborne) {
        velocity.y -= liftPower * delta * 0.6;
      } else {
        targetAltitude = this.options.fixedAltitude!;
      }
    } else {
      if ((controls.ascend || controls.descend) && active) {
        if (controls.descend) {
          velocity.y -= liftPower * 1.2 * delta;
          status = FLIGHT_STATUS.LANDING;
        } else {
          velocity.y +=
            (liftPower * delta + forward.y * liftPower * 0.6 * delta) *
            currentPower;
        }
        this.state.isAirborne = true;
      } else {
        let g = liftPower * 0.25 * delta;
        if (controls.pitchDown && !controls.pitchUp) {
          g = liftPower * 0.6 * delta;
        }
        if (!active) {
          g = liftPower * 1.2 * delta;
        }
        if (autoAltitude && active) {
          if (velocity.y > 0) velocity.y = Math.max(0, velocity.y - g);
          else velocity.y = Math.min(0, velocity.y + g);
        } else {
          velocity.y -= g;
        }
      }
    }

    // Approach target altitude
    const pos = unit.getPosition();
    if (targetAltitude != null) {
      const dy = targetAltitude - pos.y;
      const approach = Math.max(-liftPower, Math.min(liftPower, dy)) * 0.5;
      velocity.y += approach * delta;
      if (
        !controls.ascend &&
        !controls.descend &&
        Math.abs(dy) < 0.5 &&
        Math.abs(velocity.y) < 0.25
      ) {
        this.state.isAirborne = false;
        velocity.y = 0;
      }
    }

    // Friction & clamps
    velocity.multiplyScalar(friction);
    const horizontal = new Vector3(velocity.x, 0, velocity.z);
    const hSpeed = horizontal.length();
    if (hSpeed > maxSpeed) {
      horizontal.setLength(maxSpeed);
      velocity.x = horizontal.x;
      velocity.z = horizontal.z;
    }
    if (this.state.isAirborne) {
      if (currentPower > 0) {
        status = FLIGHT_STATUS.FLYING;
      } else {
        status = FLIGHT_STATUS.TAKING_OFF;
      }
    }
    // console.log(targetAltitude);
    if (
      this.state.isAirborne &&
      targetAltitude != null &&
      !controls.ascend &&
      !controls.descend &&
      Math.abs(targetAltitude - pos.y) < 0.5 &&
      Math.abs(velocity.y) < 0.25
    ) {
      status = FLIGHT_STATUS.LANDING;
    }

    // Clamp altitude
    const maxAlt = this.options.maxAltitude;
    if (pos.y >= maxAlt && velocity.y > 0) velocity.y = 0;
    if (pos.y <= 0 && velocity.y < 0) {
      velocity.y = 0;
      pos.y = 0;
      this.state.isAirborne = false;
    }

    if (!active || !controls.ascend) {
      const position = unit.getPosition();
      let minY =
        unit
          .getMap()
          ?.modules.ground.getSurfaceHeightAt(position.x, position.z, [unit]) ??
        0;

      if (this.state.gearsOpened) {
        minY += this.options.gearsHeight;
      }

      if (position.y <= (minY ?? 0)) {
        this.state.isAirborne = false;
        velocity.y = 0;
        position.y = minY ?? 0;

        if (!this.lastPosition?.equals(position)) {
          unit.setPosition(position);
          this.lastPosition.copy(pos);
        }
        status = FLIGHT_STATUS.LANDED;
      }
    }

    // // Nach der Landung
    // if (!this.state.isAirborne && this.state.status !== FLIGHT_STATUS.LANDED) {
    //   this.state.status = FLIGHT_STATUS.LANDED;
    // }

    // console.log(status);
    // Integrate position
    const dx = velocity.x * delta;
    const dy = velocity.y * delta;
    const dz = velocity.z * delta;
    if (Math.abs(dx) > eps || Math.abs(dy) > eps || Math.abs(dz) > eps) {
      pos.x += dx;
      pos.y += dy;
      pos.z += dz;
      unit.setPosition(pos);
      if (!this.state.isAirborne) {
        unit.updateGroundAlignment();
      }
    }

    this.setFlightStatus(status);

    // Apply visual tilt
    unit.setPitch(tilt.x);
    unit.setRoll(-tilt.z);
  }

  getTilt() {
    return this.state.tilt;
  }

  getTmpRight() {
    return this._right;
  }

  getFlightStatus() {
    return this.state.flightStatus;
  }

  setFlightStatus(flightStatus: FLIGHT_STATUS) {
    if (this.state.flightStatus === flightStatus) return;
    this.state.flightStatus = flightStatus;
    this.observables.flightStatus$.next(flightStatus);
  }
}
