import { Subject } from 'rxjs';
/* eslint-disable complexity */
import type { Object3D } from 'three';
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import type MovableUnit from '../unit/Movable';
import type { NAVIGATOR_TYPE } from '../mapModule/Pathfinding';
import type SeaVehicleUnit from '../unit/vehicle/SeaVehicle';

import FigureUnitModule from './movable/FigureMovable';
import HelicopterUnitModule from './movable/airVehicle/Helicopter';
import GroundVehicleUnitModule from './movable/GroundVehicle';
import SeaVehicleUnitModule from './movable/SeaVehicle';
import type MovableUnitModule from './Movable';
import type FigureMovableUnitModule from './movable/FigureMovable';

declare module '../Unit' {
  interface ModuleStates {
    pathfinding: Partial<PathfindingUnitModuleState>;
  }
  interface ModuleOptions {
    pathfinding: Partial<PathfindingUnitModuleOptions>;
  }
  interface ModuleDebug {
    pathfinding: boolean;
  }
}

declare module '../../utils/object' {
  interface ObjectUserData {
    IGNORE_PATHFINDING: string;
  }
}

OBJECT_USER_DATA.IGNORE_PATHFINDING = 'ignorePathfinding';

export function setIgnorePathfinding(object: Object3D, ignore: boolean) {
  if (!object) {
    console.warn('object is missing!');
    return;
  }
  object.userData[OBJECT_USER_DATA.IGNORE_PATHFINDING] = ignore;
}

interface Observables extends UnitModuleObservables {
  moveStart$: Subject<void>;
  moveComplete$: Subject<void>;
}

export interface PathfindingUnitModuleOptions extends UnitModuleOptions {
  active: boolean;
  navigatorType: NAVIGATOR_TYPE;
}
export interface PathfindingUnitModuleState extends UnitModuleState {
  complete: boolean;
  currentPath: Vector3[] | null;
  pendingMove: {
    target: Vector3;
    resolve: (value: boolean) => void;
  } | null;
}

export default class PathfindingUnitModule extends UnitModule<
  PathfindingUnitModuleOptions,
  PathfindingUnitModuleState,
  Observables
