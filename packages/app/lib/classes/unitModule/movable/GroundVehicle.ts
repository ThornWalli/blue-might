/* eslint-disable complexity */
import { Vector3 } from 'three';

import type { AnimationLoopValue } from '../../Renderer';
import type {
  MovableUnitModuleObservables,
  MovableUnitModuleOptions,
  MovableUnitModuleState
} from '../Movable';
import MovableUnitModule from '../Movable';
import type MovableUnit from '../../unit/Movable';
import {
  ControlAction,
  getDefaultControls,
  type ControlState
} from '../../playerModule/Controls';

declare module '../../Unit' {
  interface ModuleStates {
    groundVehicle: Partial<GroundVehicleUnitModuleState>;
  }
  interface ModuleOptions {
    groundVehicle: Partial<GroundVehicleUnitModuleOptions>;
  }
  interface ModuleDebug {
    groundVehicle: boolean;
  }
}
export type GroundVehicleUnitModuleObservables = MovableUnitModuleObservables;

export interface GroundVehicleUnitModuleOptions extends MovableUnitModuleOptions {
  maxSpeed: number;
  acceleration: number;
  turnSpeed: number;
  turnMovementSpeed: number;
  friction: number;
}

export interface GroundVehicleUnitModuleState extends MovableUnitModuleState {
  tilt: Vector3;
  groundNormal: Vector3;
}

export default class GroundVehicleUnitModule<
  Options extends GroundVehicleUnitModuleOptions =
    GroundVehicleUnitModuleOptions,
  State extends GroundVehicleUnitModuleState = GroundVehicleUnitModuleState,
  Obervables extends GroundVehicleUnitModuleObservables =
    GroundVehicleUnitModuleObservables,
  U extends MovableUnit = MovableUnit
