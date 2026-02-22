import { TILE_TYPE, type TILE_TYPE_COSTS } from '../../utils/pathfinding';
import BaseNavigator from '../abstract/BaseNavigator';

export default class GroundNavigator extends BaseNavigator {
  protected getHeightAt(x: number, z: number): number {
    return this.map.modules.surface.getSurfaceHeightAt(x, z);
  }

  getAcceptableTiles() {
    return [
      // TILE_TYPE.SOFT,
      TILE_TYPE.DRY_ROAD,
      TILE_TYPE.BETON_ROAD,
      TILE_TYPE.GRASS,
      TILE_TYPE.UNIT_PLATFORM,
      TILE_TYPE.UNIT_AIR
      // TILE_TYPE.WATER
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
      [TILE_TYPE.SOFT]: 9999,
      [TILE_TYPE.GRASS]: 1000,
      [TILE_TYPE.DRY_ROAD]: 200,
      [TILE_TYPE.BETON_ROAD]: 50,
      [TILE_TYPE.WATER]: 2000,
      [TILE_TYPE.UNIT_PLATFORM]: 1100,
      [TILE_TYPE.UNIT_AIR]: 100
    };
  }
}

// const validTypes = Object.values(TILE_INDEX).slice(1) as number[];

// easystar.setAcceptableTiles(validTypes);

// validTypes.forEach(tileType => {
//   easystar.setTileCost(tileType, getTileCost(tileCostType, tileType));
// });
