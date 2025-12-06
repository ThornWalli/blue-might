import { Vector3 } from 'three';
import VehicleUnitModule, {
  type VehicleUnitModuleOptions,
  type VehicleUnitModuleState
} from './Vehicle';
import type { AnimationLoopValue } from '../Renderer';
import type Unit from '../Unit';

type Options = VehicleUnitModuleOptions;
type State = VehicleUnitModuleState & {
  rotationVelocity: Vector3;
};

export default class TankUnitModule extends VehicleUnitModule<Options, State> {
  constructor(unit: Unit, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        turnSpeed: options.turnSpeed ?? 10,
        turnMovementSpeed: 0
      },
      {
        ...state,
        rotationVelocity: state.rotationVelocity ?? new Vector3(0, 0, 0)
      },
      debug
    );
  }

  // eslint-disable-next-line complexity
  override update({ delta }: AnimationLoopValue): void {
    const unit = this.getUnit();
    const acceleration = this.options.acceleration;
    const rotation = unit.getRotation();
    const controls = this.state.controls;
    const maxSpeed = this.options.maxSpeed;
    const friction = this.options.friction;

    const isRotating = controls.left || controls.right;

    // Früher Bail-out: wenn keine Eingaben und Geschwindigkeiten ~0, nichts tun
    const eps = 1e-4;
    if (
      !controls.forward &&
      !controls.backward &&
      !controls.left &&
      !controls.right &&
      !controls.brake &&
      this.state.velocity.lengthSq() < eps &&
      this.state.rotationVelocity.lengthSq() < eps
    ) {
      return;
    }

    // 1. Beschleunigung durch Input
    let accel = 0;
    let rotationAccel = 0;
    if (controls.forward) accel += acceleration;
    if (controls.backward) accel -= acceleration * 0.5; // Rückwärts langsamer

    if (isRotating) {
      if (controls.left) rotationAccel += acceleration;
      if (controls.right) rotationAccel -= acceleration;
      accel = 0;
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
    this.setTmpDirection(Math.sin(rotation), 0, Math.cos(rotation));
    this.setTmpRotationDirection(this.getTmpDirection());

    //#region forward/backward
    let speed = 0;
    const velocity = this.state.velocity;
    if (!isRotating) {
      velocity.addScaledVector(this.getTmpDirection(), accel * delta);
      if (controls.brake) {
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
      unit.setRotation(rotation + turn * delta * turnFactor);
    }

    // newPosition vermeiden: temp nutzen
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
