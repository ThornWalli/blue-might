import { ShadowMaterial, Vector2, Vector3, type Texture } from 'three';
import {
  Mesh,
  MeshLambertMaterial,
  NearestFilter,
  Object3D,
  PlaneGeometry
} from 'three';
import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import { Subject } from 'rxjs';
import type Map from '../Map';

interface Observables extends MapModuleObservables {
  select$: Subject<Vector2>;
}

interface State extends MapModuleState {
  terrainHeight: number;
  terrainWidth: number;
  segments: number;
  heights: number[];
  origin: Vector3;
}

export default class GroundModule extends MapModule<State, Observables> {
  static override TYPE = 'ground';

  override state: State = {
    segments: 64,
    terrainHeight: 0,
    terrainWidth: 0,
    heights: [],
    origin: new Vector3(0, 9, 0)
  };

  constructor(room: Map, debug: boolean) {
    super(room, debug);
    //#region observables
    this.observables.select$ = new Subject<Vector2>();
    //#endregion
  }

  /**
   * Gibt die geglättete Höhe an einer Weltposition zurück
   * @param x X-Koordinate (oder Vector2)
   * @param z Z-Koordinate
   * @returns Normalisierte Höhe (0-1) mit Glättung
   */
  getDepthAt(x: number | Vector2, z?: number): number {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }

    const { terrainWidth, terrainHeight, segments, heights, origin } =
      this.state;

    // Welt -> Terrain-Koordinaten: Offset durch object.position berücksichtigen
    const localX = x - origin.x;
    const localZ = z! - origin.z;

    // Position relativ zum Terrain (normalisiert 0-1, Terrain um (0,0) zentriert)
    const normalizedX = (localX + terrainWidth / 2) / terrainWidth;
    const normalizedZ = (localZ + terrainHeight / 2) / terrainHeight;

    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const clampedZ = Math.max(0, Math.min(1, normalizedZ));

    const vertexX = clampedX * segments;
    const vertexZ = clampedZ * segments;

    const x0 = Math.floor(vertexX);
    const x1 = Math.min(x0 + 1, segments);
    const z0 = Math.floor(vertexZ);
    const z1 = Math.min(z0 + 1, segments);

    const fx = vertexX - x0;
    const fz = vertexZ - z0;

    const h00 = heights[z0 * (segments + 1) + x0] || 0;
    const h10 = heights[z0 * (segments + 1) + x1] || 0;
    const h01 = heights[z1 * (segments + 1) + x0] || 0;
    const h11 = heights[z1 * (segments + 1) + x1] || 0;

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const height = h0 * (1 - fz) + h1 * fz;

