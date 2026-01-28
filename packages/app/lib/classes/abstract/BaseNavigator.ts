import EasyStar from 'easystarjs';
import {
  Box3,
  InstancedMesh,
  MeshLambertMaterial,
  Vector3,
  Object3D,
  BoxGeometry,
  Matrix4,
  Sphere,
  Vector2
} from 'three';
import { Subscription } from 'rxjs';

import type Map from '../Map';
import Grid, { type GridNode } from '../pathfinding/Grid';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import {
  TILE_TYPE,
  TILE_INDEX,
  getTileCosts,
  type TileCostsType
} from '../../utils/pathfinding';
import { COLLISION_TYPE } from '../unitModule/Collision';

export default abstract class BaseNavigator {
  public debug = false;
  private subscription = new Subscription();
  public map: Map;
  colliders: Object3D[];
  private gridSize: number;
  private grid!: Grid;
  private size: Vector2;
  private occupiedByObject = new globalThis.Map<
    Object3D,
    { x: number; z: number }[]
  >();
  protected useSphere: boolean;
  protected sphere = new Sphere(undefined, 1);
  protected box = new Box3();
  private tileCostsType: TileCostsType = 'ground';
  constructor(
    map: Map,
    colliders: Object3D[],
    options: {
      tileCostsType?: TileCostsType;
      gridSize: number;
      size: Vector2;
      sphere: boolean;
    },
    debug = false
  ) {
    this.size = options.size ?? new Vector2(32, 32);

    this.debug = debug;
    this.map = map;
    this.colliders = colliders;

    this.gridSize = options.gridSize ?? 2;
    this.useSphere = options.sphere ?? false;

    this.tileCostsType = options.tileCostsType ?? 'ground';
  }

  setup() {
    this.grid = new Grid(
      this.size.clone().divideScalar(this.gridSize).round(),
      this.gridSize,
      (options, debug) => this.isWalkable(options, debug),
      node => {
        if (node.walkable.value) {
          if (node.walkable.collisionType === COLLISION_TYPE.SOFT) {
            return TILE_TYPE.SOFT;
          }
          const tileType = this.getTileTypeAtNode(node);
          if (!tileType) {
            throw new Error('Tile type not found');
          }
          return tileType;
        } else {
          return TILE_TYPE.BLOCKED;
        }
      }
    );
    this.grid.setup();
  }

  destroy() {
    this.subscription.unsubscribe();
    if (this.debugGridMeshes) {
      Object.values(this.debugGridMeshes).forEach(
        object => object && disposeObject3D(object)
      );
    }
  }

  getGridSize() {
    return this.gridSize;
  }

  addColliders(collider: Object3D[]) {
    this.colliders.push(...collider);
    collider.forEach(obj => this.updateWalkabilityAroundObject(obj));
  }

  getGrid() {
    return this.grid;
  }

  setColliders(colliders: Object3D[]) {
    this.colliders = [...colliders];
    this.grid.update();
  }

  update() {
    this.grid.update();
  }

  // Abstrakte Methoden für spezifische Logik
  protected abstract getTileTypeAtNode(node: GridNode): TILE_TYPE | undefined;
  protected abstract getHeightAt(x: number, z: number): number;
  protected abstract isWalkableExtra(
    pos: Vector3,
    excludeObjects: Object3D[]
  ): { value: boolean; collisionType: COLLISION_TYPE };

  isWalkable(
    {
      grid,
      x,
      y,
      excludeObjects
    }: { grid: Grid; x: number; y: number; excludeObjects: Object3D[] },
    debug = false
  ) {
    const pos = this.toWorldPosition(x, y, grid);
    let walkable = pos.y > this.map.modules.surface.getSeaLevel();
    let collisionType = COLLISION_TYPE.NONE;

    // Basis-Kollisionsprüfung
    for (const collider of this.colliders) {
      if (excludeObjects.includes(collider)) continue;
      if (collider.userData[OBJECT_USER_DATA.IGNORE_PATHFINDING]) continue;

      collisionType =
        collider.userData[OBJECT_USER_DATA.COLLISION_TYPE] ?? collisionType;
      const box = this.box.setFromObject(collider);
      if (this.useSphere) {
        this.sphere.center.copy(pos);
        if (box.intersectsSphere(this.sphere)) {
          walkable = false;
          break;
        }
      } else {
        const colliderSize = box.getSize(new Vector3());
        const buffer = Math.max(colliderSize.x, colliderSize.z) / 4;
        const expandedBox = box.clone().expandByScalar(buffer);
        if (expandedBox.containsPoint(pos)) {
          walkable = false;
          break;
        }
      }
    }

    // Spezifische Erweiterung (z.B. für Luft)
    const extra = this.isWalkableExtra(pos, excludeObjects);
    walkable = walkable && extra.value;
    collisionType = extra.collisionType || collisionType;

    if (debug && this.debugState.checkDebugMeshes) {
      const MAX_DEBUG = Math.max(1000, this.getGrid().getNodes().length);
      if (this.debugState.isWalkableChecks.length < MAX_DEBUG) {
        this.debugState.isWalkableChecks.push({ pos, walkable });
      }
    }

    return { value: walkable, collisionType };
  }

