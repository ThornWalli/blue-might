import Grid, { type GridNode } from './Grid';
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
import type Map from '../Map';
import { debounceTime, Subscription } from 'rxjs';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import { TILE_TYPE, TILE_COSTS, TILE_INDEX } from '../../utils/pathfinding';
import { COLLISION_TYPE } from '../unitModule/Collision';

export default class GroundNavigator {
  debug = false;
  private subscription = new Subscription();
  private map: Map;
  private colliders: Object3D[];
  private gridSize: number;
  private grid: Grid;

  addCollider(collider: Object3D) {
    this.colliders.push(collider);
    this.updateWalkabilityAroundObject(collider);
  }
  private useSphere: boolean;
  private sphere = new Sphere(undefined, 1 / 2);
  private box = new Box3();
  lastDebugGridPositions?: {
    valids: Vector3[];
    invalids: Vector3[];
  };
  private occupiedByObject = new globalThis.Map<
    Object3D,
    { x: number; z: number }[]
  >();

  getGridSize() {
    return this.gridSize;
  }

  constructor(
    map: Map,
    colliders: Object3D[],
    options: { gridSize: number; size: Vector2; sphere: boolean },
    debug = false
  ) {
    const size = options.size ?? new Vector2(32, 32);

    this.debug = debug;
    this.map = map;
    this.colliders = colliders;

    this.gridSize = options.gridSize ?? 2;
    this.useSphere = options.sphere ?? false;

    this.grid = new Grid(
      size.divideScalar(this.gridSize).floor(),
      this.gridSize,
      (options, debug) => this.isWalkable(options, debug),
      node => {
        if (node.walkable.value) {
          if (node.walkable.collisionType === COLLISION_TYPE.SOFT) {
            return TILE_TYPE.SOFT;
          }
          return this.getTileTypeAtNode(node) ?? TILE_TYPE.GRASS;
        } else {
          return TILE_TYPE.BLOCKED;
        }
      }
    );

    if (this.debug) {
      this.subscription.add(
        this.grid.observables.update$.pipe(debounceTime(50)).subscribe(() => {
          this.updateDebugGridObjects();
        })
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).groundNav = this; // Debug-Zwecke
  }

  destroy() {
    this.subscription.unsubscribe();
    if (this.debugGridMeshes) {
      Object.values(this.debugGridMeshes).forEach(
        object => object && disposeObject3D(object)
      );
    }
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
    let walkable = pos.y > this.map.modules.ground.getSeaLevel();

    // Sphere-Prüfung für realistischen Puffer
    this.sphere.center.copy(pos);
    // this.sphere.radius = this.gridSize / 2;

    let collisionType = COLLISION_TYPE.NONE;

    for (const collider of this.colliders) {
      if (excludeObjects.includes(collider)) continue; // Eigene Unit ignorieren
      if (collider.userData[OBJECT_USER_DATA.IGNORE_PATHFINDING]) continue; // Zusätzliche Ignorier-Option

      collisionType =
        collider.userData[OBJECT_USER_DATA.COLLISION_TYPE] ?? collisionType;

      const box = this.box.setFromObject(collider);
      if (this.useSphere) {
        // Sphere-Prüfung
        this.sphere.center.copy(pos);
        if (box.intersectsSphere(this.sphere)) {
          walkable = false;
          break;
        }
      } else {
        const colliderSize = box.getSize(new Vector3());
        const buffer = Math.max(colliderSize.x, colliderSize.z) / 4; // Puffer = halbe max-Größe
        const expandedBox = box.clone().expandByScalar(buffer);
        if (expandedBox.containsPoint(pos)) {
          walkable = false;
          break;
        }
      }
    }

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

    const aabb = new Box3().setFromObject(object);
    if (this.useSphere) {
      aabb.expandByScalar(this.sphere.radius);
    } else {
      const colliderSize = aabb.getSize(new Vector3());
      const buffer = Math.max(colliderSize.x, colliderSize.z) / 4;
      aabb.expandByScalar(buffer);
    }
    const cells = this.worldToGridCellsInAABB(aabb);
    const allCells = new Set([...previous, ...cells]);
    const nodes = Array.from(allCells).map(cell =>
      this.grid.getNode(cell.x, cell.z)
    );
    this.grid.update(nodes);

    this.occupiedByObject.set(object, cells);
  }

  getNodesAroundObject(object: Object3D, box: Box3 = new Box3()) {
    const aabb = box.setFromObject(object);
    if (this.useSphere) {
      aabb.expandByScalar(this.sphere.radius);
    } else {
      const colliderSize = aabb.getSize(new Vector3());
      const buffer = Math.max(colliderSize.x, colliderSize.z) / 4; // Gleicher buffer
      aabb.expandByScalar(buffer);
    }
    const cells = this.worldToGridCellsInAABB(aabb);

    // Alle betroffenen Zellen sammeln
    const allCells = new Set([...cells]);
    const nodes = Array.from(allCells).map(cell =>
      this.grid.getNode(cell.x, cell.z)
    );
    return nodes;
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
      console.log(affectedNodes);
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
        const easystar = createEasyStarInstance();
        easystar.setGrid(this.grid.toMatrix());
        easystar.findPath(s.x, s.y, e.x, e.y, path => resolve(path || []));
        easystar.calculate();
      });