    return height;
  }

  /**
   * Gibt die tatsächliche Y-Position für ein Objekt zurück
   * @param x X-Koordinate (oder Vector2)
   * @param z Z-Koordinate
   * @returns Y-Position in World-Space
   */
  getHeightAt(x: number | Vector2, z?: number): number {
    const depth = this.getDepthAt(x, z);
    // gleiche Transformation wie im Mesh: vertices Y = depth * -10; object.position.y = 9
    return depth * -10 + this.state.origin.y;
  }

  private getGroundHeights(segments = 64) {
    const heightMap = this.map.textures.heightMap!;
    heightMap.minFilter = NearestFilter;
    heightMap.magFilter = NearestFilter;
    heightMap.generateMipmaps = false;

    const data = getPixelsFromTexture(heightMap);
    const vertexCount = (segments + 1) * (segments + 1);

    // Höhen setzen
    const heights: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const x = i % (segments + 1);
      const y = Math.floor(i / (segments + 1));

      const px = Math.floor((x / segments) * (heightMap.image.width - 1));
      const py = Math.floor((y / segments) * (heightMap.image.height - 1));

      const index = (py * heightMap.image.width + px) * 4;
      const heightValue = (data[Number(index)] || 0) / 255;

      heights[i] = heightValue;
    }

    // Glättung durch Averaging mit Nachbarn
    const smoothedHeights = smoothHeights(
      heights,
      segments + 1,
      segments + 1,
      2
    );

    return smoothedHeights;
  }

  createMeshes() {
    const backgroundTexture = this.map.textures.backgroundTexture!;
    backgroundTexture.minFilter = NearestFilter;
    backgroundTexture.magFilter = NearestFilter;
    backgroundTexture.generateMipmaps = false;
    const foregroundTexture = this.map.textures.foregroundTexture!;
    foregroundTexture.minFilter = NearestFilter;
    foregroundTexture.magFilter = NearestFilter;
    foregroundTexture.generateMipmaps = false;

    const segments = this.state.segments;
    const heights = this.getGroundHeights(segments);
    this.state.heights = heights;

    const width = backgroundTexture.width; // Terraingröße
    const height = backgroundTexture.height;

    this.state.terrainWidth = width;
    this.state.terrainHeight = height;

    const geometry = new PlaneGeometry(width, height, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const vertexCount = (segments + 1) * (segments + 1);
    for (let i = 0; i < vertexCount; i++) {
      geometry.attributes.position!.setY(i, heights[i]! * -10);
    }

    geometry.computeVertexNormals();

    const backgroundMaterial = new MeshLambertMaterial({
      // color: 0x88aa55,
      map: backgroundTexture,
      flatShading: true,
      wireframe: false
    });
    const foregroundMaterial = new MeshLambertMaterial({
      // color: 0x88aa55,
      map: foregroundTexture,
      flatShading: true,
      wireframe: false,
      transparent: true
    });

    const backgroundTerrain = new Mesh(geometry, backgroundMaterial);
    backgroundTerrain.name = 'Ground Background';
    const foregroundTerrain = new Mesh(geometry, foregroundMaterial);
    foregroundTerrain.name = 'Ground Foreground';
    const shadowTerrain = new Mesh(geometry, new ShadowMaterial());
    shadowTerrain.name = 'Ground Shadow';
    shadowTerrain.receiveShadow = true;

    const waterMaterial = new MeshLambertMaterial({
      color: 0x004080,
      flatShading: true,
      wireframe: false
    });

    const waterGeometry = new PlaneGeometry(width, height, 1, 1);
    waterGeometry.rotateX(-Math.PI / 2);
    waterGeometry.translate(0, -8.8, 0);

    const water = new Mesh(waterGeometry, waterMaterial);

    const object = new Object3D();
    object.add(backgroundTerrain);
    object.add(foregroundTerrain);
    object.add(shadowTerrain);
    object.add(water);
    object.position.copy(new Vector3(-0.5, 9, -0.5));
    // origin speichern, damit Abfragen korrekt transformieren
    this.state.origin.copy(object.position);
    return object;
  }

  override async setup() {
    await super.setup();

    const object = await this.createMeshes();
    this.map.addToRoot(object);

    const listener =
      this.map.app.renderer.modules.intersection.registerListener();
    listener.addMeshes(Array.from(object.children));

    this.subscription.add(
      listener.clickIntersect$.subscribe(intersect => {
        const point = intersect.point.clone().floor();
        this.observables.select$?.next(new Vector2(point.x, point.z));
      })
    );
  }

  getNormalAt(x: number | Vector2, z?: number): Vector3 {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }
    const sampleDistance = 0.25;

    // Normale basierend auf Weltkoordinaten mit gleicher Höhenfunktion (inkl. Offset)
    const h0 = this.getHeightAt(x, z!);
    const h1 = this.getHeightAt(x + sampleDistance, z!);
    const h2 = this.getHeightAt(x, z! + sampleDistance);

    const v1 = new Vector3(sampleDistance, h1 - h0, 0);
    const v2 = new Vector3(0, h2 - h0, sampleDistance);

    return v1.cross(v2).normalize();
  }
}

function smoothHeights(
  heights: number[],
  width: number,
  height: number,
  iterations: number
): number[] {
  let current = [...heights];

  for (let iter = 0; iter < iterations; iter++) {
    const next = [...current];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;

        // Durchschnitt mit 8 Nachbarn
        const neighbors = [
          current[i - width - 1],
          current[i - width],
          current[i - width + 1],
          current[i - 1],
          current[i],
          current[i + 1],
          current[i + width - 1],
          current[i + width],
          current[i + width + 1]
        ];

        const avg = neighbors.reduce((a, b) => a! + b!, 0)! / neighbors.length;
        next[i] = avg;
      }
    }

    current = next;
  }

  return current;
}

function getPixelsFromTexture(texture: Texture<ImageBitmap>) {
  const img = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  return ctx.getImageData(0, 0, img.width, img.height).data;
}
