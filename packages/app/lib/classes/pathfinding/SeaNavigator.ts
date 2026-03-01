import { TILE_TYPE, type TILE_TYPE_COSTS } from '../../utils/pathfinding';
import BaseNavigator from '../abstract/BaseNavigator';

export default class SeaNavigator extends BaseNavigator {
  protected getHeightAt(x: number, z: number): number {
    return Math.max(
      this.map.modules.surface.getWaterLevel(),
      this.map.modules.surface.getSurfaceHeightAt(x, z)
    );
  }

  getAcceptableTiles() {
    return [
      // TILE_TYPE.SOFT,
      // TILE_TYPE.DRY_ROAD,
      // TILE_TYPE.BETON_ROAD,
      // TILE_TYPE.GRASS,
      TILE_TYPE.WATER
      // TILE_TYPE.UNIT,
      // TILE_TYPE.UNIT_GROUND
      // TILE_TYPE.UNIT_AIR,
      // TILE_TYPE.UNIT_SEA
      // TILE_TYPE.UNIT_BUILDING,
      // TILE_TYPE.UNIT_HIGH_BUILDING
    ];
  }

  getTileCosts(): TILE_TYPE_COSTS {
    return {
      [TILE_TYPE.BLOCKED]: Infinity,
      [TILE_TYPE.SOFT]: Infinity,
      [TILE_TYPE.GRASS]: Infinity,
      [TILE_TYPE.DRY_ROAD]: Infinity,
      [TILE_TYPE.BETON_ROAD]: Infinity,
      [TILE_TYPE.WATER]: 0
    };
  }
}
