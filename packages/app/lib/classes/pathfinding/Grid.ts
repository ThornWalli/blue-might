import { Subject } from 'rxjs';
import type { Object3D, Sphere } from 'three';
import { Box3, Vector2, Vector3 } from 'three';

import type { TILE_TYPE } from '../../utils/pathfinding';
import type Unit from '../Unit';

export class GridNode {
  units: Set<Unit> = new Set();
  clone(): GridNode {
    return new GridNode(this);
  }
  index: number;
  x: number;
  y: number;
  initialType: TILE_TYPE;
  type: TILE_TYPE;

  constructor({
    index,
    type,
    x,
    y
  }: {
    index: number;
    type: TILE_TYPE;
    x: number;
    y: number;
  }) {
    this.index = index;
    this.initialType = type;
    this.type = type;
    this.x = x;
    this.y = y;
  }

  reset() {
    this.type = this.initialType;
  }
}

type GetTileTypeFunction = (x: number, y: number) => TILE_TYPE;

export default class Grid {
  resetNodes(nodes: GridNode[]) {
    return nodes.map(node => {
      this.updateNode(node.x, node.y);
      return node;
    });
  }
  resetNodesByUnit(nodes: GridNode[], unit: Unit) {
    return nodes.map(node => {
      this.updateNodeByUnit(node.x, node.y, unit, true);
      return node;
    });
  }
  private matrix: number[][] = [];
  private size: Vector2;
  private cellSize: number;
  private nodes: GridNode[] = [];

  private getTileType: GetTileTypeFunction;

  observables: {
    update$: Subject<void>;
  } = {
    update$: new Subject<void>()
  };

  constructor(
    size: Vector2,
    cellSize: number,
    getTileType: GetTileTypeFunction
  ) {
    this.size = size;
    this.cellSize = cellSize;
    this.getTileType = getTileType;
  }

  setup() {
    this.nodes = this.createNodes();
    this.matrix = this.createMatrix();
  }

  createNodes() {
    return new Array(this.width * this.height).fill(0).map((_, i) => {
      const x = i % this.width;
      const y = Math.floor(i / this.width);
      return new GridNode({
        index: i,
        type: this.getTileType(x, y),
        x,
        y
      });
    });
  }

  private createMatrix() {
    const matrix: number[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        const node = this.nodes[this.getIndex(x, y)]!;
        row.push(node.type);
      }
      matrix.push(row);
    }
    return matrix;
  }
  getMatrix(): number[][] {
    return this.matrix;
  }

  //#region nodes

  getNode(x: number, z: number) {
    return this.nodes[this.getIndex(x, z)]!;
  }

  getNodes() {
    return this.nodes;
  }

  updateNode(
    x: number,
    z: number,
    tileType: TILE_TYPE = this.getTileType(x, z)
  ) {
    const node = this.getNode(x, z);
    node.type = tileType;
    this.matrix[z]![x] = node.type;
  }

  updateNodeByUnit(x: number, z: number, unit: Unit, reset: boolean = false) {
    const node = this.getNode(x, z);
    if (reset) {
      node.units.delete(unit);
    } else {
      node.units.add(unit);
    }
    const tileTypeUnit = Array.from(node.units).sort(
      (a, b) => a.getPosition().y - b.getPosition().y
    )[0];
    node.type = tileTypeUnit?.getTileType() ?? node.initialType;
    this.matrix[z]![x] = node.type;
  }

  //#endregion

  getSize() {
    return this.size;
  }

  getCellSize() {
    return this.cellSize;
  }

  get width() {
    return this.size.x;
  }

  get height() {
    return this.size.y;
  }

  getIndex(x: number, y: number) {
    return y * this.width + x;
  }

  /**
   * Sammelt alle Nodes innerhalb eines Radius um die gegebene Center-Position.
   * @param center Die Center-Position als Vector2 (Grid-Koordinaten, z.B. x/y).
   * @param radius Der Radius in Grid-Einheiten.
   * @returns Array der betroffenen GridNodes.
   */
  getNodesInRadius(x: number, y: number, radius: number): GridNode[] {
    const result: GridNode[] = [];
    const radiusSquared = radius * radius;

    for (const node of this.nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy <= radiusSquared) {
        result.push(node);
      }
    }

    return result;
  }

  toWorldPosition(x: number, y: number) {
    x =
      x * this.cellSize +
      this.cellSize * 0.5 -
      (this.width * this.cellSize) / 2;
    y =
      y * this.cellSize +
      this.cellSize * 0.5 -
      (this.height * this.cellSize) / 2;

    return new Vector2(x, y);
  }

  getNodeFromWorldPosition(worldPosition: Vector2) {
    const x = Math.floor(
      (worldPosition.x + (this.width * this.cellSize) / 2) / this.cellSize
    );
    const y = Math.floor(
      (worldPosition.y + (this.height * this.cellSize) / 2) / this.cellSize
    );
    return this.getNode(x, y);
  }

  getCellsAroundObject(
    object: Object3D,
    box: Box3 = new Box3(),
    sphere?: Sphere
  ) {
    const aabb = box.setFromObject(object);
    if (sphere) {
      aabb.expandByScalar(sphere.radius);
    } else {
      const colliderSize = aabb.getSize(new Vector3());
      // Buffer
      const bufferFactor = 0.05;
      const buffer = Math.max(colliderSize.x, colliderSize.z) * bufferFactor;
      aabb.expandByScalar(buffer);
    }

    // Clipping auf Grid-Grenzen, um ungültige Zellen zu vermeiden
    const gridMinX = -(this.width * this.cellSize) / 2;
    const gridMaxX = (this.width * this.cellSize) / 2;
    const gridMinZ = -(this.height * this.cellSize) / 2;
    const gridMaxZ = (this.height * this.cellSize) / 2;
    aabb.min.x = Math.max(aabb.min.x, gridMinX);
    aabb.max.x = Math.min(aabb.max.x, gridMaxX);
    aabb.min.z = Math.max(aabb.min.z, gridMinZ);
    aabb.max.z = Math.min(aabb.max.z, gridMaxZ);

    return this.worldToGridCellsInAABB(aabb);
  }

  getNodeFromCells(cells: { x: number; z: number }[]) {
    return cells.map(cell => this.getNode(cell.x, cell.z));
  }
  getNodesAroundObject(object: Object3D, box: Box3 = new Box3()) {
    return this.getNodeFromCells(this.getCellsAroundObject(object, box));
  }

  worldToGridCellsInAABB(aabb: Box3) {
    const minX = Math.floor(
      (aabb.min.x + (this.width * this.cellSize) / 2) / this.cellSize
    );
    const maxX = Math.floor(
      (aabb.max.x + (this.width * this.cellSize) / 2) / this.cellSize
    );
    const minZ = Math.floor(
      (aabb.min.z + (this.height * this.cellSize) / 2) / this.cellSize
    );
    const maxZ = Math.floor(
      (aabb.max.z + (this.height * this.cellSize) / 2) / this.cellSize
    );

    const cells: { x: number; z: number }[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (x >= 0 && x < this.width && z >= 0 && z < this.height) {
          cells.push({ x, z });
        }
      }
    }
    return cells;
  }
}
