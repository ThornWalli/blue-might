/* eslint-disable complexity */
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';
import { Subject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import type MovableUnit from '../unit/Movable';

import FigureUnitModule from './movable/Figure';
import HelicopterUnitModule from './movable/Helicopter';
import GroundVehicleUnitModule from './movable/GroundVehicle';

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

interface Observables extends UnitModuleObservables {
  moveStart$: Subject<void>;
  moveComplete$: Subject<void>;
}

export type PathfindingUnitModuleOptions = UnitModuleOptions;
export interface PathfindingUnitModuleState extends UnitModuleState {
  currentPath: Vector3[] | null;
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
    super(unit, options, state, debug);

    this.state = {
      ...this.state,
      currentPath: state.currentPath ?? null
    };

    //#region observables
    this.observables.moveStart$ = new Subject<void>();
    this.observables.moveComplete$ = new Subject<void>();
    //#endregion
  }

  override async setup() {
    await super.setup();
    const unit = this.getUnit();
    this.subscription.add(
      unit.modules.damage.observables.destroyed$.subscribe(() => {
        this.abortMovement();
      })
    );
  }

  async move(targetPosition: Vector3) {
    const unit = this.getUnit();
    if (this.isGroundMovable()) {
      return await this.moveGroundVehicle(unit, targetPosition);
    } else if (this.isAirMovable()) {
      return this.moveAirVehicle(unit, targetPosition);
    }
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

      const stopDist = 0.08;
      const yawDeadzone = 0.1;
      const maxTurnFactor = 0.5;

      const turnFactor = Math.min(Math.abs(diff) / 1.0, maxTurnFactor);
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

        gear: shouldToggleGears,

        rotateLeft: turnLeft,
        rotateRight: turnRight,

        pitchUp: goForward
      });
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
          'figure' in unit.modules
            ? (unit.modules.figure as FigureUnitModule)
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
            gear: shouldToggleGearsForLanding // Befehl zum Ausfahren der Gears geben
          });
        }
        this.state.currentPath = null;
        this.observables.moveComplete$.next();
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
  }

  private async moveGroundVehicle(unit: Unit, target: Vector3) {
    const groundNavigator = unit
      .getMap()
      ?.modules.pathfinding.getGroundNavigatorForUnit(unit);

    if (!groundNavigator) throw new Error('GroundNavigator not initialized');

    if (this.state.currentPath) {
      console.log(
        'PathfindingUnitModule: Already moving, shortening path to current waypoint'
      );
      this.abortMovement();
      return false;
    }

    const path = await groundNavigator.findPath(unit.getPosition(), target, [
      unit.modules.collision.getCollisionObject()
    ]);

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
    });
  }

  private async moveAirVehicle(unit: Unit, target: Vector3) {
    this.state.currentPath = null;

    const airNavigator = unit.getMap()?.modules.pathfinding.getAirNavigator();

    if (!airNavigator) throw new Error('AirNavigator not initialized');

    if (this.state.currentPath) {
      console.log(
        'PathfindingUnitModule: Already moving, shortening path to current waypoint'
      );
      this.abortMovement();
      return false;
    }

    const path = await airNavigator.findPath(unit.getPosition(), target, [
      unit.modules.collision.getCollisionObject()
    ]);

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

  abortMovement(force?: boolean) {
    this.state.currentPath = force
      ? null
      : (this.state.currentPath?.slice(0, 1) ?? null);
  }

  isGroundMovable() {
    const unit = this.getUnit();
    return (
      unit.hasModuleType(GroundVehicleUnitModule) ||
      unit.hasModuleType(FigureUnitModule)
    );
  }

  isAirMovable() {
    const unit = this.getUnit();
    return unit.hasModuleType(HelicopterUnitModule);
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
}

// function simplifyPath(path: Vector3[], tolerance = 0.1): Vector3[] {
//   if (path.length <= 2) {
//     return path;
//   }

//   const simplifiedPath: Vector3[] = [path[0]!.clone()];
//   let horizontalSimplificationStarted = false;
//   let lastHorizontalDirection: Vector3 | null = null;

//   for (let i = 1; i < path.length - 1; i++) {
//     const p_prev = path[i - 1]!;
//     const p_curr = path[i]!;
//     const p_next = path[i + 1]!;

//     const isVerticalMove = Math.abs(p_curr.y - p_next.y) > 0.01;

//     if (!horizontalSimplificationStarted) {
//       simplifiedPath.push(p_curr.clone());
//       if (!isVerticalMove) {
//         horizontalSimplificationStarted = true;
//       }
//     } else {
//       if (!lastHorizontalDirection) {
//         const p_prev_xz = p_prev.clone();
//         p_prev_xz.y = 0;
//         const p_curr_xz = p_curr.clone();
//         p_curr_xz.y = 0;
//         lastHorizontalDirection = new Vector3()
//           .subVectors(p_curr_xz, p_prev_xz)
//           .normalize();
//       }

//       const p_curr_xz = p_curr.clone();
//       p_curr_xz.y = 0;
//       const p_next_xz = p_next.clone();
//       p_next_xz.y = 0;
//       const currentHorizontalDirection = new Vector3()
//         .subVectors(p_next_xz, p_curr_xz)
//         .normalize();

//       if (
//         lastHorizontalDirection.dot(currentHorizontalDirection) <
//         1.0 - tolerance
//       ) {
//         simplifiedPath.push(p_curr.clone());
//         lastHorizontalDirection.copy(currentHorizontalDirection);
//       }
//     }
//   }

//   simplifiedPath.push(path[path.length - 1]!.clone());

//   return simplifiedPath;
// }
