import { Vector3 } from 'three';

import type { AnimationLoopValue } from '../Renderer';
import type TankUnit from '../unit/vehicle/Tank';

import GroundVehicleUnitModule, {
  type GroundVehicleUnitModuleOptions,
  type GroundVehicleUnitModuleState
} from './movable/GroundVehicle';

export type TankUnitModuleOptions = GroundVehicleUnitModuleOptions;
export type TankUnitModuleState = GroundVehicleUnitModuleState;

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
        // maxSpeed: options.maxSpeed ?? 1,
        acceleration: options.acceleration ?? 1 / 2,
        friction: options.friction ?? 0.9
        // turnSpeed: options.turnSpeed ?? 1 / 2
        // turnMovementSpeed: options.turnMovementSpeed ?? 1 / 3
      },
      {
        ...state
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

    const isRotating = controls.moveLeft || controls.moveRight;

    // Früher Bail-out: wenn keine Eingaben und Geschwindigkeiten ~0, nichts tun
    const eps = 1e-4;
    if (
      !controls.moveForward &&
      !controls.moveBackward &&
      !controls.moveLeft &&
      !controls.moveRight &&
      !controls.space &&
      this.state.velocity.lengthSq() <= eps
    ) {
      return;
    }

    // 1. Beschleunigung durch Input
    let accel = 0;
    if (controls.moveForward) accel += acceleration;
    if (controls.moveBackward) accel -= acceleration * 0.5; // Rückwärts langsamer

    // 2. Richtung aus Rotation (keine neuen Objekte erzeugen)
    const forward = unit.getForwardXZFromYaw(new Vector3());
    this.setTmpDirection(forward.x, 0, forward.z);
    this.setTmpRotationDirection(forward);

    //#region forward/backward
    const velocity = this.state.velocity;
    if (!isRotating) {
      // Beschleunigung anwenden, wenn Input da ist
      if (accel !== 0) {
        velocity.addScaledVector(this.getTmpDirection(), accel * delta);
      } else {
        // Nur Reibung anwenden, wenn keine Beschleunigung stattfindet
        velocity.multiplyScalar(friction);
      }

      if (controls.space) {
        velocity.multiplyScalar(0.8);
      }
    } else {
      // Beim Drehen langsamer werden
      velocity.multiplyScalar(0.8);
      if (velocity.lengthSq() < eps) velocity.setScalar(0);
    }

    let speed = velocity.length();

    if (speed > maxSpeed) {
      velocity.setLength(maxSpeed);
      speed = maxSpeed; // Wichtig: speed-Variable auch aktualisieren
    } else if (speed <= eps && accel === 0) {
      // Nur auf 0 setzen, wenn keine Beschleunigung anliegt
      velocity.setScalar(0);
      speed = 0;
    }
    //#endregion

    const turnSpeed = this.options.turnSpeed;

    // Der turnFactor sollte nicht von der Geschwindigkeit abhängen, wenn man auf der Stelle dreht.
    const speedFactor = Math.max(0.1, 1 - speed / maxSpeed); // 0.1 als Minimum, damit man auch bei maxSpeed noch lenken kann
    const turnFactor = isRotating && speed < eps ? 1 : speedFactor;

    let turn = 0;
    if (controls.moveLeft) turn += turnSpeed;

    if (controls.moveRight) turn -= turnSpeed;

    if (turn !== 0) {
      // Statt Quaternion: Yaw direkt ändern, unabhängig von Tilt/Pitch/Roll
      const newYaw = unit.getYaw() + turn * delta * turnFactor;
      unit.setYaw(newYaw);
    }

    // newPosition vermeiden: temp nutzen
    const pos = unit.getPosition().clone();
    // HIER die Geschwindigkeit mit delta multiplizieren
    const dx = velocity.x * delta * currentPower;
    const dz = velocity.z * delta * currentPower;

    if (Math.abs(dx) > eps || Math.abs(dz) > eps) {
      pos.x += dx;
      pos.z += dz;
      if (!unit.setPosition(pos)) {
        velocity.set(0, 0, 0);
      }
    }
  }
}
