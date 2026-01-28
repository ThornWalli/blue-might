import type { Camera } from 'three';
import { Box3, Frustum, Matrix4, Vector3 } from 'three';

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
  size: number;
  chunks: Map<string, Chunk> = new Map();
  worldChunks: Map<string, Vector3> = new Map();

  constructor(size: number = 1) {
    this.size = size;
  }

  getChunkKey(position: Vector3) {
    return position
      .clone()
      .divide(new Vector3(this.size, this.size, this.size))
      .floor() // GEÄNDERT: floor statt round für konsistente Chunks
      .toArray()
      .toString();
  }

  assignToChunk(unit: Unit) {
    this.removeFromChunk(unit);
    const key = this.getChunkKey(unit.getPosition()); // GEÄNDERT: getChunkKey verwenden!

    if (!this.chunks.has(key)) {
      const position = unit
        .getPosition()
        .clone()
        .divide(new Vector3(this.size, this.size, this.size))
        .floor()
        .multiply(new Vector3(this.size, this.size, this.size));
      this.worldChunks.set(key, position);
      this.chunks.set(key, new Chunk(position));
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

  updateVisibility(camera: Camera) {
    // console.log('Updating chunk visibility...');
    const visibleChunks = this.findVisibleChunks(camera);
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

  // findVisibleChunks(camera: Camera) {
  //   this.projScreenMatrix.multiplyMatrices(
  //     camera.projectionMatrix,
  //     camera.matrixWorldInverse
  //   );
  //   this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

  //   const visibleChunkKeys = new Set<string>();
  //   const allChunkPositions = this.getChunkPositions();

  //   // Puffer-Faktor, um Ungenauigkeiten auszugleichen (z. B. 10% Erweiterung)
  //   const buffer = 1.1; // Anpassen, falls nötig

  //   for (const pos of allChunkPositions) {
  //     // WICHTIG: Box muss am Chunk-Zentrum sein, mit Puffer erweitert
  //     const chunkBox = new Box3().setFromCenterAndSize(
  //       pos.clone().addScalar(this.size / 2), // Zentrum des Chunks
  //       new Vector3(this.size * buffer, this.size * buffer, this.size * buffer)
  //     );

  //     if (this.frustum.intersectsBox(chunkBox)) {
  //       const chunkKey = this.getChunkKey(pos);
  //       visibleChunkKeys.add(chunkKey);
  //     }
  //   }

  //   return visibleChunkKeys;
  // }

  getUnitsInRadius(position: Vector3, radius: number): Unit[] {
    const unitsInRadius: { unit: Unit; distance: number }[] = [];
    const chunkSize = this.size;

    // Berechne die Chunk-Koordinaten des Zentrums (verwende getChunkKey für Konsistenz)
    const centerPos = position.clone();
    centerPos.y = 0; // Annahme: y=0 für 2D-Chunks, passe an falls nötig
    const centerChunkKey = this.getChunkKey(centerPos);
    const [centerChunkX, centerChunkY, centerChunkZ] = centerChunkKey
      .split(',')
      .map(Number) as [number, number, number];

    // Berechne den Radius in Chunks (um alle potenziell relevanten Chunks abzudecken)
    const chunkRadius = Math.ceil(radius / chunkSize);

    // Durchlaufe alle Chunks im Würfel um das Zentrum (Bounding-Box des Kreises, jetzt 3D)
    for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
      for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
        // NEU: y-Schleife hinzufügen
        for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
          // NEU: z-Schleife (falls 3D)
          const chunkX = centerChunkX + dx;
          const chunkY = centerChunkY + dy; // NEU: y berücksichtigen
          const chunkZ = centerChunkZ + dz;

          // Erstelle eine temporäre Position für diesen Chunk und hole den Key
          const chunkPos = new Vector3(
            chunkX * chunkSize,
            chunkY * chunkSize,
            chunkZ * chunkSize
          );
          const chunkKey = this.getChunkKey(chunkPos);

          const chunk = this.chunks.get(chunkKey);
          if (chunk) {
            // Filtere Units im Chunk, die tatsächlich im Radius liegen
            chunk.units.forEach(unit => {
              const unitPos = unit.getPosition();
              const distance = position.distanceTo(unitPos);
              if (distance <= radius) {
                unitsInRadius.push({ unit, distance });
              }
            });
          }
        }
      }
    }

    unitsInRadius.sort((a, b) => a.distance - b.distance);
    return unitsInRadius.map(entry => entry.unit);
  }
}
