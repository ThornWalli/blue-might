import { Vector3, Object3D } from 'three';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';

interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}

export interface VehicleUnitModuleOptions extends UnitModuleOptions {
  maxSpeed: number;
  acceleration: number;
  turnSpeed: number;
  turnMovementSpeed: number;
  friction: number;
}

export interface VehicleUnitModuleState extends UnitModuleState {
  velocity: Vector3;
  tilt: Vector3;
  groundNormal: Vector3;
  controls: ControlState;
}

export default class VehicleUnitModule<
  Options extends VehicleUnitModuleOptions = VehicleUnitModuleOptions,
  State extends VehicleUnitModuleState = VehicleUnitModuleState,
  Obervables extends UnitModuleObservables = UnitModuleObservables,
  U extends Unit = Unit
> extends UnitModule<Options, State, Obervables, U> {
  static override TYPE = 'vehicle';
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

  root: Object3D;

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
        groundNormal: state.groundNormal ?? new Vector3(0, 1, 0),
        controls: {
          forward: false,
          backward: false,
          left: false,
          right: false,
          brake: false
        }
      },
      debug
    );

    this.root = new Object3D();
  }

  setControls(controls: ControlState) {
    this.state.controls = { ...this.state.controls, ...controls };
  }
  // eslint-disable-next-line complexity
  override update({ delta }: AnimationLoopValue): void {
    const unit = this.getUnit();
    const acceleration = this.options.acceleration;
    const rotation = unit.getRotation();
    const controls = this.state.controls;
    const maxSpeed = this.options.maxSpeed;
    const friction = this.options.friction;

    // Früher Bail-out: wenn keine Eingaben und Geschwindigkeiten ~0, nichts tun
    const eps = 1e-4;
    if (
      !controls.forward &&
      !controls.backward &&
      !controls.left &&
      !controls.right &&
      !controls.brake &&
      this.state.velocity.lengthSq() < eps
    ) {
      return;
    }

    // 1. Beschleunigung durch Input
    let accel = 0;
    if (controls.forward) accel += acceleration;
    if (controls.backward) accel -= acceleration * 0.5; // Rückwärts langsamer

    // Wenn weder Bewegung noch Rotation stattfinden soll, abbrechen
    if (accel === 0 && this.state.velocity.lengthSq() < eps) {
      // kleine Restgeschwindigkeiten hart auf 0 setzen
      if (this.state.velocity.lengthSq() < eps)
        this.state.velocity.setScalar(0);

      return;
    }

    // 2. Richtung aus Rotation (keine neuen Objekte erzeugen)
    this.setTmpDirection(Math.sin(rotation), 0, Math.cos(rotation));
    this.setTmpRotationDirection(this.getTmpDirection());

    //#region forward/backward
    let speed = 0;
    const velocity = this.state.velocity;

    velocity.addScaledVector(this.getTmpDirection(), accel * delta);
    if (controls.brake) {
      velocity.multiplyScalar(0.8);
    }
    velocity.multiplyScalar(friction);

    // Traktion: Queranteil zur Fahrtrichtung dämpfen
    const forward = this.getTmpDirection();
    const dot = velocity.dot(forward);
    // Querkomponente = v - proj_v
    const lateralX = velocity.x - forward.x * dot;
    const lateralZ = velocity.z - forward.z * dot;
    const lateralMagSq = lateralX * lateralX + lateralZ * lateralZ;

    if (lateralMagSq > 0) {
      // grip: 0..1 (höher = mehr Traktion, weniger seitliches Schliddern)
      const grip = 0.85; // ggf. als Option konfigurierbar
      // dämpfe die Querkomponente
      velocity.x = forward.x * dot + lateralX * (1 - grip);
      velocity.z = forward.z * dot + lateralZ * (1 - grip);
    }

    speed = velocity.length();
    if (speed > maxSpeed) {
      velocity.setLength(maxSpeed);
    } else if (speed < eps) {
      velocity.setScalar(0);
      speed = 0;
    }
    //#endregion

    const turnSpeed = this.options.turnMovementSpeed;

    if (speed > 0.05) {
      let turnInput = 0;

      if (controls.left) turnInput += 1;
      if (controls.right) turnInput -= 1;
      if (controls.backward) turnInput *= -1;

      if (turnInput !== 0) {
        const norm = Math.min(speed / this.options.maxSpeed, 1);
        // sanfteres Steering-Scaling
        const turnFactor = Math.pow(norm, 0.6);
        const lowSpeedBoost = norm < 0.2 ? 1.15 : 1.0;

        // Steering glätten (anstatt sofort volle Lenkung)
        const steeringSmoothing = 100; // höher = schnellerer Übergang
        // akkumulierten, geglätteten Lenkwert im State speichern (optional extern)
        // hier: temporär berechnet (sanftes Einfaden)
        const targetTurn = turnInput * turnSpeed * lowSpeedBoost;
        // sanfte Annäherung an targetTurn
        const smoothTurn =
          targetTurn * (1 - Math.exp(-steeringSmoothing * delta));

        unit.setRotation(unit.getRotation() + smoothTurn * delta * turnFactor);

        // Mildes Dämpfen statt hartem Abbremsen:
        // abhängig von Geschwindigkeit und Delta, nur wenig Energieabbau beim Lenken
        const maxDamp = 0.05; // 5% statt 15%
        const dampStrength = maxDamp * norm; // bei höherer Geschwindigkeit etwas mehr
        const turningDamp = 1 - Math.min(dampStrength, maxDamp);
        velocity.multiplyScalar(turningDamp);
      } else {
        // Kein Lenken → kein Extra-Dämpfen
      }
    }

    // Position
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
