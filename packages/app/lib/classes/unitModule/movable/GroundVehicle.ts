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

export type GroundVehicleUnitModuleObservables = MovableUnitModuleObservables;

export interface GroundVehicleUnitModuleOptions
  extends MovableUnitModuleOptions {
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
  Options extends
    GroundVehicleUnitModuleOptions = GroundVehicleUnitModuleOptions,
  State extends GroundVehicleUnitModuleState = GroundVehicleUnitModuleState,
  Obervables extends
    GroundVehicleUnitModuleObservables = GroundVehicleUnitModuleObservables,
  U extends MovableUnit = MovableUnit
> extends MovableUnitModule<Options, State, Obervables, U> {
  private _rotDir = new Vector3();

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        maxSpeed: options.maxSpeed ?? 20,
        acceleration: options.acceleration ?? 8,
        // leicht höherer Default für Fahr-Lenkung
        turnSpeed: options.turnSpeed ?? 2.5,
        turnMovementSpeed: options.turnMovementSpeed ?? 3.25,
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

  override getControls() {
    const human = super.getControls();
    const ai = this.getAIControls();
    if (!ai) return human;

    return {
      up: ai.up ?? human.up,
      down: ai.down ?? human.down,
      left: ai.left ?? human.left,
      right: ai.right ?? human.right,
      space: ai.space ?? human.space,
      gear: ai.gear ?? human.gear,
      landing: ai.landing ?? human.landing,
      modifier: ai.modifier ?? human.modifier,
      rotateLeft: ai.rotateLeft ?? human.rotateLeft,
      rotateRight: ai.rotateRight ?? human.rotateRight
    };
  }

  moveUpdate({ delta }: { delta: number }) {
    const unit = this.getUnit();
    const acceleration = this.options.acceleration;
    const maxSpeed = this.options.maxSpeed;
    const friction = this.options.friction;

    const controls = this.getControls();
    const aiActive = !!this.getAIControls();

    const eps = 1e-4;
    if (
      !aiActive && // Early-Return nur ohne Autopilot
      !controls.up &&
      !controls.down &&
      !controls.left &&
      !controls.right &&
      !controls.space &&
      this.state.velocity.lengthSq() < eps
    ) {
      return;
    }

    // 1) Input -> Beschleunigung
    let accel = 0;
    if (controls.up) accel += acceleration;
    if (controls.down) accel -= acceleration * 0.5;

    // Autopilot: minimaler Vortrieb, damit das Fahrzeug losfährt (auch beim Drehen)
    if (aiActive && accel === 0 && (controls.left || controls.right)) {
      accel = acceleration * 0.4;
    }

    if (!aiActive && accel === 0 && this.state.velocity.lengthSq() < eps) {
      this.state.velocity.setScalar(0);
      return;
    }

    // 2) Richtung nur aus Yaw
    const forwardYaw = unit.getForwardXZFromYaw(this.getTmpDirection());
    this.setTmpRotationDirection(forwardYaw);

    //#region forward/backward
    const velocity = this.state.velocity;
    velocity.addScaledVector(forwardYaw, accel * delta);

    if (controls.space) {
      velocity.multiplyScalar(0.8);
    }
    velocity.multiplyScalar(friction);

    // Queranteil dämpfen
    const dot = velocity.dot(forwardYaw);
    const lateralX = velocity.x - forwardYaw.x * dot;
    const lateralZ = velocity.z - forwardYaw.z * dot;
    const lateralMagSq = lateralX * lateralX + lateralZ * lateralZ;
    if (lateralMagSq > 0) {
      const grip = 0.85;
      velocity.x = forwardYaw.x * dot + lateralX * (1 - grip);
      velocity.z = forwardYaw.z * dot + lateralZ * (1 - grip);
    }

    // Speed-Clamps
    let speed = velocity.length();
    if (speed > maxSpeed) {
      velocity.setLength(maxSpeed);
      speed = maxSpeed;
    } else if (speed < eps) {
      velocity.setScalar(0);
      speed = 0;
    }
    //#endregion

    // 3) Lenken: Yaw setzen
    const turnSpeed = this.options.turnMovementSpeed;
    if (speed > 0.02) {
      // leichter anfahren erlauben
      let turnInput = 0;
      if (controls.left) turnInput += 1;
      if (controls.right) turnInput -= 1;
      if (controls.down) turnInput *= -1;

      if (turnInput !== 0) {
        const norm = Math.min(speed / this.options.maxSpeed, 1);
        const turnFactor = Math.pow(norm, 0.6);
        const lowSpeedBoost = norm < 0.2 ? 1.15 : 1.0;

        const steeringSmoothing = 100;
        const targetTurn = turnInput * turnSpeed * lowSpeedBoost;
        const smoothTurn =
          targetTurn * (1 - Math.exp(-steeringSmoothing * delta));

        const newYaw = unit.getYaw() + smoothTurn * delta * turnFactor;
        unit.setYaw(newYaw);

        // leichtes Dämpfen beim Lenken
        const maxDamp = 0.05;
        const dampStrength = maxDamp * norm;
        const turningDamp = 1 - Math.min(dampStrength, maxDamp);
        velocity.multiplyScalar(turningDamp);
      }
    }

    // 4) Position integrieren
    const pos = unit.getPosition().clone();
    const dx = velocity.x * delta;
    const dz = velocity.z * delta;
    if (Math.abs(dx) > eps || Math.abs(dz) > eps) {
      pos.x += dx;
      pos.z += dz;
      unit.setPosition(pos);
      unit.updateGroundAlignment();
    }
  }
}
