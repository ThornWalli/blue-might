/* eslint-disable complexity */
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import GroundVehicleUnitModule from './moveable/GroundVehicle';
import HelicopterUnitModule from './moveable/Helicopter';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { Subject } from 'rxjs';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import FigureUnitModule from './moveable/Figure';

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

type Options = UnitModuleOptions;
interface State extends UnitModuleState {
  currentPath: Vector3[] | null;
}

export default class PathfindingUnitModule extends UnitModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'pathfinding';

  debugPathLine?: Line;

  constructor(unit: Unit, options: Options, state: State, debug: boolean) {
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

  override isForceUpdate() {
    return this.state.currentPath !== null;
  }

  private moveAirVehicle(unit: Unit, target: Vector3) {
    const airNavigator = unit.getMap()?.modules.pathfinding.getAirNavigator();

    if (!airNavigator) throw new Error('AirNavigator not initialized');

    const path = airNavigator.findPath(unit.getPosition(), target);

    if (path) return;

    this.state.currentPath = path;
  }

  private async moveGroundVehicle(unit: Unit, target: Vector3) {
    const groundNavigator = unit
      .getMap()
      ?.modules.pathfinding.getGroundNavigatorForUnit(unit); // Neu: Passendes Grid wählen

    if (!groundNavigator) throw new Error('GroundNavigator not initialized');

    if (this.state.currentPath) {
      console.log(
        'PathfindingUnitModule: Already moving, shortening path to current waypoint'
      );
      this.state.currentPath = this.state.currentPath.slice(0, 1);
      return false; // Bereits ein Pfad aktiv
    }

    const path = await groundNavigator.findPath(unit.getPosition(), target, [
      unit.modules.collision.getCollisionObject()
    ]);

    // console.log('Found path:', [...path]);
    // path[0] = unit.getPosition().clone(); // Startpunkt an aktuelle Position anpassen
    // path[path.length - 1] = target.clone(); // Endpunkt an Zielposition anpassen
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

  override update({ delta }: AnimationLoopValue): void {
    const currentPath = this.state.currentPath;
    if (!currentPath || currentPath.length === 0) {
      const gvNone = this.getUnit().getModule<GroundVehicleUnitModule>(
        GroundVehicleUnitModule.TYPE
      );
      gvNone?.clearAutopilotControls();
      return;
    }

    const target = currentPath[0]!;
    const unit = this.getUnit();

    const gv = unit.getModule<GroundVehicleUnitModule>(
      GroundVehicleUnitModule.TYPE
    );
    const fig = unit.getModule<FigureUnitModule>(FigureUnitModule.TYPE);
    if (gv) {
      const pos = unit.getPosition();
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;

      // Vorwärtsrichtung = +Z
      const desiredYaw = Math.atan2(dx, dz);
      const currentYaw = unit.getYaw();

      let diff = desiredYaw - currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const dist = Math.hypot(dx, dz);

      const yawDeadzone = 0.03;
      const stopDist = 0.08;

      const turnLeft = diff > yawDeadzone;
      const turnRight = diff < -yawDeadzone;

      // WICHTIG: vorwärts fahren, solange wir nicht quasi am Wegpunkt sind
      const goForward = dist > stopDist;

      gv.setAutopilotControls({
        up: goForward || turnLeft || turnRight, // fahre auch während des Drehens
        down: false,
        left: turnLeft,
        right: turnRight,
        space: false
      });

      // Kickstart, falls wir trotz up nicht ins Rollen kommen
      const velLenSq = gv.getVelocity().lengthSq();
      if (velLenSq < 1e-6 && (goForward || turnLeft || turnRight)) {
        const forward = unit.getForwardXZFromYaw(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new (unit.getPosition().constructor as any)(0, 0, 0)
        );
        // kleiner Initial-Impuls; eigentliche Beschleunigung macht moveUpdate
        gv.getVelocity().addScaledVector(forward, 0.01);
      }
    } else if (fig) {
      // Neue Logik für Figuren: Ähnlich wie Fahrzeuge, aber ohne Kickstart (Figuren beschleunigen selbst)
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
      const stopDist = 0.08;

      const turnLeft = diff > yawDeadzone;
      const turnRight = diff < -yawDeadzone;
      const goForward = dist > stopDist;

      fig.setAutopilotControls({
        up: goForward || turnLeft || turnRight,
        down: false,
        left: turnLeft,
        right: turnRight,
        space: false
      });
    } else {
      // Air vehicles bewegen wir weiterhin per Lerp
      const step = 4 * delta;
      const position = unit.getPosition();
      position.lerp(target, step);
      unit.setPosition(position);
    }

    // Wegpunkt entfernen, wenn erreicht
    const posNow = unit.getPosition();
    const _distance = posNow.distanceTo(target); // Vollständige Distanz (für Logs/Debug)
    const horizontalDistance = Math.hypot(
      target.x - posNow.x,
      target.z - posNow.z
    ); // Nur x/z

    // Verwende horizontale Distanz für unebenes Terrain
    if (horizontalDistance < 0.1 || this.lastTargetDistanceCounter >= 100) {
      this.lastTargetDistanceCounter = 0;
      currentPath.shift();
      if (currentPath.length === 0) {
        const gv2 = unit.getModule<GroundVehicleUnitModule>(
          GroundVehicleUnitModule.TYPE
        );
        const fig2 = unit.getModule<FigureUnitModule>(FigureUnitModule.TYPE);
        gv2?.clearAutopilotControls();
        fig2?.clearAutopilotControls();
        this.state.currentPath = null;
        this.observables.moveComplete$.next();
      }
    }

    // Prüfe auf Stagnation (keine horizontale Bewegung)
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

  private lastTargetDistance?: number;
  private lastTargetDistanceCounter = 0;

  //#region debug

  private removeDebugPathLine() {
    if (this.debugPathLine) {
      disposeObject3D(this.debugPathLine);
      this.debugPathLine = undefined;
    }
  }
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
      unit.getMap()?.app.renderer.scene.add(this.debugPathLine);
    } else {
      this.debugPathLine.geometry.setFromPoints(
        path.map(p => new Vector3(p.x, p.y + 0.1, p.z))
      );
      if (this.debugPathLine.geometry.attributes.position) {
        this.debugPathLine.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  //#endregion
}