> extends MovableUnitModule<Options, State, Obervables, U> {
  private _rotDir = new Vector3();

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        maxSpeed: options.maxSpeed ?? 1,
        acceleration: options.acceleration ?? 1 / 3,
        turnSpeed: options.turnSpeed ?? 1 / 2,
        turnMovementSpeed: options.turnMovementSpeed ?? 1 / 3,
        friction: options.friction ?? 0.92
      },
      {
        ...state,
        tilt: state.tilt ?? new Vector3(0, 0, 0),
        groundNormal: state.groundNormal ?? new Vector3(0, 1, 0)
      },
      debug
    );
  }

  override update({ delta, time }: AnimationLoopValue): void {
    super.update({ delta, time });
    this.moveUpdate({ delta });
  }

  getTmpRotationDirection() {
    return this._rotDir;
  }
  setTmpRotationDirection(value: Vector3) {
    this._rotDir.copy(value);
  }

  override getControls(): ControlState {
    const human = super.getControls();
    const ai = this.getAIControls();
    if (!ai) return human;

    return {
      ...getDefaultControls(),
      [ControlAction.MOVE_FORWARD]:
        ai[ControlAction.MOVE_FORWARD] ?? human[ControlAction.MOVE_FORWARD],
      [ControlAction.MOVE_BACKWARD]:
        ai[ControlAction.MOVE_BACKWARD] ?? human[ControlAction.MOVE_BACKWARD],
      [ControlAction.MOVE_LEFT]:
        ai[ControlAction.MOVE_LEFT] ?? human[ControlAction.MOVE_LEFT],
      [ControlAction.MOVE_RIGHT]:
        ai[ControlAction.MOVE_RIGHT] ?? human[ControlAction.MOVE_RIGHT],
      [ControlAction.SPACE]:
        ai[ControlAction.SPACE] ?? human[ControlAction.SPACE],
      [ControlAction.GEAR]: ai[ControlAction.GEAR] ?? human[ControlAction.GEAR],
      [ControlAction.LANDING]:
        ai[ControlAction.LANDING] ?? human[ControlAction.LANDING],
      [ControlAction.MODIFIER]:
        ai[ControlAction.MODIFIER] ?? human[ControlAction.MODIFIER],
      [ControlAction.ROTATE_LEFT]:
        ai[ControlAction.ROTATE_LEFT] ?? human[ControlAction.ROTATE_LEFT],
      [ControlAction.ROTATE_RIGHT]:
        ai[ControlAction.ROTATE_RIGHT] ?? human[ControlAction.ROTATE_RIGHT]
    };
  }
  moveUpdate({ delta }: { delta: number }) {
    const unit = this.getUnit();
    const acceleration = this.options.acceleration;
    const maxSpeed = this.options.maxSpeed;
    const friction = this.options.friction;

    const controls = this.getControls();
    const aiActive = !!this.getAIControls();

    delta = Math.max(1 / 60, Math.min(delta, 1 / 30));

    const eps = 1e-4;
    if (
      !aiActive && // Early-Return nur ohne Autopilot
      !controls[ControlAction.MOVE_FORWARD] &&
      !controls[ControlAction.MOVE_BACKWARD] &&
      !controls[ControlAction.MOVE_LEFT] &&
      !controls[ControlAction.MOVE_RIGHT] &&
      !controls[ControlAction.SPACE] &&
      this.state.velocity.lengthSq() < eps
    ) {
      return;
    }

    // NEU: Beschleunigung glätten (Target-Wert berechnen und interpolieren)
    let targetAccel = 0;
    if (controls[ControlAction.MOVE_FORWARD]) targetAccel += acceleration;
    if (controls[ControlAction.MOVE_BACKWARD])
      targetAccel -= acceleration * 0.5;

    // Autopilot: minimaler Vortrieb
    if (
      aiActive &&
      targetAccel === 0 &&
      (controls[ControlAction.MOVE_LEFT] || controls[ControlAction.MOVE_RIGHT])
    ) {
      targetAccel = acceleration * 0.4;
    }

    // Glätte die Beschleunigung (von aktueller zu Target, um Sprünge zu vermeiden)
    const accelSmoothing = 10; // Höher = glatter, aber träger
    const currentAccel =
      this.state.velocity.dot(
        unit.getForwardXZFromYaw(this.getTmpDirection())
      ) / delta; // Schätze aktuelle Beschleunigung
    const smoothedAccel =
      currentAccel +
      (targetAccel - currentAccel) * (1 - Math.exp(-accelSmoothing * delta));

    if (
      !aiActive &&
      smoothedAccel === 0 &&
      this.state.velocity.lengthSq() < eps
    ) {
      this.state.velocity.setScalar(0);
      return;
    }

    // 2) Richtung nur aus Yaw
    const forwardYaw = unit.getForwardXZFromYaw(this.getTmpDirection());
    this.setTmpRotationDirection(forwardYaw);

    //#region forward/backward
    const velocity = this.state.velocity;
    // NEU: Verwende smoothedAccel anstatt accel
    velocity.addScaledVector(forwardYaw, smoothedAccel * delta);

    if (controls.space) {
      velocity.multiplyScalar(0.8);
    }

    // NEU: Frame-rate-unabhängige Friction (exponentielle Dämpfung)
    const frictionFactor = Math.pow(friction, delta); // Dämpft pro Sekunde, nicht pro Frame
    velocity.multiplyScalar(frictionFactor);

    // Queranteil dämpfen (bleibt gleich, aber nun stabiler)
    const dot = velocity.dot(forwardYaw);
    const lateralX = velocity.x - forwardYaw.x * dot;
    const lateralZ = velocity.z - forwardYaw.z * dot;
    const lateralMagSq = lateralX * lateralX + lateralZ * lateralZ;
    if (lateralMagSq > 0) {
      const grip = 0.85;
      velocity.x = forwardYaw.x * dot + lateralX * (1 - grip);
      velocity.z = forwardYaw.z * dot + lateralZ * (1 - grip);
    }

    // Speed-Clamps (bleibt gleich)
    let speed = velocity.length();

    if (speed > maxSpeed) {
      velocity.setLength(maxSpeed);
      speed = maxSpeed;
    } else if (speed < eps) {
      velocity.setScalar(0);
      speed = 0;
    }
    //#endregion

    // 3) Lenken: Yaw setzen (bleibt gleich, aber nun stabiler durch delta-clamp)

    // 4) Position integrieren (bleibt gleich, aber nun stabiler)
    const pos = unit.getPosition().clone();
    const dx = velocity.x * delta;
    const dz = velocity.z * delta;
    if (Math.abs(dx) > eps || Math.abs(dz) > eps) {
      pos.x += dx;
      pos.z += dz;
      unit.setPosition(pos);

      // NEU: Bodenausrichtung nur bei niedriger Geschwindigkeit aufrufen
      // Verhindert "Schwimmen" und ständige Justierungen beim Fahren
      const currentSpeed = velocity.length();
      if (currentSpeed < 1.0) {
        // Schwellwert: Nur bei Stillstand oder langsamer Fahrt ausrichten
        unit.updateGroundAlignment();
      }
    }
  }
}
