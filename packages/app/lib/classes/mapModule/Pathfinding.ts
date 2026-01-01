import { Box3, Vector2, Vector3, type Object3D } from 'three';
import type { Subscription } from 'rxjs';
import { filter, throttleTime } from 'rxjs';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import GroundNavigator from '../pathfinding/GroundNavigator';
import AirNavigator, { VehicleType } from '../pathfinding/AirNavigator';
import type Unit from '../Unit';

declare module '../Map' {
  interface ModuleDebug {
    pathfinding: boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends MapModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends MapModuleState {}

export default class PathfindingModule extends MapModule<State, Observables> {
  static override TYPE = 'pathfinding';
  override state: State = {};
  // private groundNavigation: GroundNavigator | null = null;
  private groundNavigationSmall: GroundNavigator | null = null;
  private groundNavigationLarge: GroundNavigator | null = null;
  private airNavigation: AirNavigator | null = null;
  private debugObject: Object3D | null = null;
  private colliders: Object3D[] = [];
  private units: Unit[] = [];
  private unitSubscriptions = new Map<Unit, Subscription>();

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.map.modules.units.observables.addUnit$
        .pipe(
          filter(unit => {
            return !!unit.modules.collision.getCollisionObject();
          })
        )
        .subscribe(unit => this.addUnit(unit))
    );

    this.subscription.add(
      this.map.modules.units.observables.removeUnit$
        .pipe(
          filter(unit => {
            return !!unit.modules.collision.getCollisionObject();
          })
        )
        .subscribe(unit => this.removeUnit(unit))
    );
  }

  override async afterSetup() {
    await super.afterSetup();

    this.groundNavigationSmall = new GroundNavigator(
      this.map,
      this.colliders.slice(),
      {
        gridSize: 1 / 3,
        size: new Vector2(
          this.map.modules.ground.state.terrainWidth,
          this.map.modules.ground.state.terrainHeight
        ),
        sphere: false
      },
      this.debug
    );

    this.groundNavigationLarge = new GroundNavigator(
      this.map,
      this.colliders.slice(),
      {
        gridSize: 1 / 3,
        size: new Vector2(
          this.map.modules.ground.state.terrainWidth,
          this.map.modules.ground.state.terrainHeight
        ),
        sphere: true
      },
      this.debug
    );

    this.airNavigation = new AirNavigator(
      this.map,
      this.colliders.slice(),
      VehicleType.HELICOPTER,
      4 / 3,
      [],
      {
        gridSize: 1 / 3,
        size: new Vector2(
          this.map.modules.ground.state.terrainWidth,
          this.map.modules.ground.state.terrainHeight
        ),
        sphere: true
      },
      this.debug
    );

    await Promise.all([
      this.groundNavigationSmall.setup(),
      this.groundNavigationLarge.setup(),
      this.airNavigation.setup()
    ]);

    if (this.debug) {
      this.groundNavigationLarge.setupDebugGridObjects();
    }

    this.groundNavigationSmall.getGrid().update();
    this.groundNavigationLarge.getGrid().update();
    this.airNavigation.getGrid().update();
  }

  getGroundNavigatorForUnit(unit: Unit): GroundNavigator {
    const collisionObject = unit.modules.collision.getCollisionObject();
    const size = new Box3()
      .setFromObject(collisionObject)
      .getSize(new Vector3());
    const isLarge = size.x > 1 / 2 || size.z > 1 / 2;

    return isLarge ? this.groundNavigationLarge! : this.groundNavigationSmall!;
  }

  override destroy(): void {
    super.destroy();
    this.airNavigation?.destroy();
    this.groundNavigationSmall?.destroy();
    this.groundNavigationLarge?.destroy();
    this.debugObject?.removeFromParent();
    this.debugObject?.remove();
    this.unitSubscriptions.forEach(sub => sub.unsubscribe());
  }

  addUnit(unit: Unit) {
    if (this.units.includes(unit)) return;
    const collisionModule = unit.modules.collision;
    if (collisionModule?.options.disabled) return;
    this.units.push(unit);
    this.airNavigation?.addCollider(
      unit.modules.collision.getCollisionObject()
    );
    this.groundNavigationSmall?.addCollider(
      unit.modules.collision.getCollisionObject()
    );
    this.groundNavigationLarge?.addCollider(
      unit.modules.collision.getCollisionObject()
    );
    this.unitSubscriptions.set(
      unit,
      unit.observables.position$.pipe(throttleTime(250)).subscribe(() => {
        this.airNavigation?.updateWalkabilityAroundObject(unit.root);
        this.groundNavigationSmall?.updateWalkabilityAroundObject(unit.root);
        this.groundNavigationLarge?.updateWalkabilityAroundObject(unit.root);
      })
    );
  }

  removeUnit(unit: Unit) {
    if (!this.units.includes(unit)) return;
    const index = this.units.indexOf(unit);
    if (index !== -1) {
      this.units.splice(index, 1);
    }
    this.removeFromColliders(unit.modules.collision.getCollisionObject());

    const sub = this.unitSubscriptions.get(unit);
    if (sub) {
      sub.unsubscribe();
      this.unitSubscriptions.delete(unit);
    }
  }

  private addToColliders(object: Object3D) {
    this.colliders.push(object);
    this.airNavigation?.setColliders(this.colliders);
    this.groundNavigationSmall?.setColliders(this.colliders);
    this.groundNavigationLarge?.setColliders(this.colliders);
  }

  private removeFromColliders(object: Object3D) {
    const index = this.colliders.indexOf(object);
    if (index !== -1) {
      this.colliders.splice(index, 1);
    }
    this.airNavigation?.setColliders(this.colliders);
    this.groundNavigationSmall?.setColliders(this.colliders);
    this.groundNavigationLarge?.setColliders(this.colliders);
  }

  getAirNavigator() {
    if (!this.airNavigation) throw new Error('AirNavigator not initialized');
    return this.airNavigation;
  }

  getGroundNavigatorSmall() {
    if (!this.groundNavigationSmall)
      throw new Error('GroundNavigator not initialized');
    return this.groundNavigationSmall;
  }

  getGroundNavigatorLarge() {
    if (!this.groundNavigationLarge)
      throw new Error('GroundNavigator not initialized');
    return this.groundNavigationLarge;
  }
}
