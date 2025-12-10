/* eslint-disable complexity */
import { Vector3, Object3D } from 'three';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import type { ControlState } from '../playerModule/Controls';

export interface HelicopterUnitModuleOptions extends UnitModuleOptions {
  maxSpeed: number;
  acceleration: number;
  yawSpeed: number; // how fast yaw rotates
  pitchPower: number; // forward/back tilt strength
  rollPower: number; // side tilt strength
  friction: number;
  liftPower: number; // vertical acceleration
  maxAltitude: number; // clamp altitude
  fixedAltitude?: number; // if set, use takeoff/land to snap here
  autoLevelRate?: number; // how fast tilt recenters
}

export interface HelicopterUnitModuleState extends UnitModuleState {
  velocity: Vector3; // includes y
  tilt: Vector3; // x=pitch, y=unused, z=roll (right-handed; adjust as needed)
  groundNormal: Vector3;
  controls: ControlState;
  isAirborne?: boolean; // used for fixed altitude mode
}

export default class HelicopterUnitModule<
  Options extends HelicopterUnitModuleOptions = HelicopterUnitModuleOptions,
  State extends HelicopterUnitModuleState = HelicopterUnitModuleState,
  Obervables extends UnitModuleObservables = UnitModuleObservables,
  U extends Unit = Unit
