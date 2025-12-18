/* eslint-disable complexity */
import { Vector3 } from 'three';
import type { AnimationLoopValue } from '../../Renderer';
import MovableUnitModule, {
  type MovableUnitModuleObservables,
  type MovableUnitModuleOptions,
  type MovableUnitModuleState
} from '../Movable';
import type FigureUnit from '../../unit/Figure'; // Annahme: Es gibt eine FigureUnit-Klasse

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
  velocity: Vector3;
  isGrounded: boolean;
  jumpCooldown: number;
  autopilotControls?: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
  };
}

export default class FigureUnitModule extends MovableUnitModule<
  FigureUnitModuleOptions,
  FigureUnitModuleState,
  FigureUnitObservables,
  FigureUnit
> {
  static override TYPE = 'figure';

  private _dir = new Vector3();
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
        velocity: state.velocity ?? new Vector3(0, 0, 0),
        isGrounded: state.isGrounded ?? true,
        jumpCooldown: state.jumpCooldown ?? 0
      },
      debug
    );
  }

  setAutopilotControls(controls: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
  }) {
    this.state.autopilotControls = controls;
  }

  clearAutopilotControls() {
    this.state.autopilotControls = undefined;
  }

  override getControls() {
    // Verwende Autopilot-Controls, falls gesetzt, sonst manuelle Controls
    return this.state.autopilotControls || super.getControls();
  }

  override update({ delta, time }: AnimationLoopValue): void {
    super.update({ delta, time });
    this.moveUpdate({ delta });
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

    // Frühzeitiger Abbruch bei keinen Inputs und niedriger Geschwindigkeit
    if (
      !controls.up &&
      !controls.down &&
      !controls.left &&
      !controls.right &&
      !controls.space &&
      this.state.velocity.lengthSq() < eps &&
      this.state.isGrounded
    ) {
      return;
    }

    // 1. Richtung aus Yaw
    const forward = unit.getForwardXZFromYaw(this._dir);

    // 2. Beschleunigung
    let accelX = 0;
    let accelZ = 0;
    if (controls.up) {
      accelX += forward.x * acceleration;
      accelZ += forward.z * acceleration;
    }
    if (controls.down) {
      accelX -= forward.x * acceleration * 0.5;
      accelZ -= forward.z * acceleration * 0.5;
    }

    // 3. Lenken (Drehen)
    let turn = 0;
    if (controls.left) turn += turnSpeed;
    if (controls.right) turn -= turnSpeed;
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
      controls.space &&
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

    // 6. Gravitation
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
      unit.getMap()?.modules.ground.getHeightAt(pos.x, pos.z) ?? 0;
    if (pos.y <= groundHeight) {
      pos.y = groundHeight;
      this.state.velocity.y = 0;
      this.state.isGrounded = true;
    } else {
      this.state.isGrounded = false;
    }

    // Position setzen
    unit.setPosition(pos);
    unit.updateGroundAlignment();

    if (controls.left || controls.right) {
      if (!this.moveState.rotating) {
        this.observables.rotate$.next();
        this.moveState.rotating = true;
      }
    } else {
      this.moveState.rotating = false;
    }

    if (controls.up || controls.down) {
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
