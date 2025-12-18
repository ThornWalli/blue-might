import type { Camera } from 'three';
import { Box3, Frustum, Matrix4, Mesh, Vector3 } from 'three';
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

    const mesh = unit.root;
    mesh.traverse(child => {
      if (child instanceof Mesh) {
        child.updateMatrixWorld(true);
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
      }
    });

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
}
