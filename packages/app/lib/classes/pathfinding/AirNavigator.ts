import type { Box3, Vector2 } from 'three';

import type Map from '../Map';
import BaseNavigator from '../abstract/BaseNavigator';
import { NAVIGATOR_TYPE } from '../mapModule/Pathfinding';
import { TILE_TYPE, type TILE_TYPE_COSTS } from '../../utils/pathfinding';

import type Grid from './Grid';

export enum VehicleType {
  AIRPLANE = 'airplane',
  HELICOPTER = 'helicopter'
}

export default class AirNavigator extends BaseNavigator {
  private flightHeight: number;
  private vehicleType: VehicleType;
  private runways: Box3[] = [];

  constructor(
    map: Map,
    grid: Grid,
    options: {
      gridSize: number;
      size: Vector2;
      vehicleType: VehicleType;
      flightHeight?: number;
      runways?: Box3[];
    },
    debug = false
  ) {
    super(NAVIGATOR_TYPE.AIR, map, grid, options, debug);

    this.flightHeight = options.flightHeight ?? 1;
    this.vehicleType = options.vehicleType;
    this.runways = options.runways ?? [];
  }

  protected getHeightAt(x: number, z: number): number {
    return (
      this.map.modules.surface.getSurfaceHeightAt(x, z) + this.flightHeight
    );
  }

  getAcceptableTiles() {
    return [
      TILE_TYPE.DRY_ROAD,
      TILE_TYPE.BETON_ROAD,
      TILE_TYPE.GRASS,
      TILE_TYPE.WATER,
      TILE_TYPE.UNIT,
      TILE_TYPE.UNIT_GROUND,
      TILE_TYPE.UNIT_AIR,
      TILE_TYPE.UNIT_SEA,
      TILE_TYPE.UNIT_BUILDING
      // TILE_TYPE.UNIT_HIGH_BUILDING
    ];
  }

  getTileCosts(): TILE_TYPE_COSTS {
    return {
      [TILE_TYPE.BLOCKED]: Infinity,
      [TILE_TYPE.UNIT_AIR]: Infinity,
      [TILE_TYPE.SOFT]: 10,
      [TILE_TYPE.GRASS]: 0,
      [TILE_TYPE.DRY_ROAD]: 0,
      [TILE_TYPE.BETON_ROAD]: 0,
      [TILE_TYPE.WATER]: 0
    };
  }

  // Spezielle Start/Landung für Fahrzeugtypen
  // canTakeOff(pos: Vector3): boolean {
  //   if (this.vehicleType === VehicleType.HELICOPTER) {
  //     const { x, y } = this.toNodePosition(pos.z, pos.x);
  //     return this.isWalkable({
  //       grid: this.getGrid(),
  //       x,
  //       y,
  //       excludeObjects: []
  //     }).value;
  //   } else if (this.vehicleType === VehicleType.AIRPLANE) {
  //     return this.runways.some(runway => runway.containsPoint(pos)); // Nur auf Runways
  //   }
  //   return false;
  // }

  // canLand(pos: Vector3): boolean {
  //   return this.canTakeOff(pos); // Gleiche Logik
  // }

  // override getDebugPositions(nodes: GridNode[]) {
  //   return nodes.map(node => {
  //     const position = this.toWorldPosition(node.x, node.y);
  //     position.setY(position.y + this.flightHeight);
  //     return { walkable: node.walkable.value, index: node.index, position };
  //   });
  // }
}
