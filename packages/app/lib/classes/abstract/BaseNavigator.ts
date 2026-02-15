import EasyStar from 'easystarjs';
import { Vector3, Vector2 } from 'three';
import { Subscription } from 'rxjs';

import type Map from '../Map';
import type Grid from '../pathfinding/Grid';
import type { GridNode } from '../pathfinding/Grid';
import type { TILE_TYPE_COSTS } from '../../utils/pathfinding';
import type { NAVIGATOR_TYPE } from '../mapModule/Pathfinding';
import { WorkerPool } from '../WorkerPool';

export type ACCEPTABLE_TILES = number[];

export default abstract class BaseNavigator {
  public debug = false;
  private type: NAVIGATOR_TYPE;
  private subscription = new Subscription();
  public map: Map;

  private gridSize: number;
  private grid!: Grid;
  private size: Vector2;

  private workerPool?: WorkerPool;
  private useWorker = true;

  constructor(
    type: NAVIGATOR_TYPE,
    map: Map,
    grid: Grid,
    options: {
      gridSize: number;
      size: Vector2;
    },
    debug = false
  ) {
    this.type = type;
    this.size = options.size ?? new Vector2(32, 32);

    this.debug = debug;
    this.map = map;

    this.grid = grid;
    this.gridSize = options.gridSize ?? 2;
  }

  async setup() {
    if (this.useWorker && typeof window !== 'undefined') {
      this.workerPool = new WorkerPool(
        new URL('../../workers/pathfinding.worker.ts', import.meta.url),
        6 // Pool-Größe
      );
    }
  }

  destroy() {
    this.subscription.unsubscribe();
    if (this.workerPool) {
      this.workerPool.terminate();
      this.workerPool = undefined;
    }
  }

  getGridSize() {
    return this.gridSize;
  }

  getGrid() {
    return this.grid;
  }

  // Abstrakte Methoden für spezifische Logik
  protected abstract getHeightAt(x: number, z: number): number;

  abstract getAcceptableTiles(): ACCEPTABLE_TILES;
  abstract getTileCosts(): TILE_TYPE_COSTS;

  // const validTypes = Object.values(TILE_INDEX).slice(1) as number[];

  // easystar.setAcceptableTiles(validTypes);

  // validTypes.forEach(tileType => {
  //   easystar.setTileCost(tileType, getTileCost(tileCostType, tileType));
  // });

  async findPath(
    start: Vector3,
    end: Vector3,
    startNodes?: GridNode[]
  ): Promise<Vector3[]> {
    try {
      const s = this.toNodePosition(start.x, start.z)!;
      const e = this.toNodePosition(end.x, end.z)!;

      if (startNodes?.length) {
        this.grid.resetNodes(startNodes);
      }

      const matrix = this.grid.getMatrix();
      const acceptable = this.getAcceptableTiles();
      const costs = this.getTileCosts();

      let nodePath: { x: number; y: number }[] = [];
      const pool = this.workerPool;
      if (pool) {
        const res = await pool.exec({
          type: 'findPath',
          grid: matrix,
          start: s,
          end: e,
          acceptableTiles: acceptable,
          tileCosts: costs,
          allowDiagonals: true,
          cornerCutting: true
        });
        if (res.error) throw new Error(res.error);
        nodePath = res.path || [];
      } else {
        // Fallback
        nodePath = await new Promise<{ x: number; y: number }[]>(resolve => {
          const easystar = createEasyStarInstance(acceptable, costs, {
            allowDiagonals: true,
            cornerCutting: true
          });
          easystar.setGrid(matrix);
          easystar.findPath(s.x, s.y, e.x, e.y, path => resolve(path || []));
          easystar.calculate();
        });
      }

      let waypoints = nodePath.map(n => {
        const p = this.grid.toWorldPosition(n.x, n.y);
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
      if (startNodes?.length) {
        this.grid.resetNodes(startNodes);
      }
    }
  }
  //#region Debug

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
    return this.grid.getNodes()[this.grid.getIndex(gx, gy)];
  }

  //#endregion
}

function createEasyStarInstance(
  acceptableTiles: ACCEPTABLE_TILES,
  tileCosts: TILE_TYPE_COSTS,
  options: {
    allowDiagonals: boolean;
    cornerCutting: boolean;
  }
) {
  const easystar = new EasyStar.js();
  if (options.allowDiagonals) {
    easystar.enableDiagonals();
  }
  if (options.cornerCutting) {
    easystar.enableCornerCutting();
  }

  easystar.setAcceptableTiles(acceptableTiles);
  Object.entries(tileCosts).forEach(([tileType, cost]) => {
    easystar.setTileCost(Number(tileType), cost);
  });

  return easystar;
}
