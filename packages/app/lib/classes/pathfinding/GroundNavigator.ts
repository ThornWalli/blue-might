/* eslint-disable complexity */
import { Vector3, type Object3D } from 'three';

import type { TILE_TYPE } from '../../utils/pathfinding';
import { COLLISION_TYPE } from '../unitModule/Collision';
import BaseNavigator from '../abstract/BaseNavigator';
import { OBJECT_USER_DATA } from '../../utils/object';
import type Unit from '../Unit';
import type HelicopterUnitModule from '../unitModule/movable/airVehicle/Helicopter';
import { FLIGHT_STATUS } from '../unitModule/movable/airVehicle/Helicopter';

import type Grid from './Grid';
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

  override isWalkable(
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
    let collisionType = COLLISION_TYPE.NONE;

    // Filtere Colliders: Ignoriere fliegende Helicopters (nur gelandete blockieren)
    const filteredColliders = this.colliders.filter(collider => {
      const unit = collider.userData.unit as Unit;
      if (unit && 'helicopter' in unit.modules) {
        const heliModule = unit.modules.helicopter as HelicopterUnitModule;
        return heliModule.getFlightStatus() === FLIGHT_STATUS.LANDED; // Nur gelandete berücksichtigen
      }
      return true; // Andere Colliders (Infantry, GroundVehicle, etc.) immer berücksichtigen
    });

    for (const collider of filteredColliders) {
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
        const buffer = Math.max(colliderSize.x, colliderSize.z) / 8;
        const expandedBox = box.clone().expandByScalar(buffer);
        if (expandedBox.containsPoint(pos)) {
          walkable = false;
          break;
        }
      }
    }

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
