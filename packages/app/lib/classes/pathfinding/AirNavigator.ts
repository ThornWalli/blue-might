import type { Vector3, Box3, Object3D, Vector2 } from 'three';
import type Map from '../Map';
import { TILE_TYPE } from '../../utils/pathfinding';
import BaseNavigator from '../abstract/BaseNavigator';
import type { GridNode } from './Grid';
import { COLLISION_TYPE } from '../unitModule/Collision';

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
    // ... (deine Luft-Kollisionslogik hier)
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