  updateWalkabilityAroundObject(object: Object3D) {
    const previous = this.occupiedByObject.get(object) || [];
    const cells = this.getCellsAroundObject(object);
    const previousNodes = this.getNodeFromCells(previous);
    const newNodes = this.getNodeFromCells(cells);

    if (previousNodes.length > 0) {
      this.grid.update(previousNodes, [object]);
    }

    if (newNodes.length > 0) {
      this.grid.update(newNodes);
    }

    this.occupiedByObject.set(object, cells);

    if (this.debug) {
      this.updateDebugGridObjects([...previousNodes, ...newNodes]);
    }
  }

  getCellsAroundObject(object: Object3D, box: Box3 = new Box3()) {
    const aabb = box.setFromObject(object);
    if (this.useSphere) {
      aabb.expandByScalar(this.sphere.radius);
    } else {
      const colliderSize = aabb.getSize(new Vector3());
      const buffer = Math.max(colliderSize.x, colliderSize.z) / 4;
      aabb.expandByScalar(buffer);
    }
    const cells = this.worldToGridCellsInAABB(aabb);
    return Array.from(new Set([...cells]));
  }

  getNodeFromCells(cells: { x: number; z: number }[]) {
    return cells.map(cell => this.grid.getNode(cell.x, cell.z));
  }
  getNodesAroundObject(object: Object3D, box: Box3 = new Box3()) {
    return this.getNodeFromCells(this.getCellsAroundObject(object, box));
  }

  // private isCellOccupiedByOthers(x: number, z: number, self: Object3D) {
  //   for (const [obj, cells] of this.occupiedByObject.entries()) {
  //     if (obj === self) continue;
  //     if (cells.some(c => c.x === x && c.z === z)) return true;
  //   }
  //   return false;
  // }

