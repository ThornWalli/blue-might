import { Vector3, type Box3, type Object3D, type Vector2 } from 'three';

import type Map from '../Map';
import { TILE_TYPE } from '../../utils/pathfinding';
import BaseNavigator from '../abstract/BaseNavigator';
import { COLLISION_TYPE } from '../unitModule/Collision';
import { OBJECT_USER_DATA } from '../../utils/object';

import type { GridNode } from './Grid';
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
    colliders: Object3D[],
    vehicleType: VehicleType,
    flightHeight = 1,
    runways: Box3[] = [],
    options: { gridSize: number; size: Vector2; sphere: boolean },
    debug = false
  ) {
    super(map, colliders, options, debug);

    this.flightHeight = flightHeight;
    this.vehicleType = vehicleType;
    this.runways = runways;
  }

  protected getHeightAt(x: number, z: number): number {
    return this.map.modules.ground.getSurfaceHeightAt(x, z) + this.flightHeight;
  }

  protected isWalkableExtra(
    _pos: Vector3,
    _excludeObjects: Object3D[]
  ): { value: boolean; collisionType: COLLISION_TYPE } {
    // Luft-spezifische Prüfung (z.B. zusätzliche Kollisionen in der Luft)
    // Beispiel: Prüfe auf Luft-Objekte
    const walkable = true;
    const collisionType = COLLISION_TYPE.NONE;

    // if (
    //   this.map.modules.ground.getSurfaceHeightAt(_pos.x, _pos.z) >
    //   this.flightHeight
    // ) {
    //   console.log(
    //     this.map.modules.ground.getSurfaceHeightAt(_pos.x, _pos.z),
    //     this.flightHeight
    //   );
    // }

    // walkable =
    //   walkable &&
    //   this.map.modules.ground.getSurfaceHeightAt(_pos.x, _pos.z) <
    //     this.flightHeight;
    // if (
    //   this.map.modules.ground.getSurfaceHeightAt(_pos.x, _pos.z) >
    //   this.flightHeight
    // ) {
    //   console.log(
    //     walkable,
    //     this.map.modules.ground.getSurfaceHeightAt(_pos.x, _pos.z),
    //     this.flightHeight
    //   );
    // }

    // ... (deine Luft-Kollisionslogik hier)
    return { value: walkable, collisionType };
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
    pos.setY(this.map.modules.ground.getSeaLevel() + this.flightHeight);
    let walkable = true;
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
    // const extra = this.isWalkableExtra(pos, excludeObjects);
    // walkable = walkable && extra.value;
    // collisionType = extra.collisionType || collisionType;

    if (debug && this.debugState.checkDebugMeshes) {
      const MAX_DEBUG = Math.max(1000, this.getGrid().getNodes().length);
      if (this.debugState.isWalkableChecks.length < MAX_DEBUG) {
        this.debugState.isWalkableChecks.push({ pos, walkable });
      }
    }

    return { value: walkable, collisionType };
  }

  protected getTileTypeAtNode(_node: GridNode) {
    // Luft hat keine spezifischen Tile-Typen, oder erweitere
    return TILE_TYPE.GRASS; // Oder passe an
  }

  // Spezielle Start/Landung für Fahrzeugtypen
  canTakeOff(pos: Vector3): boolean {
    if (this.vehicleType === VehicleType.HELICOPTER) {
      const { x, y } = this.toNodePosition(pos.z, pos.x);
      return this.isWalkable({
        grid: this.getGrid(),
        x,
        y,
        excludeObjects: []
      }).value;
    } else if (this.vehicleType === VehicleType.AIRPLANE) {
      return this.runways.some(runway => runway.containsPoint(pos)); // Nur auf Runways
    }
    return false;
  }

  canLand(pos: Vector3): boolean {
    return this.canTakeOff(pos); // Gleiche Logik
  }

  override getDebugPositions(nodes: GridNode[]) {
    return nodes.map(node => {
      const position = this.toWorldPosition(node.x, node.y);
      position.setY(position.y + this.flightHeight);
      return { walkable: node.walkable.value, index: node.index, position };
    });
  }
}
