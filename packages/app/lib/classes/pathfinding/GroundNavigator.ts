import type { Object3D, Vector3 } from 'three';
import type { TILE_TYPE } from '../../utils/pathfinding';
import { COLLISION_TYPE } from '../unitModule/Collision';
import BaseNavigator from '../abstract/BaseNavigator';
import type { GridNode } from './Grid';

export default class GroundNavigator extends BaseNavigator {
  protected getHeightAt(x: number, z: number): number {
    return this.map.modules.ground.getSurfaceHeightAt(x, z);
  }

  protected isWalkableExtra(
    _pos: Vector3,
    _excludeObjects: Object3D[]
  ): { value: boolean; collisionType: COLLISION_TYPE } {
    // Keine Extra-Prüfung für Boden
    return { value: true, collisionType: COLLISION_TYPE.NONE };
  }

  protected getTileTypeAtNode(node: GridNode): TILE_TYPE | undefined {
    return this.map.modules.ground.pathfinderTileTypes[node.y]?.[node.x];
  }

  // private isCellOccupiedByOthers(x: number, z: number, self: Object3D) {
  //   for (const [obj, cells] of this.occupiedByObject.entries()) {
  //     if (obj === self) continue;
  //     if (cells.some(c => c.x === x && c.z === z)) return true;
  //   }
  //   return false;
  // }
}
