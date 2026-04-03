import type { Camera } from 'three';
import { Box3, Frustum, Matrix4, Vector3 } from 'three';
import { ReplaySubject, Subject } from 'rxjs';

import type Unit from './Unit';

export interface UnitChunking {
  currentChunkKeys: string[];
}

class Chunk {
  visible = false;
  constructor(
    public position: Vector3,
    public units: Set<Unit> = new Set()
  ) {}

  get size() {
    return this.units.size;
  }
}

export default class UnitChunkManager {
  readonly size: number;
  chunks: Map<string, Chunk> = new Map();
  worldChunks: Map<string, Vector3> = new Map();

  readonly observables = {
    chunks$: new ReplaySubject<Map<string, Chunk>>(),
    add$: new Subject<{ chunk: Chunk; unit: Unit }>()
  };

  constructor(size: number = 1) {
    this.size = size;
  }

  destroy() {
    Object.values(this.observables).forEach(obs => {
      obs.complete();
      obs.unsubscribe();
    });
  }

  getChunkKey(position: Vector3) {
    return position
      .clone()
      .add(new Vector3(this.size / 2, this.size / 2, this.size / 2))
      .divide(new Vector3(this.size, this.size, this.size))
      .floor() // GEÄNDERT: floor statt round für konsistente Chunks
      .toArray()
      .toString();
  }

  assignToChunk(unit: Unit) {
    this.removeFromChunk(unit);
    const key = this.getChunkKey(unit.getPosition());

    if (!this.chunks.has(key)) {
      const position = unit
        .getPosition()
        .clone()
        .add(new Vector3(this.size / 2, this.size / 2, this.size / 2))

        .divide(new Vector3(this.size, this.size, this.size))
        .floor()
        .multiply(new Vector3(this.size, this.size, this.size));

      this.worldChunks.set(key, position);
      this.chunks.set(key, new Chunk(position));
      this.observables.chunks$.next(this.chunks);
    }

    // const mesh = unit.root;
    // mesh.traverse(child => {
    //   if (child instanceof Mesh) {
    //     child.updateMatrixWorld(true);
    //     child.geometry.computeBoundingBox();
    //     child.geometry.computeBoundingSphere();
    //   }
    // });

    this.chunks.get(key)!.units.add(unit);
    this.observables.add$.next({
      chunk: this.chunks.get(key)!,
      unit
    });

    unit.currentChunkKey = key;
  }

  removeFromChunk(unit: Unit) {
    const key = unit.currentChunkKey;
    if (key && this.chunks.has(key)) {
      this.chunks.get(key)!.units.delete(unit);
      unit.currentChunkKey = null;
      if (this.chunks.get(key)!.size === 0) {
        this.worldChunks.delete(key);
        this.chunks.delete(key);
      }
    }
  }
  visibleChunks: Set<string> = new Set();
  updateVisibility(camera: Camera, positions: Vector3[]) {
    // console.log('Updating chunk visibility...');
    const visibleChunks = (this.visibleChunks = this.findVisibleChunks(camera));
    positions.forEach(position =>
      visibleChunks.add(this.getChunkKey(position))
    );

    const visibleUnits: Unit[] = [];
    const hideUnits: Unit[] = [];

    Array.from(this.chunks.entries()).forEach(([key, chunk]) => {
      if (visibleChunks.has(key)) {
        chunk.visible = true;
        visibleUnits.push(...Array.from(chunk.units.values()));
      } else {
        hideUnits.push(...Array.from(chunk.units.values()));
        chunk.visible = false;
      }
    });
    // new Set(hideUnits).forEach(unit => {
    //   const player = unit.getModuleByType(PlayerUnitModule)?.getPlayer();
    //   if (player instanceof HumanPlayer) {
    //     unit.setChunkVisible(false);
    //   }
    // });

    const visibleUnitsSet = new Set(visibleUnits);
    visibleUnitsSet.forEach(unit => {
      unit.setChunkVisible(true);
    });

    return visibleUnits;
  }

  getChunkPositions() {
    return Array.from(this.worldChunks.values()); // VEREINFACHT
  }

  frustum = new Frustum();
  projScreenMatrix = new Matrix4();

  findVisibleChunks(camera: Camera) {
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    const visibleChunkKeys = new Set<string>();
    const allChunkPositions = this.getChunkPositions();

    for (const pos of allChunkPositions) {
      // WICHTIG: Box muss am Chunk-Zentrum sein
      const chunkBox = new Box3().setFromCenterAndSize(
        pos.clone().addScalar(this.size / 2), // Zentrum des Chunks
        new Vector3(this.size, this.size, this.size)
      );

      if (this.frustum.intersectsBox(chunkBox)) {
        const chunkKey = this.getChunkKey(pos);
        visibleChunkKeys.add(chunkKey);
      }
    }

    return visibleChunkKeys;
  }

  getUnitsInRadius(
    position: Vector3,
    radius: number,
    unitFilter?: (unit: Unit) => boolean
  ) {
    const unitsInRadius: { unit: Unit; distance: number }[] = [];
    const chunkSize = this.size;

    // Berechne die Chunk-Koordinaten des Zentrums (verwende getChunkKey für Konsistenz)
    const centerPos = position.clone();
    centerPos.y = 0; // Annahme: y=0 für 2D-Chunks, passe an falls nötig
    const centerChunkKey = this.getChunkKey(centerPos);
    const [centerChunkX, centerChunkY, centerChunkZ] = centerChunkKey
      .split(',')
      .map(Number) as [number, number, number];

    const chunkRadius = Math.ceil(radius / chunkSize);

    for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
      for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
        for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
          const chunkX = centerChunkX + dx;
          const chunkY = centerChunkY + dy;
          const chunkZ = centerChunkZ + dz;

          const chunkPos = new Vector3(
            chunkX * chunkSize,
            chunkY * chunkSize,
            chunkZ * chunkSize
          );
          const chunkKey = this.getChunkKey(chunkPos);

          const chunk = this.chunks.get(chunkKey);
          if (chunk) {
            const units = Array.from(chunk.units);

            units.forEach(unit => {
              if (unitFilter && !unitFilter(unit)) return;
              const unitPos = unit.getPosition();
              const distance = position.distanceTo(unitPos);
              const intersect = unit.modules.collision.isIntersect(position);
              if (intersect || distance <= radius) {
                unitsInRadius.push({ unit, distance });
              }
            });
          }
        }
      }
    }
    unitsInRadius.sort((a, b) => a.distance - b.distance);

    return unitsInRadius.map(entry => {
      return {
        unit: entry.unit,
        distance: entry.distance
      };
    });
  }
}
