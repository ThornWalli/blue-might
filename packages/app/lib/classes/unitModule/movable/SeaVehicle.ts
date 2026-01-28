/* eslint-disable complexity */
import { Vector3 } from 'three';
import {
  ignoreByUnitByType,
  isUnitDestroyed
} from '@blue-might/app/lib/utils/unit';

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
    seaVehicle: Partial<SeaVehicleUnitModuleState>;
  }
  interface ModuleOptions {
    seaVehicle: Partial<SeaVehicleUnitModuleOptions>;
  }
  interface ModuleDebug {
    seaVehicle: boolean;
  }
}
export type SeaVehicleUnitModuleObservables = MovableUnitModuleObservables;

export interface SeaVehicleUnitModuleOptions extends MovableUnitModuleOptions {
  maxSpeed: number;
  acceleration: number;
  turnSpeed: number;
  turnMovementSpeed: number;
  friction: number;
  allowRotationInPlace?: boolean;
}

export interface SeaVehicleUnitModuleState extends MovableUnitModuleState {
  tilt: Vector3;
  groundNormal: Vector3;
}

export default class SeaVehicleUnitModule<
  Options extends SeaVehicleUnitModuleOptions = SeaVehicleUnitModuleOptions,
  State extends SeaVehicleUnitModuleState = SeaVehicleUnitModuleState,
  Obervables extends SeaVehicleUnitModuleObservables =
    SeaVehicleUnitModuleObservables,
  U extends MovableUnit = MovableUnit
> extends MovableUnitModule<Options, State, Obervables, U> {
  static override TYPE = 'seaVehicle';
  private _rotDir = new Vector3();

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        maxSpeed: options.maxSpeed ?? 1,
        acceleration: options.acceleration ?? 1 / 3,
        turnSpeed: options.turnSpeed ?? 1,
        turnMovementSpeed: options.turnMovementSpeed ?? 1 / 3,
        friction: options.friction ?? 0.7,
        allowRotationInPlace: options.allowRotationInPlace ?? false
      },
      {
        ...state,
        tilt: state.tilt ?? new Vector3(0, 0, 0),
        groundNormal: state.groundNormal ?? new Vector3(0, 1, 0)
      },
      debug
    );
  }

  override update(v: AnimationLoopValue): void {
    super.update(v);
    this.moveUpdate({ delta: v.delta });
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
      [ControlAction.LANDING_GEAR]:
        ai[ControlAction.LANDING_GEAR] ?? human[ControlAction.LANDING_GEAR],
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

    const sinkSpeed =
      unit
        .getMap()
        ?.modules.surface.getHeightAt(
          unit.getPosition().x,
          unit.getPosition().z
        ) ?? 1.0;

    if (unit.modules.damage.isDestroyed() && unit.getPosition().y > sinkSpeed) {
      const pos = unit.getPosition().clone();
      pos.y += sinkSpeed * delta;

      unit.setPosition(pos);

      this.state.velocity.x = 0;
      this.state.velocity.z = 0;

      return; // Keine weitere Bewegung
    } else if (isUnitDestroyed(unit)) {
      this.getUnit().modules.damage.options.enabled = false;
      this.destroy();
      return;
    }

    //#endregion

    const acceleration = this.options.acceleration;
    const maxSpeed = this.options.maxSpeed;
    let friction = this.options.friction;

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

    if (!active) {
      targetAccel = 0;
      friction = 0.5; // Stärkere Dämpfung (anpassen für gewünschte Stopp-Zeit)
    }

    let smoothedAccel: number;
    if (aiActive) {
      // Glättung für KI (smoothere Bewegungen)
      const accelSmoothing = 10;
      const currentAccel =
        this.state.velocity.dot(
          unit.getForwardXZFromYaw(this.getTmpDirection())
        ) / delta;
      smoothedAccel =
        currentAccel +
        (targetAccel - currentAccel) * (1 - Math.exp(-accelSmoothing * delta));
    } else {
      // Direkt für manuelle Steuerung (sofortiges Stoppen)
      smoothedAccel = targetAccel;
    }

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

    // 3) Lenken: Yaw setzen (nur beim Fahren, nicht auf der Stelle)
    const turnSpeed = aiActive ? 1 : this.options.turnSpeed;
    const turnMovementSpeed = this.options.turnMovementSpeed;
    const currentSpeed = velocity.length();

    const canRotateInPlace = aiActive && this.options.allowRotationInPlace;
    if (currentSpeed > 0.01 || canRotateInPlace) {
      let turnAmount = 0;
      if (controls[ControlAction.MOVE_LEFT]) turnAmount += 1;
      if (controls[ControlAction.MOVE_RIGHT]) turnAmount -= 1;

      if (turnAmount !== 0) {
        // NEU: Bei Rotation auf der Stelle langsamer drehen (realistischer)
        const rotationSpeedMultiplier =
          canRotateInPlace && currentSpeed < 0.01 ? 0.5 : 1.0;
        const effectiveTurnSpeed =
          turnSpeed *
          rotationSpeedMultiplier *
          (1 + currentSpeed * turnMovementSpeed);
        const yawChange = turnAmount * effectiveTurnSpeed * delta;
        unit.setYaw(unit.getYaw() + yawChange);
      }
    }

    // 4) Position integrieren (bleibt gleich, aber nun stabiler)
    const pos = unit.getPosition().clone();
    const dx = velocity.x * delta;
    const dz = velocity.z * delta;
    const map = unit.getMap()!;
    if (Math.abs(dx) > eps || Math.abs(dz) > eps) {
      const newPos = pos.clone().add(new Vector3(dx, 0, dz));

      const seaLevel = map.modules.surface.getSeaLevel() ?? 0;

      const test = map.modules.surface.getSurfaceHeightAt(
        newPos.x,
        newPos.z,
        u => !u.equals(unit) && ignoreByUnitByType({ seaVehicle: true })(u)
      );

      const terrainHeight = Math.max(seaLevel, test ?? seaLevel);
      if (terrainHeight > newPos.y) {
        // Boot ist auf oder über Terrain – blockiere Bewegung (simuliert Auflaufen)
        // Änderung: Statt komplett zu stoppen, reduziere Geschwindigkeit stark, um Rückwärtsfahren zu erlauben
        velocity.multiplyScalar(0.1); // Sehr langsam, aber erlaubt Bewegung
        // Optional: Schaden hinzufügen
        unit.modules.damage.takeDamage((2 / 10) * delta); // Beispiel: 10 Schaden pro Sekunde
      } else {
        // Bewegung erlauben
        pos.x += dx;
        pos.z += dz;
        unit.setPosition(pos);
      }

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
