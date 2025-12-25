import { Vector3 } from 'three';
import GroundVehicleUnitModule, {
  type GroundVehicleUnitModuleOptions,
  type GroundVehicleUnitModuleState
} from './movable/GroundVehicle';
import type { AnimationLoopValue } from '../Renderer';
import type TankUnit from '../unit/vehicle/Tank';

export type TankUnitModuleOptions = GroundVehicleUnitModuleOptions;
export type TankUnitModuleState = GroundVehicleUnitModuleState & {
  rotationVelocity: Vector3;
};

export default class TankUnitModule extends GroundVehicleUnitModule<
  TankUnitModuleOptions,
  TankUnitModuleState
> {
  static override TYPE = 'tank';
  constructor(
    unit: TankUnit,
    options: TankUnitModuleOptions,
    state: TankUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        turnSpeed: options.turnSpeed ?? 4,
        acceleration: options.acceleration ?? 6
      },
      {
        ...state,
        rotationVelocity: state.rotationVelocity ?? new Vector3(0, 0, 0)
      },
      debug
    );
  }

  // eslint-disable-next-line complexity
  override moveUpdate({ delta }: AnimationLoopValue): void {
    const unit = this.getUnit();
    const acceleration = this.options.acceleration;

    const controls = this.getControls();
    const currentPower = this.getCurrentPower();

    const maxSpeed = this.options.maxSpeed;
    const friction = this.options.friction;

    const isRotating = controls.left || controls.right;

    // Früher Bail-out: wenn keine Eingaben und Geschwindigkeiten ~0, nichts tun
    const eps = 1e-4;
    if (
      !controls.up &&
      !controls.down &&
      !controls.left &&
      !controls.right &&
      !controls.space &&
      this.state.velocity.lengthSq() < eps &&
      this.state.rotationVelocity.lengthSq() < eps
    ) {
      return;
    }
    // 1. Beschleunigung durch Input
    let accel = 0;
    let rotationAccel = 0;
    if (controls.up) accel += acceleration;
    if (controls.down) accel -= acceleration * 0.5; // Rückwärts langsamer

    if (isRotating) {
      if (controls.left) rotationAccel += acceleration;
      if (controls.right) rotationAccel -= acceleration;
    } else {
      rotationAccel = accel;
    }

    // Wenn weder Bewegung noch Rotation stattfinden soll, abbrechen
    if (
      accel === 0 &&
      rotationAccel === 0 &&
      this.state.velocity.lengthSq() < eps
    ) {
      // kleine Restgeschwindigkeiten hart auf 0 setzen
      if (this.state.velocity.lengthSq() < eps)
        this.state.velocity.setScalar(0);
      if (this.state.rotationVelocity.lengthSq() < eps)
        this.state.rotationVelocity.setScalar(0);
      return;
    }

    // 2. Richtung aus Rotation (keine neuen Objekte erzeugen)
    const forward = unit.getForwardXZFromYaw(new Vector3());
    this.setTmpDirection(forward.x, 0, forward.z);
    this.setTmpRotationDirection(forward);

    //#region forward/backward
    let speed = 0;
    const velocity = this.state.velocity;
    if (!isRotating) {
      velocity.addScaledVector(this.getTmpDirection(), accel * delta);

      if (controls.space) {
        velocity.multiplyScalar(0.8);
      }
      velocity.multiplyScalar(friction);

      speed = velocity.length();
      if (speed > maxSpeed) {
        velocity.setLength(maxSpeed);
      } else if (speed < eps) {
        velocity.setScalar(0);
        speed = 0;
      }
    } else {
      // Beim Drehen langsamer werden
      velocity.multiplyScalar(0.8);
      if (velocity.lengthSq() < eps) velocity.setScalar(0);
    }
    //#endregion

    //#region left/right rotation
    const rotationVelocity = this.state.rotationVelocity;
    rotationVelocity.addScaledVector(
      this.getTmpRotationDirection(),
      rotationAccel * delta
    );
    rotationVelocity.multiplyScalar(friction);

    let rotationSpeed = rotationVelocity.length();
    if (rotationSpeed > maxSpeed) {
      rotationVelocity.setLength(maxSpeed);
      rotationSpeed = maxSpeed;
    } else if (rotationSpeed < eps) {
      rotationVelocity.setScalar(0);
      rotationSpeed = 0;
    }
    //#endregion

    const turnSpeed = isRotating
      ? this.options.turnSpeed
      : this.options.turnMovementSpeed;

    const _rotationSpeed = isRotating ? rotationSpeed : speed;

    if (_rotationSpeed > 0.5) {
      let turn = 0;
      if (controls.left) turn += turnSpeed * (isRotating ? 1 : 0.5);
      if (controls.right) turn -= turnSpeed * (isRotating ? 1 : 0.5);

      const turnFactor = Math.min(_rotationSpeed / maxSpeed, 1);

      // Statt Quaternion: Yaw direkt ändern, unabhängig von Tilt/Pitch/Roll
      const newYaw = unit.getYaw() + turn * delta * turnFactor;
      unit.setYaw(newYaw);
    }

    // newPosition vermeiden: temp nutzen
    const pos = unit.getPosition().clone();
    const dx = velocity.x * delta * currentPower;
    const dz = velocity.z * delta * currentPower;

    if (Math.abs(dx) > eps || Math.abs(dz) > eps) {
      pos.x += dx;
      pos.z += dz;
      unit.setPosition(pos);
    }
  }
}