  worldToGridCellsInAABB(aabb: Box3) {
    const minX = Math.floor(
      (aabb.min.x + (this.grid.width * this.gridSize) / 2) / this.gridSize
    );
    const maxX = Math.floor(
      (aabb.max.x + (this.grid.width * this.gridSize) / 2) / this.gridSize
    );
    const minZ = Math.floor(
      (aabb.min.z + (this.grid.height * this.gridSize) / 2) / this.gridSize
    );
    const maxZ = Math.floor(
      (aabb.max.z + (this.grid.height * this.gridSize) / 2) / this.gridSize
    );

    const cells: { x: number; z: number }[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (x >= 0 && x < this.grid.width && z >= 0 && z < this.grid.height) {
          cells.push({ x, z });
        }
      }
    }
    return cells;
  }

  async findPath(
    start: Vector3,
    end: Vector3,
    excludeObjects?: Object3D[]
  ): Promise<Vector3[]> {
    let affectedNodes: GridNode[] | undefined;

    if (excludeObjects?.length) {
      const tmpBox = new Box3();
      affectedNodes = excludeObjects
        .map(excludeObject => this.getNodesAroundObject(excludeObject, tmpBox))
        .flat();

      this.grid.update(affectedNodes, excludeObjects);
    }

    try {
      const s = this.toNodePosition(start.x, start.z)!;
      const e = this.toNodePosition(end.x, end.z)!;

      const startNode = this.grid.getNode(s.x, s.y);
      startNode.walkable = {
        value: true,
        collisionType: COLLISION_TYPE.NONE
      };

      const paths = await new Promise<{ x: number; y: number }[]>(resolve => {
        const easystar = createEasyStarInstance(this.tileCostsType);
        easystar.setGrid(this.grid.toMatrix());
        easystar.findPath(s.x, s.y, e.x, e.y, path => resolve(path || []));
        easystar.calculate();
      });

      let waypoints = paths.map(n => {
        const p = this.grid.toWorld(n.x, n.y);
        return new Vector3(
          Math.round(p.x * 1000) / 1000,
          this.getHeightAt(p.x, p.y),
          Math.round(p.y * 1000) / 1000
        );
      });

      waypoints = waypoints.filter((point, index, arr) => {
        if (index === 0) return true;
        const prev = arr[index - 1]!;
        const dist = Math.hypot(point.x - prev.x, point.z - prev.z);
        return dist > 0.01;
      });

      return waypoints;
    } finally {
      if (excludeObjects?.length) {
        this.grid.update(affectedNodes);
      }
    }
  }

  //#region Debug

  debugState: {
    isWalkableChecks: { pos: Vector3; walkable: boolean }[];
    checkDebugMeshes?: { valid: InstancedMesh; invalid: InstancedMesh };
  } = {
    isWalkableChecks: [],
    checkDebugMeshes: undefined
  };

  debugGridMeshes?: {
    valid: InstancedMesh;
    invalid: InstancedMesh;
    [key: string]: InstancedMesh;
  };
  debugMaterials = {
    valid: new MeshLambertMaterial({ color: 0x00ff00 }),
    invalid: new MeshLambertMaterial({ color: 0xff0000 }),
    walkableValid: new MeshLambertMaterial({ color: 0x0000ff }),
    walkableInvalid: new MeshLambertMaterial({ color: 0xff00ff })
  };
  debugGeometrySize = 0.1;
  debugGridGeometry = new BoxGeometry(
    this.debugGeometrySize,
    this.debugGeometrySize,
    this.debugGeometrySize
  );

  // #region Debug Objects

  setupDebugGridObjects(
    maxInstances = this.getGrid().getNodes().length || 1000
  ) {
    this.debugGridMeshes = {
      valid: new InstancedMesh(
        this.debugGridGeometry,
        new MeshLambertMaterial({ color: 0x00ff00 }),
        maxInstances
      ),
      invalid: new InstancedMesh(
        this.debugGridGeometry,
        new MeshLambertMaterial({ color: 0xff0000 }),
        maxInstances
      )
    };

    Object.values(this.debugGridMeshes).forEach(mesh => {
      this.map.app.getScene().add(mesh);
    });

    // initial invisible
    const empty = new Matrix4();
    for (let i = 0; i < maxInstances; i++) {
      this.debugGridMeshes.valid.setMatrixAt(i, empty);
      this.debugGridMeshes.invalid.setMatrixAt(i, empty);
    }

    Object.values(this.debugGridMeshes).forEach(mesh => {
      mesh.instanceMatrix.needsUpdate = true;
    });

    this.updateDebugGridObjects();
  }

  updateDebugGridObjects(nodes: GridNode[] = this.getGrid()?.getNodes() ?? []) {
    const positions = this.getDebugPositions(nodes);
    // this.lastNodes = [
    //   ...nodes.map(n => ({
    //     ...n,
    //     walkable: {
    //       value: false,
    //       collisionType: COLLISION_TYPE.NONE
    //     }
    //   }))
    // ];

    const empty = new Matrix4();
    const helper = new Object3D();
    positions.forEach(({ walkable, position, index }) => {
      helper.updateMatrix();
      helper.matrix.makeTranslation(position.x, position.y, position.z);
      if (walkable) {
        this.debugGridMeshes?.valid.setMatrixAt(index, helper.matrix);
        this.debugGridMeshes?.invalid.setMatrixAt(index, empty);
      } else {
        this.debugGridMeshes?.invalid.setMatrixAt(index, helper.matrix);
        this.debugGridMeshes?.valid.setMatrixAt(index, empty);
      }
    });

    Object.values(this.debugGridMeshes ?? []).forEach(mesh => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  //#endregion

  toWorldPosition(nodeX: number, nodeY: number, grid?: Grid) {
    const worldPosition = (grid || this.grid).toWorld(nodeX, nodeY);
    const x = worldPosition.x;
    const z = worldPosition.y;
    const y = this.map.modules.surface.getSurfaceHeightAt(x, z);
    return new Vector3(x, y, z);
  }

  toNodePosition(worldX: number, worldZ: number) {
    const gx = Math.floor(
      (worldX + (this.grid.width * this.gridSize) / 2) / this.gridSize
    );
    const gz = Math.floor(
      (worldZ + (this.grid.height * this.gridSize) / 2) / this.gridSize
    );
    return { x: gx, y: gz };
  }

  worldToNode(x: number, z: number) {
    const gx = Math.floor(
      (x + (this.grid.width * this.gridSize) / 2) / this.gridSize
    );
    const gy = Math.floor(
      (z + (this.grid.height * this.gridSize) / 2) / this.gridSize
    );
    return this.grid.getNodes()[this.grid.index(gx, gy)];
  }

  getDebugPositions(nodes: GridNode[]) {
    return nodes.map(node => {
      const position = this.toWorldPosition(node.x, node.y);
      return { walkable: node.walkable.value, index: node.index, position };
    });
  }
  //#endregion
}

function createEasyStarInstance(tileCostType: TileCostsType) {
  const easystar = new EasyStar.js();
  easystar.enableDiagonals();
  easystar.enableCornerCutting();

  const validTypes = Object.values(TILE_INDEX).slice(1) as number[];

  easystar.setAcceptableTiles(validTypes);

  validTypes.forEach(tileType => {
    easystar.setTileCost(tileType, getTileCost(tileCostType, tileType));
  });

  return easystar;
}

export function getTileCost(tileCostType: TileCostsType, tileType: TILE_TYPE) {
  return getTileCosts(tileCostType)[tileType] as number;
}
