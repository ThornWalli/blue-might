import { Vector2, type Object3D } from 'three';
import type { Subscription } from 'rxjs';
import { filter, throttleTime } from 'rxjs';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import GroundNavigator from '../pathfinding/GroundNavigator';
import AirNavigator, { VehicleType } from '../pathfinding/AirNavigator';
import type Unit from '../Unit';
import SeaNavigator from '../pathfinding/SeaNavigator';
import { isAirVehicle, isSeaVehicle, isUnitDestroyed } from '../../utils/unit';

declare module '../Map' {
  interface ModuleDebug {
    pathfinding: boolean;
  }
}

export enum NAVIGATOR_TYPE {
  GROUND_LARGE = 'groundLarge',
  GROUND_SMALL = 'groundSmall',
  AIR = 'air',
  SEA = 'sea'
}

export const DEFAULT_NAVIGATOR_TYPE = NAVIGATOR_TYPE.GROUND_LARGE;

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
  private seaNavigation: SeaNavigator | null = null;
  private debugObject: Object3D | null = null;
  private colliders: Object3D[] = [];
  private units: Unit[] = [];
  private unitSubscriptions = new Map<Unit, Subscription>();

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.map.modules.units.observables.addUnit$
        .pipe(
          filter(
            unit => unit.modules.collision.getCollisionObjects().length > 0
          )
        )
        .subscribe(unit => this.addUnit(unit))
    );

    this.subscription.add(
      this.map.modules.units.observables.removeUnit$
        .pipe(
          filter(
            unit => unit.modules.collision.getCollisionObjects().length > 0
          )
        )
        .subscribe(unit => this.removeUnit(unit))
    );
  }

  getNavigator(
    type: NAVIGATOR_TYPE
  ): GroundNavigator | AirNavigator | SeaNavigator {
    switch (type) {
      case NAVIGATOR_TYPE.GROUND_SMALL:
        return this.groundNavigationSmall!;
      case NAVIGATOR_TYPE.AIR:
        return this.airNavigation!;
      case NAVIGATOR_TYPE.SEA:
        return this.seaNavigation!;
      case NAVIGATOR_TYPE.GROUND_LARGE:
      default:
        return this.groundNavigationLarge!;
    }
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

    this.seaNavigation = new SeaNavigator(
      this.map,
      this.colliders.slice(),
      {
        tileCostsType: 'sea',
        gridSize: 1,
        size: new Vector2(
          this.map.modules.ground.state.terrainWidth,
          this.map.modules.ground.state.terrainHeight
        ),
        sphere: true // Oder true, je nach Bedarf
      },
      this.debug
    );

    await Promise.all([
      this.groundNavigationSmall.setup(),
      this.groundNavigationLarge.setup(),
      this.airNavigation.setup(),
      this.seaNavigation.setup()
    ]);

    if (this.debug) {
      this.airNavigation.setupDebugGridObjects();
    }

    // this.groundNavigationSmall.getGrid().update();
    // this.groundNavigationLarge.getGrid().update();
    // this.airNavigation.getGrid().update();
    // this.seaNavigation.getGrid().update();
  }

  getGroundNavigatorForUnit(unit: Unit): GroundNavigator {
    return unit.modules.pathfinding.getNavigatorType() ===
      NAVIGATOR_TYPE.GROUND_LARGE
      ? this.groundNavigationLarge!
      : this.groundNavigationSmall!;
  }

  override destroy() {
    this.airNavigation?.destroy();
    this.groundNavigationSmall?.destroy();
    this.groundNavigationLarge?.destroy();
    this.debugObject?.removeFromParent();
    this.debugObject?.remove();
    this.unitSubscriptions.forEach(sub => sub.unsubscribe());

    super.destroy();
  }

  addUnit(unit: Unit) {
    if (this.units.includes(unit)) return;
    const collisionModule = unit.modules.collision;
    if (collisionModule?.options.disabled) return;
    this.units.push(unit);

    if (isSeaVehicle(unit)) {
      this.seaNavigation?.addColliders(
        unit.modules.collision.getCollisionObjects()
      );
    } else {
      this.airNavigation?.addColliders(
        unit.modules.collision.getCollisionObjects()
      );
      this.groundNavigationSmall?.addColliders(
        unit.modules.collision.getCollisionObjects()
      );
      this.groundNavigationLarge?.addColliders(
        unit.modules.collision.getCollisionObjects()
      );
    }
    this.unitSubscriptions.set(
      unit,
      unit.observables.position$.pipe(throttleTime(1000 / 3)).subscribe(() => {
        const isDestroyed = isUnitDestroyed(unit);
        if (!isDestroyed && isSeaVehicle(unit)) {
          this.seaNavigation?.updateWalkabilityAroundObject(unit.root);
        } else if (!isDestroyed && isAirVehicle(unit)) {
          this.airNavigation?.updateWalkabilityAroundObject(unit.root);
        } else {
          this.groundNavigationSmall?.updateWalkabilityAroundObject(unit.root);
          this.groundNavigationLarge?.updateWalkabilityAroundObject(unit.root);
        }
      })
    );
  }

  removeUnit(unit: Unit) {
    if (!this.units.includes(unit)) return;
    const index = this.units.indexOf(unit);
    if (index !== -1) {
      this.units.splice(index, 1);
    }
    this.removeFromColliders(unit.modules.collision.getCollisionObjects());

    const sub = this.unitSubscriptions.get(unit);
    if (sub) {
      sub.unsubscribe();
      this.unitSubscriptions.delete(unit);
    }
  }

  // private addToColliders(object: Object3D) {
  //   this.colliders.push(object);
  //   this.airNavigation?.setColliders(this.colliders);
  //   this.seaNavigation?.setColliders(this.colliders);
  //   this.groundNavigationSmall?.setColliders(this.colliders);
  //   this.groundNavigationLarge?.setColliders(this.colliders);
  // }

  private removeFromColliders(objects: Object3D[]) {
    objects.forEach(object => {
      const index = this.colliders.indexOf(object);
      if (index !== -1) {
        this.colliders.splice(index, 1);
      }
    });
    this.airNavigation?.setColliders(this.colliders);
    this.seaNavigation?.setColliders(this.colliders);
    this.groundNavigationSmall?.setColliders(this.colliders);
    this.groundNavigationLarge?.setColliders(this.colliders);
  }

  getSeaNavigator(): SeaNavigator {
    if (!this.seaNavigation) throw new Error('SeaNavigator not initialized');
    return this.seaNavigation;
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
