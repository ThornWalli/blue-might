/* eslint-disable complexity */
import { Euler, Vector3 } from 'three';

import type { AnimationLoopValue } from '../../Renderer';
import MovableUnitModule, {
  type MovableUnitModuleObservables,
  type MovableUnitModuleOptions,
  type MovableUnitModuleState
} from '../Movable';
import type FigureUnit from '../../unit/Figure'; // Annahme: Es gibt eine FigureUnit-Klasse
import { ControlAction } from '../../playerModule/Controls';

declare module '../../Unit' {
  interface ModuleStates {
    figure: Partial<FigureUnitModuleState>;
  }
  interface ModuleOptions {
    figure: Partial<FigureUnitModuleOptions>;
  }
  interface ModuleDebug {
    figure: boolean;
  }
}

export type FigureUnitObservables = MovableUnitModuleObservables;

export interface FigureUnitModuleOptions extends MovableUnitModuleOptions {
  maxSpeed: number;
  acceleration: number;
  turnSpeed: number;
  friction: number;
  jumpPower: number;
  gravity: number;
}

export interface FigureUnitModuleState extends MovableUnitModuleState {
  isGrounded: boolean;
  jumpCooldown: number;
}

export default class FigureUnitModule extends MovableUnitModule<
  FigureUnitModuleOptions,
  FigureUnitModuleState,
  FigureUnitObservables,
  FigureUnit
> {
  private moveState = getDefaultMoveState();

  constructor(
    unit: FigureUnit,
    options: FigureUnitModuleOptions,
    state: FigureUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        maxSpeed: options.maxSpeed ?? 1, // Langsamer als Fahrzeuge
        acceleration: options.acceleration ?? 1,
        turnSpeed: options.turnSpeed ?? 4,
        friction: options.friction ?? 0.9,
        jumpPower: options.jumpPower ?? 100,
        gravity: options.gravity ?? 20
      },
      {
        ...state,
        isGrounded: state.isGrounded ?? true,
        jumpCooldown: state.jumpCooldown ?? 0
      },
      debug
    );
  }

  override update(v: AnimationLoopValue): void {
    super.update(v);
    this.moveUpdate({ delta: v.delta });
  }

  moveUpdate({ delta }: { delta: number }) {
    // delta = Math.min(delta, 1 / 60);
    const unit = this.getUnit();
    const controls = this.getControls();
    const acceleration = this.options.acceleration;
    const maxSpeed = this.options.maxSpeed;
    const friction = this.options.friction;
    const jumpPower = this.options.jumpPower;
    const gravity = this.options.gravity;
    const turnSpeed = this.options.turnSpeed;

    const eps = 1e-4;

    if (unit.modules.damage.isDestroyed()) {
      unit.setRotation(
        new Euler(
          unit.getRotation().x - Math.PI / 2,
          unit.getRotation().y,
          unit.getRotation().z
        )
      );
    }

    // Frühzeitiger Abbruch bei keinen Inputs und niedriger Geschwindigkeit
    if (
      !controls[ControlAction.MOVE_FORWARD] &&
      !controls[ControlAction.MOVE_BACKWARD] &&
      !controls[ControlAction.MOVE_LEFT] &&
      !controls[ControlAction.MOVE_RIGHT] &&
      !controls[ControlAction.SPACE] &&
      this.state.velocity.lengthSq() < eps &&
      this.state.isGrounded
    ) {
      return;
    }

    // 1. Richtung aus Yaw
    const forward = unit.getForwardXZFromYaw(this.getTmpDirection());

    // 2. Beschleunigung
    let accelX = 0;
    let accelZ = 0;
    if (controls[ControlAction.MOVE_FORWARD]) {
      accelX += forward.x * acceleration;
      accelZ += forward.z * acceleration;
    }
    if (controls[ControlAction.MOVE_BACKWARD]) {
      accelX -= forward.x * acceleration * 0.5;
      accelZ -= forward.z * acceleration * 0.5;
    }

    // 3. Lenken (Drehen)
    let turn = 0;
    if (controls[ControlAction.MOVE_LEFT]) turn += turnSpeed;
    if (controls[ControlAction.MOVE_RIGHT]) turn -= turnSpeed;
    if (turn !== 0) {
      const newYaw = unit.getYaw() + turn * delta;
      unit.setYaw(newYaw);
    }

    // 4. Velocity aktualisieren (XZ)
    this.state.velocity.x += accelX * delta;
    this.state.velocity.z += accelZ * delta;
    this.state.velocity.x *= friction;
    this.state.velocity.z *= friction;

    // Speed-Clamp
    const horizontalVel = new Vector3(
      this.state.velocity.x,
      0,
      this.state.velocity.z
    );
    const speed = horizontalVel.length();
    if (speed > maxSpeed) {
      horizontalVel.setLength(maxSpeed);
      this.state.velocity.x = horizontalVel.x;
      this.state.velocity.z = horizontalVel.z;
    }

    // 5. Springen
    if (
      controls[ControlAction.SPACE] &&
      this.state.isGrounded &&
      this.state.jumpCooldown <= 0
    ) {
      this.state.velocity.y = jumpPower;
      this.state.isGrounded = false;
      this.state.jumpCooldown = 0.2; // 200ms Cooldown
    }

    // Jump-Cooldown reduzieren
    if (this.state.jumpCooldown > 0) {
      this.state.jumpCooldown -= delta;
    }

    // // 6. Gravitation
    if (!this.state.isGrounded) {
      this.state.velocity.y -= gravity * delta;
    }

    // 7. Position integrieren
    const pos = unit.getPosition().clone();
    pos.x += this.state.velocity.x * delta;
    pos.y += this.state.velocity.y * delta;
    pos.z += this.state.velocity.z * delta;

    // 8. Bodenkontakt prüfen
    const groundHeight =
      unit
        .getMap()
        ?.modules.surface.getSurfaceHeightAt(
          pos.x,
          pos.z,
          u => !u.equals(unit)
        ) ?? 0;

    if (pos.y <= groundHeight) {
      pos.y = groundHeight;
      this.state.velocity.y = 0;
      this.state.isGrounded = true;
    } else {
      this.state.isGrounded = false;
    }

    // Position setzen
    unit.setPosition(pos);

    if (
      controls[ControlAction.MOVE_FORWARD] ||
      controls[ControlAction.MOVE_BACKWARD]
    ) {
      if (!this.moveState.moving) {
        this.observables.move$.next();
        this.moveState.moving = true;
      }
    } else {
      this.moveState.moving = false;
    }

    if (this.state.velocity.lengthSq() < eps) {
      this.observables.stop$.next();
      this.moveState = getDefaultMoveState();
    }
  }
}

function getDefaultMoveState() {
  return {
    moving: false,
    rotating: false
  };
}
