/* eslint-disable complexity */

import { Vector3 } from 'three';
import {
  distinctUntilChanged,
  EMPTY,
  filter,
  fromEvent,
  map,
  switchMap
} from 'rxjs';
import { isUnitDestroyed } from '@blue-might/app/lib/utils/unit';

import type { AnimationLoopValue } from '../../../Renderer';
import type HelicopterUnit from '../../../unit/vehicle/Helicopter';
import {
  ControlAction,
  getDefaultControls
} from '../../../playerModule/Controls';
import type {
  AirVehicleUnitModuleObservables,
  AirVehicleUnitModuleOptions,
  AirVehicleUnitModuleState
} from '../AirVehicle';
import AirUnitModule from '../AirVehicle';
import { COLLISION_TYPE } from '../../Collision';
import type Unit from '../../../Unit';
import type { UnitModules } from '../../../Unit';
import type LandingPortUnitModule from '../../LandingPort';

declare module '../../../Unit' {
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

export enum FLIGHT_STATUS {
  NONE = 'none',
  LANDED = 'landed',
  TAKING_OFF = 'taking_off',
  FLYING = 'flying',
  LANDING = 'landing'
}

type HelicopterUnitObservables = AirVehicleUnitModuleObservables;

export interface HelicopterUnitModuleOptions extends AirVehicleUnitModuleOptions {
  maxSpeed: number;
  acceleration: number;
  yawSpeed: number; // how fast yaw rotates
  pitchPower: number; // forward/back tilt strength
  rollPower: number; // side tilt strength
  friction: number;
  liftPower: number; // vertical acceleration
  autoLevelRate?: number; // how fast tilt recenters
  //#region altitude
  fixedAltitude?: number; // if set, use takeoff/land to snap here
  autoAltitude?: boolean; // if true, automatically maintain a certain altitude
  //#endregion
}

export interface HelicopterUnitModuleState extends AirVehicleUnitModuleState {
  groundNormal: Vector3;
  //#region altitude
  targetAltitude?: number;
  //#endregion
}

export default class HelicopterUnitModule<
  Options extends HelicopterUnitModuleOptions = HelicopterUnitModuleOptions,
  State extends HelicopterUnitModuleState = HelicopterUnitModuleState,
  Obervables extends HelicopterUnitObservables = HelicopterUnitObservables,
  U extends HelicopterUnit = HelicopterUnit
> extends AirUnitModule<Options, State, Obervables, U> {
  static override TYPE = 'helicopter';
  private _right = new Vector3();

  override getControls() {
    const human = super.getControls();
    const ai = this.getAIControls();
    if (!ai) return human;

    return {
      ...getDefaultControls(),

      [ControlAction.ASCEND]: ai.ascend ?? human.ascend,
      [ControlAction.DESCEND]: ai.descend ?? human.descend,

      [ControlAction.LANDING_GEAR]: ai.landing_gear ?? human.landing_gear,
      [ControlAction.LANDING]: ai.landing ?? human.landing,
      [ControlAction.ROTATE_LEFT]: ai.rotateLeft ?? human.rotateLeft,
      [ControlAction.ROTATE_RIGHT]: ai.rotateRight ?? human.rotateRight,

      [ControlAction.PITCH_UP]: ai.pitchUp ?? human.pitchUp,
      [ControlAction.PITCH_DOWN]: ai.pitchDown ?? human.pitchDown,
      [ControlAction.ROLL_LEFT]: ai.rollLeft ?? human.rollLeft,
      [ControlAction.ROLL_RIGHT]: ai.rollRight ?? human.rollRight
    };
  }

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        maxSpeed: options.maxSpeed ?? 1,
        acceleration: options.acceleration ?? 1,
        yawSpeed: options.yawSpeed ?? 4,
        pitchPower: options.pitchPower ?? 1,
        rollPower: options.rollPower ?? 0.5,
        friction: options.friction ?? 0.96,
        liftPower: options.liftPower ?? 2,
        autoAltitude: options.autoAltitude ?? true,
        autoLevelRate: options.autoLevelRate ?? 2,
        maxPower: options.maxPower ?? 4,
        minPower: options.minPower ?? 2,
        idlePower: options.idlePower ?? 0.2
      } as Options,
      {
        ...state,
        groundNormal: state.groundNormal ?? new Vector3(0, 1, 0)
      } as State,
      debug
    );
  }

  override async afterSetup() {
    await super.afterSetup();

    const unit = this.getUnit();

    if (unit.preview) return;

    this.subscription.add(
      unit.modules.player.observables.player$
        .pipe(
          switchMap(
            player => player?.modules.controls.observables.controls$ ?? EMPTY
          )
        )
        .subscribe(controls => {
          if (controls.landing_gear && this.canToggleGears()) {
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

    this.subscription.add(
      unit.modules.collision.observables.collision$.subscribe(({ type }) => {
        if (type === COLLISION_TYPE.BLOCKED) {
          this.state.velocity.multiplyScalar(-0.5);
          unit.modules.damage.takeMaxDamage(); // Aktiviere Schadensaufnahme
        }
      })
    );

    // auto gears by height
    this.subscription.add(
      unit.observables.position$
        .pipe(
          map(() => this.canToggleGears()),
          distinctUntilChanged()
        )
        .subscribe(() => this.toggleGears())
    );
  }

  override getMaxPower(): number {
    if (this.state.active) {
      if (
        this.state.flightStatus === FLIGHT_STATUS.FLYING ||
        this.state.flightStatus === FLIGHT_STATUS.TAKING_OFF ||
        this.state.flightStatus === FLIGHT_STATUS.LANDING
      ) {
        return this.options.maxPower;
      }
      return this.options.idlePower;
    }
    return 0;
  }

  override getMaxPitch() {
    // Wenn die Gears gerade animiert werden ODER ausgefahren sind, begrenze die Neigung stark.
    return this.state.gearsActive || this.state.gearsOpened ? 0.2 : 0.6;
  }

  override getMaxRoll() {
    // Wenn die Gears gerade animiert werden ODER ausgefahren sind, begrenze die Neigung stark.
    return this.state.gearsActive || this.state.gearsOpened ? 0.2 : 0.6;
  }
  override update(v: AnimationLoopValue): void {
    super.update(v);
    this.moveUpdate({ delta: v.delta });
  }

  helpers = {
    horizontalVelocity: new Vector3()
  };

  /**
   * Wenn abgelaufen, gibt es kein moveUpdate mehr.
   */
  destroyedTimeout: number = 0;

  moveUpdate({ delta }: { delta: number }) {
    const active = this.state.active;
    const unit = this.getUnit();

    //#region destroyed

    /**
     * Wenn Zerstört und Timeout überschritten, gibt es kein moveUpdate mehr.
     */
    if (this.destroyedTimeout && Date.now() > this.destroyedTimeout) {
      return;
    } else if (!this.destroyedTimeout && isUnitDestroyed(unit)) {
      this.destroyedTimeout = Date.now() + 5000;
    }

    //#endregion

    const controls = this.getControls();

    const friction = this.options.friction;
    const maxSpeed = this.options.maxSpeed;
    const yawAccel = this.options.yawSpeed;
    const pitchPower = this.options.pitchPower;
    const rollPower = this.options.rollPower;
    const liftPower = this.options.liftPower;
    const autoAltitude = this.options.autoAltitude;
    const autoLevelRate = this.options.autoLevelRate ?? 2;
    const currentPower = this.getCurrentPower();
    const flightStatus = this.getFlightStatus();

    const isLanded = flightStatus === FLIGHT_STATUS.LANDED;
    const isTakingOff = flightStatus === FLIGHT_STATUS.TAKING_OFF;

    const canRollPitch = !isLanded && !isTakingOff;
    const canYaw = !isLanded;

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
      const yawInput = canYaw
        ? (typeof controls.rotateLeft === 'number'
            ? controls.rotateLeft
            : controls.rotateLeft
              ? 1
              : 0) -
          (typeof controls.rotateRight === 'number'
            ? controls.rotateRight
            : controls.rotateRight
              ? 1
              : 0)
        : 0; // Setze yawInput auf 0, wenn nicht drehen erlaubt

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

      velocity.multiplyScalar(friction);
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
      if (
        controls.ascend !== controls.descend &&
        (controls.ascend || controls.descend) &&
        active
      ) {
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
    const unitPosition = unit.getPosition();

    // Approach target altitude
    if (targetAltitude != null) {
      const dy = targetAltitude - unitPosition.y;
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
    // velocity.multiplyScalar(friction);
    const horizontalVelocity = this.helpers.horizontalVelocity;
    horizontalVelocity.set(velocity.x, 0, velocity.z);
    const hSpeed = horizontalVelocity.length();
    if (hSpeed > maxSpeed) {
      horizontalVelocity.setLength(maxSpeed);
      velocity.x = horizontalVelocity.x;
      velocity.z = horizontalVelocity.z;
    }
    if (this.state.isAirborne) {
      if (currentPower > 0) {
        status = FLIGHT_STATUS.FLYING;
      } else {
        status = FLIGHT_STATUS.TAKING_OFF;
      }
    }

    if (
      this.state.isAirborne &&
      targetAltitude != null &&
      !controls.ascend &&
      !controls.descend &&
      Math.abs(targetAltitude - unitPosition.y) < 0.5 &&
      Math.abs(velocity.y) < 0.25
    ) {
      status = FLIGHT_STATUS.LANDING;
    }

    // Clamp altitude
    const maxAlt = this.options.maxAltitude;
    if (unitPosition.y >= maxAlt && velocity.y > 0) velocity.y = 0;

    // NEU: Sinken-Logik für zerstörte Helikopter auf Wasser
    const isDestroyed = isUnitDestroyed(unit);
    if (isDestroyed) {
      const groundHeight =
        unit
          .getMap()
          ?.modules.surface.getSurfaceHeightAt(
            unitPosition.x,
            unitPosition.z,
            u => !u.equals(unit),
            { raycaster: true }
          ) ?? 0;

      if (unitPosition.y <= groundHeight) {
        // Auf Wasser – sinken lassen
        const sinkSpeed = 1.0; // Anpassen: Sinkgeschwindigkeit (Einheiten pro Sekunde)
        velocity.y -= sinkSpeed * delta;
        // Stoppe horizontale Bewegung
        velocity.x = 0;
        velocity.z = 0;
        // Keine weitere Bewegung, wenn unter Wasser
        if (unitPosition.y <= groundHeight) {
          // Optional: Tiefer als 1 Einheit unter Wasser stoppen
          velocity.set(0, 0, 0);
          this.getUnit().modules.damage.options.enabled = false;
        }
      }
    }

    if (!active || !controls.ascend) {
      const isDestroyed = isUnitDestroyed(unit);

      const groundModule = unit.getMap()!.modules.surface;
      let minY =
        groundModule.getSurfaceHeightAt(
          unitPosition.x,
          unitPosition.z,
          u => !u.equals(unit),
          { raycaster: true }
        ) ?? 0;

      if (!isDestroyed && this.state.gearsOpened) {
        minY += this.options.gearsHeight;
      }

      if (
        (this.state.isAirborne &&
          unitPosition.y <= Math.max(groundModule?.getSeaLevel(), minY)) ||
        ((status === FLIGHT_STATUS.TAKING_OFF ||
          status === FLIGHT_STATUS.LANDED) &&
          unitPosition.y < minY)
      ) {
        if (!isDestroyed) {
          const impactStrength = Math.abs(velocity.y);
          const damageThreshold = 0.8;
          if (impactStrength > damageThreshold || !this.state.gearsOpened) {
            unit.modules.damage.takeMaxDamage();
          }
        }
        const position = unit.getPosition().clone();

        this.state.isAirborne = false;
        velocity.set(0, 0, 0);
        position.setY(minY);

        // Bodenausrichtung vor dem Setzen der Position durchführen, um Positionsänderungen zu minimieren
        let targetUnit: Unit | undefined = undefined;
        if (this.getLastFlightStatus() !== FLIGHT_STATUS.LANDED) {
          const alignmentResult = unit.updateGroundAlignment(undefined, [unit]);
          targetUnit = alignmentResult.unit;
          unit.calculateGroundNormal();

          // Nach Ausrichtung minY neu berechnen, falls Position geändert wurde
          minY =
            groundModule.getSurfaceHeightAt(
              position.x,
              position.z,
              u => !u.equals(unit),
              { raycaster: true }
            ) ?? 0;
          if (!isDestroyed && this.state.gearsOpened) {
            minY += this.options.gearsHeight;
          }
          position.setY(minY);
        }

        if (position.clone().sub(unit.getPosition()).length() < 0.001) return;
        unit.setPosition(position, {
          raycaster: true
        });
        console.log('Helicopter landed at y=', position.toArray());

        if (targetUnit) {
          const landingPort = (
            targetUnit as Unit<
              { landingPort: LandingPortUnitModule } & UnitModules
            >
          ).modules.landingPort;
          if (landingPort) {
            landingPort.setLandedUnit(unit);
          }
        }

        this.setFlightStatus(FLIGHT_STATUS.LANDED);
        return;
      }
    }

    // Reset ground normal when taking off
    if (
      this.getLastFlightStatus() === FLIGHT_STATUS.TAKING_OFF &&
      status === FLIGHT_STATUS.FLYING
    ) {
      unit.resetGroundNormal();
    }

    if (
      unit.modules.airVehicle.getLandingPort() &&
      status !== FLIGHT_STATUS.LANDED
    ) {
      unit.modules.airVehicle.setLandingPort(null);
    }

    // Integrate position
    const dx = velocity.x * delta;
    const dy = velocity.y * delta;
    const dz = velocity.z * delta;
    if (Math.abs(dx) > eps || Math.abs(dy) > eps || Math.abs(dz) > eps) {
      unitPosition.x += dx;
      unitPosition.y += dy;
      unitPosition.z += dz;

      unit.setPosition(unitPosition, { raycaster: true });
    }

    this.setFlightStatus(status);

    // Apply visual tilt
    unit.setPitch(tilt.x);
    unit.setRoll(-tilt.z);
  }

  lastUpdateTime = 0;

  getTmpRight() {
    return this._right;
  }
}
