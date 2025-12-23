import type { Object3D } from 'three';
import { Vector3 } from 'three';
import { lineOfSight } from '../../utils/pathfinding';
import type Map from '../Map';

export default class AirNavigator {
  private map: Map;
  private colliders: Object3D[];
  private nodes: Vector3[];
  private graph: { [key: number]: number[] };
  private flightHeight: number;
  constructor(
    map: Map,
    colliders: Object3D[],
    spacing = 80,
    flightHeight = 30,
    worldW = 400,
    worldH = 400
  ) {
    this.map = map;
    this.colliders = colliders;

    this.nodes = [];
    this.graph = {};
    this.flightHeight = flightHeight;

    for (let x = 0; x < worldW; x += spacing) {
      for (let z = 0; z < worldH; z += spacing) {
        const y =
          this.map.modules.ground.getSurfaceHeightAt(x, z) + flightHeight;
        const node = new Vector3(x, y, z);
        this.nodes.push(node);
      }
    }

    // edges
    for (let i = 0; i < this.nodes.length; i++) {
      this.graph[i] = [];
      for (let j = 0; j < this.nodes.length; j++) {
        if (i === j) continue;
        if (lineOfSight(this.nodes[i]!, this.nodes[j]!, this.colliders)) {
          this.graph[i]!.push(j);
        }
      }
    }
  }

  findClosestNode(pos: Vector3) {
    let best = 0;
    let bestDist = Infinity;

    for (let i = 0; i < this.nodes.length; i++) {
      const d = pos.distanceTo(this.nodes[i]!);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  findPath(start: Vector3, end: Vector3) {
    const s = this.findClosestNode(start);
    const e = this.findClosestNode(end);

    const visited = new Set();
    const parent: {
      [key: number]: number;
    } = {};
    const queue = [s];

    visited.add(s);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === e) break;

      for (const n of this.graph[current!]!) {
        if (!visited.has(n)) {
          visited.add(n);
          parent[n] = current!;
          queue.push(n);
        }
      }
    }

    if (!parent[e]) return null;

    // reconstruct
    const path = [];
    let c = e;

    while (c !== s) {
      path.push(this.nodes[c]);
      c = parent[c]!;
    }
    path.push(this.nodes[s]);

    return path.filter(node => !!node).reverse();
  }
}
