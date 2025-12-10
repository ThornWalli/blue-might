/* eslint-disable complexity */
import { Vector3 } from 'three';
import type { AnimationLoopValue } from '../Renderer';
import type {
  VehicleUnitModuleObservables,
  VehicleUnitModuleOptions,
  VehicleUnitModuleState
} from './Vehicle';
import VehicleUnitModule from './Vehicle';
import type VehicleUnit from '../unit/Vehicle';

export interface GroundVehicleUnitModuleOptions
  extends VehicleUnitModuleOptions {
  maxSpeed: number;
  acceleration: number;
  turnSpeed: number;
  turnMovementSpeed: number;
  friction: number;
}

export interface GroundVehicleUnitModuleState extends VehicleUnitModuleState {
  velocity: Vector3;
  tilt: Vector3;
  groundNormal: Vector3;
}

export default class GroundVehicleUnitModule<
  Options extends
    GroundVehicleUnitModuleOptions = GroundVehicleUnitModuleOptions,
  State extends GroundVehicleUnitModuleState = GroundVehicleUnitModuleState,
  Obervables extends
    VehicleUnitModuleObservables = VehicleUnitModuleObservables,
  U extends VehicleUnit = VehicleUnit
> extends VehicleUnitModule<Options, State, Obervables, U> {
  static override TYPE = 'groundVehicle';
  private _dir = new Vector3();

  getTmpDirection() {
    return this._dir;
  }
  setTmpDirection(x: number, y: number, z: number) {
    this._dir.set(x, y, z);
  }
  private _rotDir = new Vector3();
  getTmpRotationDirection() {
    return this._rotDir;
  }
  setTmpRotationDirection(value: Vector3) {
    this._rotDir.copy(value);
  }

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
        velocity: state.velocity ?? new Vector3(0, 0, 0),
        tilt: state.tilt ?? new Vector3(0, 0, 0),
        groundNormal: state.groundNormal ?? new Vector3(0, 1, 0)
      },
      debug
    );
  }

  override update({ delta }: AnimationLoopValue): void {
    const unit = this.getUnit();
    const acceleration = this.options.acceleration;
    const maxSpeed = this.options.maxSpeed;
    const friction = this.options.friction;

    const controls = this.getControls();

    const eps = 1e-4;
    if (
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

    if (accel === 0 && this.state.velocity.lengthSq() < eps) {
      if (this.state.velocity.lengthSq() < eps)
        this.state.velocity.setScalar(0);
      return;
    }

    // 2) Richtung aus NUR Yaw (Heading), damit Tilt/Pitch/Roll keinen Einfluss haben
    const forwardYaw = unit.getForwardXZFromYaw(this.getTmpDirection());
    this.setTmpRotationDirection(forwardYaw);

    //#region forward/backward
    const velocity = this.state.velocity;
    velocity.addScaledVector(forwardYaw, accel * delta);

    if (controls.space) {
      velocity.multiplyScalar(0.8);
    }
    velocity.multiplyScalar(friction);

    // Traktion: Queranteil zur Fahrtrichtung dämpfen
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

    // 3) Lenken: Yaw direkt setzen, entkoppelt von Tilt
    const turnSpeed = this.options.turnMovementSpeed;
    if (speed > 0.05) {
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

    // 4) Position integrieren und am Boden ausrichten
    const pos = unit.getPosition();
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
