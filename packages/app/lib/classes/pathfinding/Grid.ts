import { Subject } from 'rxjs';
import type { Object3D } from 'three';
import { Vector2 } from 'three';

import { TILE_TYPE } from '../../utils/pathfinding';
import { COLLISION_TYPE } from '../unitModule/Collision';

export type WalkableFunction = (
  options: {
    grid: Grid;
    x: number;
    y: number;
    excludeObjects: Object3D[];
  },
  debug?: boolean
) => {
  value: boolean;
  collisionType: COLLISION_TYPE;
};

export interface GridNode {
  index: number;
  walkable: {
    value: boolean;
    collisionType: COLLISION_TYPE;
  };
  x: number;
  y: number;
}

export default class Grid {
  private matrix: number[][] = [];
  getNode(x: number, z: number) {
    return this.nodes[this.index(x, z)]!;
  }
  private size: Vector2;
  private cellSize: number;
  private nodes: GridNode[];
  isWalkableFn: WalkableFunction;
  getTileType?: (node: GridNode) => TILE_TYPE;

  observables: {
    update$: Subject<void>;
  } = {
    update$: new Subject<void>()
  };

  getNodes() {
    return this.nodes;
  }

  private createMatrix() {
    const matrix: number[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.width; x++) {
        const node = this.nodes[this.index(x, y)]!;

        const tileType = node.walkable.value
          ? (this.getTileType?.(node) ?? TILE_TYPE.GRASS)
          : TILE_TYPE.BLOCKED;

        row.push(tileType);
      }
      matrix.push(row);
    }
    return matrix;
  }

  constructor(
    size: Vector2,
    cellSize: number,
    isWalkableFn: WalkableFunction,
    getTileType?: (node: GridNode) => TILE_TYPE
  ) {
    this.size = size;
    this.cellSize = cellSize;
    this.isWalkableFn = isWalkableFn;
    this.getTileType = getTileType;

    this.nodes = new Array(this.width * this.height).fill(0).map((_, i) => {
      return {
        index: i,
        walkable: {
          value: true,
          collisionType: COLLISION_TYPE.NONE
        },
        x: i % this.width,
        y: Math.floor(i / this.width)
      };
    });
  }

  setup() {
    this.matrix = this.createMatrix();
    console.log(
      'Grid matrix created:',
      this.matrix.length,
      this.matrix[0]?.length
    );
    this.update();
  }

  get width() {
    return this.size.x;
  }

  get height() {
    return this.size.y;
  }

  index(x: number, y: number) {
    return y * this.width + x;
  }

  toWorld(x: number, y: number) {
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

  toNode(worldPosition: Vector2) {
    const x = Math.floor(
      (worldPosition.x + (this.width * this.cellSize) / 2) / this.cellSize
    );
    const y = Math.floor(
      (worldPosition.y + (this.height * this.cellSize) / 2) / this.cellSize
    );
    return this.getNode(x, y);
  }

  update(nodes?: GridNode[], excludeObjects: Object3D[] = []) {
    const nodesToUpdate = nodes || this.nodes;
    for (const node of nodesToUpdate) {
      node.walkable = this.isWalkableFn({
        grid: this,
        x: node.x,
        y: node.y,
        excludeObjects
      });

      const tileType = node.walkable.value
        ? (this.getTileType?.(node) ?? TILE_TYPE.GRASS)
        : TILE_TYPE.BLOCKED;
      this.matrix[node.y]![node.x] = tileType;
    }
    this.observables.update$.next();
  }

  getNeighbors(node: GridNode) {
    const result = [];
    const { x, y } = node;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1]
    ];

    for (const [dx, dy] of dirs) {
      const nx = x + dx!;
      const ny = y + dy!;

      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        const n = this.nodes[this.index(nx, ny)]!;
        if (n.walkable.value) result.push(n);
      }
    }

    return result;
  }

  toMatrix() {
    return this.matrix;
  }
}