> extends UnitModule<Options, State, Obervables, U> {
  static override TYPE = 'vehicle';
  private _dir = new Vector3();
  private _right = new Vector3();

  getTmpDirection() {
    return this._dir;
  }
  setTmpDirection(x: number, y: number, z: number) {
    this._dir.set(x, y, z);
  }
  getTmpRight() {
    return this._right;
  }

  root: Object3D;

  constructor(unit: U, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        maxSpeed: options.maxSpeed ?? 25,
        acceleration: options.acceleration ?? 10,
        yawSpeed: options.yawSpeed ?? 1.8,
        pitchPower: options.pitchPower ?? 1.5,
        rollPower: options.rollPower ?? 1.25,
        friction: options.friction ?? 0.96,
        liftPower: options.liftPower ?? 12,
        maxAltitude: options.maxAltitude ?? 300,
        autoLevelRate: options.autoLevelRate ?? 2
      } as Options,
      {
        ...state,
        velocity: state.velocity ?? new Vector3(0, 0, 0),
        tilt: state.tilt ?? new Vector3(0, 0, 0),
        groundNormal: state.groundNormal ?? new Vector3(0, 1, 0),
        controls: {
          up: false,
          down: false,
          left: false,
          right: false,
          space: false
        },
        isAirborne: state.isAirborne ?? false
      } as State,
      debug
    );

    this.root = new Object3D();
  }

  setControls(controls: ControlState) {
    this.state.controls = { ...this.state.controls, ...controls };
  }

  /**
   * Controls mapping suggestion:
   * - up: pitch forward (tilt nose down → move forward)
   * - down: pitch backward (tilt nose up → move backward)
   * - left/right: yaw
   * - space:
   *   - flexible altitude mode: ascend
   *   - fixed altitude mode: toggle takeoff/land
   */

  override update({ delta }: AnimationLoopValue): void {
    const unit = this.getUnit();
    const controls = this.state.controls;
    const friction = this.options.friction;
    const maxSpeed = this.options.maxSpeed;
    const yawSpeed = this.options.yawSpeed;
    const pitchPower = this.options.pitchPower;
    const rollPower = this.options.rollPower;
    const liftPower = this.options.liftPower;
    const autoLevelRate = this.options.autoLevelRate ?? 2;

    const eps = 1e-4;

    // Compute forward and right vectors from yaw (unit rotation around Y)
    const yaw = unit.getRotation();
    this.setTmpDirection(Math.sin(yaw.y), 0, Math.cos(yaw.y));
    const forward = this.getTmpDirection();
    // right vector (perpendicular on XZ plane)
    this.getTmpRight().set(forward.z, 0, -forward.x);

    // 1) Handle altitude mode
    const hasFixedAltitude = this.options.fixedAltitude != null;
    const velocity = this.state.velocity;
    let targetAltitude: number | null = null;

    if (hasFixedAltitude) {
      // Space toggles takeoff/land
      if (controls.space) {
        this.state.isAirborne = true;
      }
      // If not airborne, we gently land (descend to ground)
      if (!this.state.isAirborne) {
        velocity.y -= liftPower * delta * 0.75;
      } else {
        targetAltitude = this.options.fixedAltitude!;
      }
    } else {
      // Flexible altitude: space ascends, down descends
      if (controls.space) {
        velocity.y += liftPower * delta;
        this.state.isAirborne = true; // take off when ascending
      }
      // Gentle gravity and descent
      if (controls.down && !controls.up) {
        velocity.y -= liftPower * 0.75 * delta;
      } else {
        velocity.y -= liftPower * 0.25 * delta;
      }
    }

    // 2) Tilt control (pitch/roll)
    // We use tilt.x for pitch (forward/back), tilt.z for roll (side)
    const tilt = this.state.tilt;

    // Input-based tilt change
    const pitchInput = (controls.up ? 1 : 0) - (controls.down ? 1 : 0);
    const rollInput = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);

    // Apply tilt changes
    tilt.x += pitchInput * pitchPower * delta; // nose down = positive x
    tilt.z += rollInput * rollPower * delta;

    // Clamp tilts to reasonable range
    const maxPitch = 0.6; // radians-ish feel, but this is arbitrary scalar
    const maxRoll = 0.6;
    tilt.x = Math.max(-maxPitch, Math.min(maxPitch, tilt.x));
    tilt.z = Math.max(-maxRoll, Math.min(maxRoll, tilt.z));

    // Auto-level when no input
    if (pitchInput === 0) {
      tilt.x += (0 - tilt.x) * Math.min(1, autoLevelRate * delta);
    }
    if (rollInput === 0) {
      tilt.z += (0 - tilt.z) * Math.min(1, autoLevelRate * delta);
    }

    // 3) Yaw rotation
    let yawInput = 0;
    if (controls.left) yawInput += 1;
    if (controls.right) yawInput -= 1;
    if (yawInput !== 0) {
      const euler = unit.getRotation().clone();
      euler.y = yaw.y + yawInput * yawSpeed * delta;
      unit.setRotation(euler);
    }

    // 4) Horizontal movement from tilt
    // Forward component from pitch: move along forward vector
    // Roll adds a lateral component along right vector
    const horizontalAccel =
      this.options.acceleration *
      (Math.abs(tilt.x) + Math.abs(tilt.z) > eps ? 1 : 0);

    // scale by tilt amount
    const forwardAccel = tilt.x * horizontalAccel; // use horizontalAccel
    const rightAccel = tilt.z * horizontalAccel; // use horizontalAccel

    velocity.addScaledVector(forward, forwardAccel * delta);
    velocity.addScaledVector(this.getTmpRight(), rightAccel * delta);

    // 5) Hover brake (optional): holding space in flexible mode can also dampen horizontal drift
    if (
      !hasFixedAltitude &&
      controls.space &&
      pitchInput === 0 &&
      rollInput === 0
    ) {
      velocity.x *= 0.9;
      velocity.z *= 0.9;
    }

    // 6) Apply friction
    // Only damp horizontal drift; keep vertical velocity responsive to lift
    velocity.x *= friction;
    velocity.z *= friction;
    // velocity.y untouched here

    // 7) Clamp horizontal speed
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    if (horizontalSpeed > maxSpeed) {
      const scale = maxSpeed / horizontalSpeed;
      velocity.x *= scale;
      velocity.z *= scale;
    } else if (horizontalSpeed < eps) {
      velocity.x = 0;
      velocity.z = 0;
    }

    // 8) Altitude clamping and fixed-altitude handling
    const pos = unit.getPosition();
    if (targetAltitude != null) {
      // Soft approach to target altitude
      const dy = targetAltitude - pos.y;
      const approach = Math.max(-liftPower, Math.min(liftPower, dy)) * 0.5;
      velocity.y += approach * delta;

      // If space released and near ground, allow landing
      if (
        !controls.space &&
        Math.abs(dy) < 0.5 &&
        Math.abs(velocity.y) < 0.25
      ) {
        this.state.isAirborne = false;
        velocity.y = 0;
      }
    }

    // Clamp altitude
    const maxAlt = this.options.maxAltitude;
    if (pos.y >= maxAlt && velocity.y > 0) velocity.y = 0;
    if (pos.y <= 0 && velocity.y < 0) {
      velocity.y = 0;
      pos.y = 0;
      this.state.isAirborne = false;
    }

    // 9) Integrate position
    const dx = velocity.x * delta;
    const dy = velocity.y * delta;
    const dz = velocity.z * delta;

    if (Math.abs(dx) > eps || Math.abs(dy) > eps || Math.abs(dz) > eps) {
      pos.x += dx;
      pos.y += dy;
      pos.z += dz;
      unit.setPosition(pos);

      // Only align to ground when not airborne
      if (!this.state.isAirborne) {
        unit.updateGroundAlignment();
      }
    }
  }
}