      let waypoints = paths.map(n => {
        const p = this.grid.toWorld(n.x, n.y);
        return new Vector3(
          Math.round(p.x * 1000) / 1000,
          this.map.modules.ground.getSurfaceHeightAt(p.x, p.y),
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

  private debugState: {
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
      this.map.app.renderer.scene.add(mesh);
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

  updateDebugGridObjects() {
    const { valids, invalids } = this.getDebugPositions();
    this.lastDebugGridPositions = { valids, invalids };

    const helper = new Object3D();
    valids.forEach((position: Vector3, index: number) => {
      helper.updateMatrix();
      helper.matrix.makeTranslation(position.x, position.y, position.z);
      this.debugGridMeshes?.valid.setMatrixAt(index, helper.matrix);
    });

    invalids.forEach((position: Vector3, index: number) => {
      helper.updateMatrix();
      helper.matrix.makeTranslation(position.x, position.y, position.z);
      this.debugGridMeshes?.invalid.setMatrixAt(index, helper.matrix);
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
    const y = this.map.modules.ground.getSurfaceHeightAt(x, z);

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
    const gx = Math.floor(x / this.gridSize);
    const gy = Math.floor(z / this.gridSize);
    return this.grid.getNodes()[this.grid.index(gx, gy)];
  }

  getTileTypeAtNode(node: GridNode) {
    return this.map.modules.ground.pathfinderTileTypes[node.y]?.[node.x];
  }

  getDebugPositions() {
    return this.getGrid()
      ?.getNodes()
      .reduce(
        (
          {
            valids,
            invalids
          }: {
            valids: Vector3[];
            invalids: Vector3[];
          },
          node
        ) => {
          const pos = this.toWorldPosition(node.x, node.y);

          if (node.walkable.value) {
            valids.push(pos);
          } else {
            invalids.push(pos);
          }
          return { valids, invalids };
        },
        { valids: [], invalids: [] }
      );
  }
  //#endregion
}

function createEasyStarInstance() {
  const easystar = new EasyStar.js();
  easystar.enableDiagonals();
  easystar.enableCornerCutting();

  const validTypes = Object.values(TILE_INDEX).slice(1) as number[];

  easystar.setAcceptableTiles(validTypes);

  validTypes.forEach(tileType => {
    easystar.setTileCost(tileType, getTileCost(tileType));
  });

  return easystar;
}

export function getTileCost(type: TILE_TYPE) {
  return TILE_COSTS[type] as number;
}