> {
  static override TYPE = 'pathfinding';

  private debugPathLine?: Line;
  private yawIntegral = 0;
  private lastTargetDistance?: number;
  private lastTargetDistanceCounter = 0;

  constructor(
    unit: Unit,
    options: PathfindingUnitModuleOptions,
    state: PathfindingUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        active: options.active ?? true
      },
      {
        ...state,
        complete: false,
        currentPath: null,
        pendingMove: null
      },
      debug
    );

    //#region observables
    this.observables.moveStart$ = new Subject<void>();
    this.observables.moveComplete$ = new Subject<void>();
    //#endregion
  }

  override async setup() {
    await super.setup();
    const unit = this.getUnit();
    this.subscription.add(
      unit.modules.damage.observables.destroyed$.subscribe(async () => {
        await this.abortMovement();
        this.destroy();
      })
    );
  }

  getNavigatorType() {
    return this.options.navigatorType;
  }

  async move(targetPosition: Vector3) {
    if (this.isMoving()) {
      // Queue den Move, wenn bereits einer läuft (für Patrol/Attack-Integration)
      return new Promise<boolean>(resolve => {
        this.state.pendingMove = { target: targetPosition, resolve };
      });
    }

    // Abbrechen, wenn force=true (z.B. für Attack)
    // if (this.isMoving()) {
    //   await this.abortMovement();
    // }

    // Führe den Move aus (wie bisher)
    const result = (await this.executeMove(targetPosition)) ?? false;

    // Nach Move: Prüfe Pending
    if (this.state.pendingMove) {
      const { target, resolve } = this.state.pendingMove;
      this.state.pendingMove = null;
      resolve(await this.move(target)); // Rekursiv, aber ohne force
    }

    return result;
  }

  private async executeMove(targetPosition: Vector3) {
    // Extrahiere gemeinsame Logik
    if (this.isGroundMovable()) {
      return await this.moveGroundVehicle(this.getUnit(), targetPosition);
    } else if (this.isAirMovable()) {
      return this.moveAirVehicle(this.getUnit(), targetPosition);
    } else if (this.isSeaMovable()) {
      return this.moveSeaVehicle(
        this.getUnit() as SeaVehicleUnit,
        targetPosition
      );
    }
    return false;
  }

  override destroy() {
    this.removeDebugPathLine();
    super.destroy();
  }

  override update({ delta }: AnimationLoopValue): void {
    const unit = this.getUnit() as MovableUnit;
    const currentPath = this.state.currentPath;
    const movableModule = unit.modules.movable;

    if (
      !this.options.active ||
      unit.modules.damage.isDestroyed() ||
      !currentPath ||
      currentPath.length === 0
    ) {
      if (movableModule) {
        movableModule.clearAutopilotControls();
      }
      return;
    }

    const target = currentPath[0]!;

    let shiftThreshold = 0.1;

    if (movableModule instanceof GroundVehicleUnitModule) {
      const pos = unit.getPosition();
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;

      const desiredYaw = Math.atan2(dx, dz);
      const currentYaw = unit.getYaw();

      let diff = desiredYaw - currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const dist = Math.hypot(dx, dz);

      /**
       * The stopping distance of the vehicle.
       */
      const stopDist = 0.04;
      /**
       * The yaw deadzone of the vehicle. (Erhöht für weniger Zickzack)
       */
      const yawDeadzone = 0.01;
      /**
       * The maximum turning factor of the vehicle. (Reduziert für sanftere Drehungen)
       */
      const maxTurnFactor = 0.6;

      const integralGain = 0.01; // Kleiner Wert für langsame Akkumulation
      this.yawIntegral = (this.yawIntegral || 0) + diff * delta * integralGain;
      this.yawIntegral = Math.max(
        -maxTurnFactor,
        Math.min(maxTurnFactor, this.yawIntegral)
      );

      const proportional = Math.min(Math.abs(diff) / 1.0, maxTurnFactor);
      const turnFactor = Math.min(
        proportional + Math.abs(this.yawIntegral),
        maxTurnFactor
      );

      const turnLeft = diff > yawDeadzone ? turnFactor : 0;
      const turnRight = diff < -yawDeadzone ? turnFactor : 0;

      const goForward = dist > stopDist;

      movableModule.setAutopilotControls({
        moveForward: goForward || turnLeft || turnRight,
        moveLeft: turnLeft,
        moveRight: turnRight
      });

      const velLenSq = movableModule.getVelocity().lengthSq();
      if (velLenSq < 1e-6 && (goForward || turnLeft || turnRight)) {
        const forward = unit.getForwardXZFromYaw(new Vector3(0, 0, 0));

        movableModule.getVelocity().addScaledVector(forward, 0.01);
      }
    } else if (movableModule instanceof FigureUnitModule) {
      const pos = unit.getPosition();
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;

      const desiredYaw = Math.atan2(dx, dz);
      const currentYaw = unit.getYaw();

      let diff = desiredYaw - currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const dist = Math.hypot(dx, dz);
      const yawDeadzone = 0.03;
      const stopDist = 0.05;

      const turnLeft = diff > yawDeadzone;
      const turnRight = diff < -yawDeadzone;
      const goForward = dist > stopDist;

      movableModule.setAutopilotControls({
        moveForward: goForward || turnLeft || turnRight,
        moveLeft: turnLeft,
        moveRight: turnRight
      });
    } else if (movableModule instanceof HelicopterUnitModule) {
      if (!movableModule.hasMinPower()) {
        movableModule.setAutopilotControls({
          ascend: true
        });
        return;
      }

      const pos = unit.getPosition();
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const distXZ = Math.hypot(dx, dz);

      const desiredYaw = Math.atan2(dx, dz);
      const currentYaw = unit.getYaw();
      const diff =
        ((desiredYaw - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;

      const yawDeadzone = 0.1;
      const maxTurnFactor = 0.8;

      const integralGain = 0.05;
      this.yawIntegral = (this.yawIntegral || 0) + diff * delta * integralGain;
      const turnFactor = Math.min(
        Math.abs(diff) / 1.0 + Math.abs(this.yawIntegral),
        maxTurnFactor
      );

      const turnLeft = diff > yawDeadzone ? turnFactor : 0;
      const turnRight = diff < -yawDeadzone ? turnFactor : 0;

      const heightDiff = target.y - pos.y;
      const heightDeadzone = 0.5;
      const heightReached = Math.abs(heightDiff) <= heightDeadzone;
      let ascend = !heightReached && heightDiff > heightDeadzone;
      const descend = !heightReached && heightDiff < -heightDeadzone;

      ascend = ascend && !descend;

      const shouldToggleGears = heightReached && movableModule.getGearsOpened();

      const stopDist = 0.5; // Verkleinern, um präziser anzukommen
      const brakingDist = 4.0;
      const isTurning = turnLeft > 0 || turnRight > 0;
      let goForward = 0;

      const largeTurnThreshold = Math.PI / 4;

      if (Math.abs(diff) > largeTurnThreshold && isTurning) {
        goForward = 0; // Korrekt: Erst drehen bei großen Winkeln
      } else if (heightReached) {
        // Wenn die Distanz größer als die Bremsdistanz ist, voller Schub.
        if (distXZ > brakingDist) {
          goForward = 1.0;
        }
        // Wenn die Distanz größer als die Stopp-Distanz ist, skaliere den Schub.
        // Dies ist die Hauptlogik für das Anfahren und Bremsen.
        else if (distXZ > stopDist) {
          const brakingFactor = (distXZ - stopDist) / (brakingDist - stopDist);
          goForward = Math.max(0.2, brakingFactor); // Minimaler Schub von 0.2, um nicht stecken zu bleiben
        }
      }

      if (isTurning && goForward > 0) {
        const turnPenalty = 1.0 - Math.min(turnFactor, 1.0) * 0.75;
        goForward *= turnPenalty;
      }

      shiftThreshold = currentPath.length === 1 ? 0.2 : 0.8;

      movableModule.setAutopilotControls({
        ascend,
        descend,

        landing_gear: shouldToggleGears,

        rotateLeft: turnLeft,
        rotateRight: turnRight,

        pitchUp: goForward
      });
    } else if (movableModule instanceof SeaVehicleUnitModule) {
      const pos = unit.getPosition();
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;

      const desiredYaw = Math.atan2(dx, dz);
      const currentYaw = unit.getYaw();

      let diff = desiredYaw - currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const dist = Math.hypot(dx, dz);

      const stopDist = 0.2;
      const yawDeadzone = 0.1;
      const maxTurnFactor = 0.5;

      const turnFactor = Math.min(Math.abs(diff) / 1.0, maxTurnFactor);
      let turnLeft = diff > yawDeadzone ? turnFactor : 0;
      let turnRight = diff < -yawDeadzone ? turnFactor : 0;

      const largeTurnThreshold = Math.PI / 8; // Erhöht von /8 auf /6 (~30 Grad), um Kreisen zu reduzieren
      const isTurning = turnLeft > 0 || turnRight > 0;
      let goForward = 0;

      // FIX: Kurskorrektur – Überprüfe, ob die Bewegung den Abstand verringert
      const velocity = movableModule.getVelocity();
      const dotProduct = velocity.dot(new Vector3(dx, 0, dz).normalize()); // Wie gut passt die Geschwindigkeit zur Zielrichtung?
      const isMovingTowardsTarget = dotProduct > 0.5; // Schwellwert: Muss mindestens 50% in Richtung Ziel gehen

      if (Math.abs(diff) > largeTurnThreshold && isTurning) {
        if (dist < 1.0) {
          goForward = 0; // Nur drehen bei kleinen Distanzen
        } else {
          goForward = 0.1; // Minimaler Schub
        }
      } else {
        const brakingDist = 2.0;
        if (dist > brakingDist) {
          goForward = 1.0;
        } else if (dist > stopDist) {
          const brakingFactor = (dist - stopDist) / (brakingDist - stopDist);
          goForward = Math.max(0.2, brakingFactor);
        }
      }

      // FIX: Wenn nicht in Richtung Ziel, erzwinge Korrektur (mehr drehen, weniger fahren)
      if (!isMovingTowardsTarget && dist > stopDist) {
        goForward *= 0.5; // Reduziere Schub, um Drehen zu priorisieren
        // Optional: Erhöhe turnFactor leicht
        const correctionFactor = 1.2;
        turnLeft *= correctionFactor;
        turnRight *= correctionFactor;
      }

      if (isTurning && goForward > 0) {
        const turnPenalty = 1.0 - Math.min(turnFactor, 1.0) * 0.5;
        goForward *= turnPenalty;
      }

      movableModule.setAutopilotControls({
        // moveForward: goForward > 0 || turnLeft || turnRight,
        moveForward: goForward > 0,
        moveLeft: turnLeft,
        moveRight: turnRight
      });

      // Hilfs-Schub bleibt
      const velLenSq = movableModule.getVelocity().lengthSq();
      if (velLenSq < 1e-6 && (goForward > 0 || turnLeft || turnRight)) {
        const forward = unit.getForwardXZFromYaw(new Vector3(0, 0, 0));
        movableModule.getVelocity().addScaledVector(forward, 0.01);
      }

      shiftThreshold = 0.8; //currentPath.length === 1 ? 0 : 0.4;
    } else {
      const step = 4 * delta;
      const position = unit.getPosition();
      position.lerp(target, step);
      unit.setPosition(position);
    }

    const posNow = unit.getPosition();
    const horizontalDistance = Math.hypot(
      target.x - posNow.x,
      target.z - posNow.z
    );
    const distanceToCheck = horizontalDistance;

    if (
      distanceToCheck < shiftThreshold ||
      this.lastTargetDistanceCounter >= 100
    ) {
      if (this.lastTargetDistanceCounter >= 100) {
        console.warn('Pathfinding stuck, forcing next waypoint!');
      }
      this.lastTargetDistanceCounter = 0;
      currentPath.shift();
      if (currentPath.length === 0) {
        const gv2 =
          'groundVehicle' in unit.modules
            ? (unit.modules.groundVehicle as GroundVehicleUnitModule)
            : undefined;
        const fig2 =
          'figureMovable' in unit.modules
            ? (unit.modules.figureMovable as FigureMovableUnitModule)
            : undefined;
        const heli2 =
          'helicopter' in unit.modules
            ? (unit.modules.helicopter as HelicopterUnitModule)
            : undefined;

        gv2?.clearAutopilotControls();
        fig2?.clearAutopilotControls();

        if (heli2) {
          const shouldLand = false; // Hier könnte eine Option aus dem move-Befehl kommen
          const shouldToggleGearsForLanding =
            shouldLand && !heli2.getGearsOpened();

          heli2.setAutopilotControls({
            landing: shouldLand,
            landing_gear: shouldToggleGearsForLanding // Befehl zum Ausfahren der Gears geben
          });
        }
        this.state.currentPath = null;
        this.setMoveComplete();
      }
    }

    if (
      this.lastTargetDistance &&
      this.lastTargetDistance === horizontalDistance
    ) {
      this.lastTargetDistanceCounter++;
    } else {
      this.lastTargetDistanceCounter = 0;
    }
    this.lastTargetDistance = horizontalDistance;
    if (currentPath.length === 0) {
      this.clearAutopilotAndComplete(movableModule);
      // Pending Move starten
      if (this.state.pendingMove) {
        const { target, resolve } = this.state.pendingMove;
        this.state.pendingMove = null;
        this.move(target).then(v => resolve(v));
      }
    }
  }

  private clearAutopilotAndComplete(movableModule: MovableUnitModule) {
    movableModule?.clearAutopilotControls();
    this.setMoveComplete();
  }

  setMoveComplete() {
    if (this.state.complete) return;
    this.state.complete = true;
    this.observables.moveComplete$.next();
  }

  private async moveGroundVehicle(unit: Unit, target: Vector3) {
    const pathfindingModule = unit.getMap()?.modules.pathfinding;
    const groundNavigator = pathfindingModule?.getGroundNavigatorForUnit(unit);

    if (!groundNavigator) throw new Error('GroundNavigator not initialized');

    if (this.state.currentPath) {
      console.log(
        'PathfindingUnitModule: Already moving, shortening path to current waypoint'
      );
      this.abortMovement();
      return false;
    }

    this.state.complete = false;

    const path = await groundNavigator.findPath(
      unit.getPosition(),
      target,
      pathfindingModule?.getGridNodesByUnit(unit)
    );

    if (!path) return false;

    this.state.currentPath = path;

    if (this.debug) {
      this.updateDebugPathLine(unit);

      const subscription = this.observables.moveComplete$.subscribe(() => {
        subscription.unsubscribe();
        this.updateDebugPathLine(unit);
      });
    }

    this.observables.moveStart$.next();

    return new Promise<boolean>(resolve => {
      const subscription = this.observables.moveComplete$.subscribe(() => {
        subscription.unsubscribe();
        resolve(true);
      });
      if (path.length < 1) {
        this.state.currentPath = null;
        this.observables.moveComplete$.next();
      }
    });
  }

  private async moveAirVehicle(unit: Unit, target: Vector3) {
    const pathfindingModule = unit.getMap()?.modules.pathfinding;
    const airNavigator = pathfindingModule?.getAirNavigator();

    this.state.currentPath = null;

    if (!airNavigator) throw new Error('AirNavigator not initialized');

    if (this.state.currentPath) {
      console.log(
        'PathfindingUnitModule: Already moving, shortening path to current waypoint'
      );
      this.abortMovement();
      return false;
    }

    this.state.complete = false;

    const path = await airNavigator.findPath(
      unit.getPosition(),
      target,
      pathfindingModule?.getGridNodesByUnit(unit)
    );

    if (!path || path.length <= 1) return;

    path.shift();

    this.state.currentPath = path; // simplifyPath(path, 1.0);

    this.yawIntegral = 0;

    if (this.debug) {
      this.updateDebugPathLine(unit);

      const subscription = this.observables.moveComplete$.subscribe(() => {
        subscription.unsubscribe();
        this.updateDebugPathLine(unit);
      });
    }

    this.observables.moveStart$.next();

    return new Promise<boolean>(resolve => {
      const subscription = this.observables.moveComplete$.subscribe(() => {
        subscription.unsubscribe();
        resolve(true);
      });
    });
  }

  private async moveSeaVehicle(unit: SeaVehicleUnit, target: Vector3) {
    const pathfindingModule = unit.getMap()?.modules.pathfinding;
    const seaNavigator = pathfindingModule?.getSeaNavigator();

    if (!seaNavigator) throw new Error('SeaNavigator not initialized');

    if (this.state.currentPath) {
      console.log(
        'PathfindingUnitModule: Already moving, shortening path to current waypoint'
      );
      this.abortMovement();
      return false;
    }

    this.state.complete = false;

    unit.modules.seaVehicle.options.allowRotationInPlace = true;

    const path = await seaNavigator.findPath(
      unit.getPosition().setY(0),
      target.clone().setY(0),
      pathfindingModule?.getGridNodesByUnit(unit)
    );

    if (!path?.length) return false;

    this.state.currentPath = path;

    this.yawIntegral = 0;

    if (this.debug) {
      this.updateDebugPathLine(unit);

      const subscription = this.observables.moveComplete$.subscribe(() => {
        subscription.unsubscribe();
        this.updateDebugPathLine(unit);
      });
    }

    this.observables.moveStart$.next();

    return new Promise<boolean>(resolve => {
      const subscription = this.observables.moveComplete$.subscribe(() => {
        subscription.unsubscribe();
        resolve(true);
      });
    });
  }

  private isAborting = false;
  abortMovement() {
    if (this.isAborting) return Promise.resolve(false);
    this.isAborting = true;
    this.state.pendingMove = null;
    this.state.currentPath = null;
    return new Promise<boolean>(resolve => {
      if (this.state.complete || !this.state.currentPath) {
        resolve(true);
        return;
      }
      const subscription = this.observables.moveComplete$.subscribe(() => {
        subscription.unsubscribe();
        resolve(true);
      });
    }).then(v => {
      this.isAborting = false;
      return v;
    });
  }

  isGroundMovable() {
    const u = this.getUnit();
    return (
      u.hasModuleType(GroundVehicleUnitModule) ||
      u.hasModuleType(FigureUnitModule)
    );
  }

  isAirMovable() {
    return this.getUnit().hasModuleType(HelicopterUnitModule);
  }

  isSeaMovable() {
    return this.getUnit().hasModuleType(SeaVehicleUnitModule);
  }

  isMoving() {
    return this.state.currentPath !== null;
  }

  override isForceUpdate() {
    return this.state.currentPath !== null;
  }

  //#region debug

  private updateDebugPathLine(unit: Unit) {
    const path = this.state.currentPath;
    if (!path || path.length < 2) {
      this.removeDebugPathLine();
      return;
    }

    if (!this.debugPathLine) {
      const geometry = new BufferGeometry().setFromPoints(
        path.map(p => new Vector3(p.x, p.y + 0.1, p.z))
      );
      this.debugPathLine = new Line(
        geometry,
        new LineBasicMaterial({
          color: 0x00ff00,
          linewidth: 2
        })
      );
      unit.getMap()?.app.getScene().add(this.debugPathLine);
    } else {
      this.debugPathLine.geometry.setFromPoints(
        path.map(p => new Vector3(p.x, p.y + 0.1, p.z))
      );
      if (this.debugPathLine.geometry.attributes.position) {
        this.debugPathLine.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  private removeDebugPathLine() {
    if (this.debugPathLine) {
      disposeObject3D(this.debugPathLine);
      this.debugPathLine = undefined;
    }
  }

  //#endregion

  getActive() {
    return this.options.active;
  }

  setActive(active: boolean) {
    this.options.active = active;
  }

  override getOptions() {
    return {
      active: this.options.active
    };
  }
}
