import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Object3D,
  Vector2,
  Vector3
} from 'three';
import { filter, throttleTime, type Subscription } from 'rxjs';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import GroundNavigator from '../pathfinding/GroundNavigator';
import AirNavigator, { VehicleType } from '../pathfinding/AirNavigator';
import type Unit from '../Unit';
import SeaNavigator from '../pathfinding/SeaNavigator';
import {
  isAirVehicle,
  isBuilding,
  isGroundVehicle,
  isSeaVehicle
} from '../../utils/unit';
import type { GridNode } from '../pathfinding/Grid';
import Grid from '../pathfinding/Grid';
import { TILE_TYPE, TILE_TYPES, type TileType } from '../../utils/pathfinding';
import type BaseNavigator from '../abstract/BaseNavigator';
import { disposeObject3D } from '../../utils/object';

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
  readonly debugNavigatorType: NAVIGATOR_TYPE | null =
    NAVIGATOR_TYPE.GROUND_SMALL;
  override state: State = {};
  private units: Unit[] = [];
  private unitSubscriptions = new Map<Unit, Subscription>();
  private collidersByType = new Map<NAVIGATOR_TYPE, Object3D[]>();
  private grid: Grid | null = null;

  //#region navigators
  private groundNavigationSmall: GroundNavigator | null = null;
  private groundNavigationLarge: GroundNavigator | null = null;
  private airNavigation: AirNavigator | null = null;
  private seaNavigation: SeaNavigator | null = null;
  //#endregion

  private debugObject: Object3D | null = null;

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
  ): GroundNavigator | AirNavigator | SeaNavigator | BaseNavigator {
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

    // Erstelle gemeinsames Grid mit niedriger Grid-Size (1/3)
    const gridSize = 1 / 3;
    const size = new Vector2(
      this.map.modules.surface.state.terrainWidth,
      this.map.modules.surface.state.terrainHeight
    );
    const tileTypeMap = this.map.modules.surface.getPathfinderTileTypes();

    this.grid = new Grid(
      size.clone().divideScalar(gridSize).round(),
      gridSize,
      (x, y) => {
        const type = tileTypeMap[y]?.[x] ?? TILE_TYPE.BLOCKED;
        return type;
      }
    );
    console.log('GRID', this.grid);
    await this.grid.setup();
    if (this.debug) {
      await this.setupDebugGridObjects();
    }

    // Erstelle Navigators mit gemeinsamem Grid
    this.groundNavigationSmall = new GroundNavigator(
      NAVIGATOR_TYPE.GROUND_SMALL,
      this.map,
      this.grid,
      {
        gridSize,
        size
      },
      this.debug
    );

    this.groundNavigationLarge = new GroundNavigator(
      NAVIGATOR_TYPE.GROUND_LARGE,
      this.map,
      this.grid,
      {
        gridSize,
        size
      },
      this.debug
    );

    this.airNavigation = new AirNavigator(
      this.map,
      this.grid,
      {
        gridSize,
        size,
        vehicleType: VehicleType.HELICOPTER,
        flightHeight: 4 / 3,
        runways: []
      },
      this.debug
    );

    this.seaNavigation = new SeaNavigator(
      NAVIGATOR_TYPE.SEA,
      this.map,
      this.grid,
      {
        gridSize,
        size
      },
      this.debug
    );

    // Setup für alle Navigators (ohne Grid-Setup)
    await Promise.all([
      this.groundNavigationSmall.setup(),
      this.groundNavigationLarge.setup(),
      this.airNavigation.setup(),
      this.seaNavigation.setup()
    ]);
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

    if (this.debugGridMeshes) {
      Object.values(this.debugGridMeshes).forEach(
        object => object && disposeObject3D(object)
      );
    }

    super.destroy();
  }

  getNavigatorType(unit: Unit): NAVIGATOR_TYPE {
    if (isSeaVehicle(unit)) {
      return NAVIGATOR_TYPE.SEA;
    } else if (isAirVehicle(unit)) {
      return NAVIGATOR_TYPE.AIR;
    } else {
      return NAVIGATOR_TYPE.GROUND_SMALL;
    }
  }

  private unitNodes: Map<Unit, GridNode[]> = new Map();
  getGridNodesByUnit(unit: Unit) {
    return this.unitNodes.get(unit) ?? [];
  }
  addUnit(unit: Unit) {
    if (this.units.includes(unit)) return;
    this.units.push(unit);

    this.unitNodes.set(unit, []);
    this.unitSubscriptions.set(
      unit,
      unit.observables.position$.pipe(throttleTime(1000 / 3)).subscribe(() => {
        const grid = this.grid;
        if (grid) {
          const usedNodes: Set<GridNode> = new Set();
          grid.resetNodes(this.unitNodes.get(unit) ?? []).forEach(node => {
            usedNodes.add(node);
          });

          const nodes = grid.getNodesAroundObject(
            unit.modules.collision.getDefaultCollisionObject() ?? unit.root
          );
          nodes.forEach(node => {
            grid.updateNode(node.x, node.y, getTileTypeByUnit(unit));
            usedNodes.add(node);
          });
          this.unitNodes.set(unit, nodes);

          if (this.debug) {
            this.updateDebugGridObjects(Array.from(usedNodes));
          }
        }
      })
    );
  }

  removeUnit(unit: Unit) {
    const index = this.units.indexOf(unit);
    if (index !== -1) {
      this.units.splice(index, 1);
    }

    if ((this.unitNodes.get(unit)?.length ?? 0) > 0) {
      const nodes = this.unitNodes.get(unit) ?? [];
      nodes.forEach(node => {
        this.grid?.updateNode(node.x, node.y);
      });
      if (this.debug) {
        this.updateDebugGridObjects(Array.from(nodes));
      }
    }

    const subscription = this.unitSubscriptions.get(unit);
    if (subscription) {
      subscription.unsubscribe();
      this.unitSubscriptions.delete(unit);
    }
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

  //#region debug

  private debugGeometrySize = 0.1;
  private debugGridGeometry = new BoxGeometry(
    this.debugGeometrySize,
    this.debugGeometrySize,
    this.debugGeometrySize
  );
  private debugGridMeshes: Map<TileType, InstancedMesh> = new Map();

  toWorldPosition(nodeX: number, nodeY: number) {
    const worldPosition = this.grid!.toWorldPosition(nodeX, nodeY);
    const x = worldPosition.x;
    const z = worldPosition.y;
    const y = this.map.modules.surface.getSurfaceHeightAt(x, z);
    return new Vector3(x, y, z);
  }

  getDebugPositions(nodes: GridNode[]) {
    if (!this.grid) return [];
    return nodes.map(node => {
      const position = this.toWorldPosition(node.x, node.y);
      return {
        index: node.index,
        type: node.type,
        position
      };
    });
  }

  setupDebugGridObjects(maxInstances = this.grid?.getNodes().length || 1000) {
    TILE_TYPES.forEach(type => {
      const mesh = new InstancedMesh(
        this.debugGridGeometry,
        new MeshLambertMaterial({ color: getColorByTileType(type) }),
        maxInstances
      );
      this.debugGridMeshes.set(type, mesh);
      this.map.app.getScene().add(mesh);
    });

    const meshes = Array.from(this.debugGridMeshes.values());
    const empty = new Matrix4().makeScale(0, 0, 0);

    meshes.forEach(mesh => {
      for (let i = 0; i < mesh.count; i++) {
        mesh.setMatrixAt(i, empty);
      }
    });

    this.updateDebugGridObjects();
  }

  updateDebugGridObjects(nodes: GridNode[] = this.grid?.getNodes() ?? []) {
    const debugPositions = this.getDebugPositions(nodes);

    const meshes = Array.from(this.debugGridMeshes.values());
    const empty = new Matrix4().makeScale(0, 0, 0);
    const helper = new Object3D();

    meshes.forEach(mesh => {
      debugPositions.forEach(({ index }) => {
        mesh.setMatrixAt(index, empty);
      });
    });

    debugPositions.forEach(({ type, position, index }) => {
      helper.updateMatrix();
      helper.matrix.makeTranslation(position.x, position.y, position.z);
      this.debugGridMeshes.get(type)?.setMatrixAt(index, helper.matrix);
    });

    meshes.forEach(mesh => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  //#endregion
}

function getColorByTileType(type: TILE_TYPE): number {
  switch (type) {
    case TILE_TYPE.GRASS:
      return 0x00ff00;
    case TILE_TYPE.UNIT:
    case TILE_TYPE.UNIT_GROUND:
    case TILE_TYPE.UNIT_AIR:
    case TILE_TYPE.UNIT_SEA:
    case TILE_TYPE.UNIT_BUILDING:
    case TILE_TYPE.UNIT_HIGH_BUILDING:
      return 0xff0000;
    case TILE_TYPE.BLOCKED:
      return 0xff0000;
    case TILE_TYPE.WATER:
      return 0x0000ff;
    case TILE_TYPE.BETON_ROAD:
      return 0xd9d9d9;
    default:
      return 0xffffff;
  }
}

function getTileTypeByUnit(unit: Unit): TILE_TYPE {
  const tileType = unit.getTileType();
  if (tileType !== TILE_TYPE.UNIT) {
    return tileType;
  }

  if (isBuilding(unit)) {
    return TILE_TYPE.UNIT_BUILDING;
  }
  if (isAirVehicle(unit)) {
    return TILE_TYPE.UNIT_AIR;
  }
  if (isSeaVehicle(unit)) {
    return TILE_TYPE.UNIT_SEA;
  }

  if (isGroundVehicle(unit)) {
    return TILE_TYPE.UNIT_GROUND;
  }

  return TILE_TYPE.UNIT;
}
