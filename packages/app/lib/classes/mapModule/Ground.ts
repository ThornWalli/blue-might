import {
  CanvasTexture,
  LinearSRGBColorSpace,
  Raycaster,
  ShadowMaterial,
  Vector2,
  Vector3,
  type Texture
} from 'three';
import {
  Mesh,
  MeshLambertMaterial,
  NearestFilter,
  Object3D,
  PlaneGeometry
} from 'three';
import { filter, map, Subject } from 'rxjs';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';
import { getCostsFromImage, TILE_TYPE } from '../../utils/pathfinding';
import type Unit from '../Unit';
import { getAllMeshes, OBJECT_USER_DATA } from '../../utils/object';
import BuildingUnit from '../unit/Building';
import { generateNoiseTexture } from '../../utils/texture';
import { resizeCanvas } from '../../utils/canvas';
import { FLIGHT_STATUS } from '../unitModule/movable/airVehicle/Helicopter';
import type AirVehicleUnit from '../unit/AirVehicle';
import type { AnimationLoopValue } from '../Renderer';

declare module '../Map' {
  interface ModuleDebug {
    ground: boolean;
  }
}

interface Observables extends MapModuleObservables {
  select$: Subject<Vector2>;
  hover$: Subject<Vector2>;
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

  private root?: Object3D;
  getRoot() {
    return this.root!;
  }

  override state: State = {
    segments: 64,
    terrainHeight: 0,
    terrainWidth: 0,
    heights: [],
    origin: new Vector3(0, 9, 0)
  };

  private surfaceData = {
    raycaster: new Raycaster(),
    position: new Vector3(0, 0, 0),
    direction: new Vector3(0, -1, 0)
  };

  private pathfinderTileTypes: (TILE_TYPE | undefined)[][] = [];
  getPathfinderTileTypes() {
    return this.pathfinderTileTypes;
  }

  constructor(map: Map, debug: boolean) {
    super(map, debug);
    //#region observables
    this.observables.select$ = new Subject<Vector2>();
    this.observables.hover$ = new Subject<Vector2>();
    //#endregion
  }

  getSeaLevel() {
    return 0;
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

  getAvgHeightAt(
    x: number,
    z: number,
    sampleDistance = 1,
    func = this.map.modules.ground.getHeightAt.bind(this.map.modules.ground)
  ): number {
    const directions = [
      [0, 0],
      [0, sampleDistance],
      [sampleDistance, sampleDistance],
      [sampleDistance, 0]
    ];
    return (
      directions.reduce((acc, [dx, dz]) => {
        return acc + func(Math.round(x + dx!), Math.round(z + dz!));
      }, 0) / directions.length
    );
  }

  getMaxHeightAt(
    x: number,
    z: number,
    sampleDistance = 1,
    func = this.map.modules.ground.getHeightAt.bind(this.map.modules.ground)
  ): number {
    const directions = [
      [0, 0],
      [0, sampleDistance],
      [sampleDistance, sampleDistance],
      [sampleDistance, 0]
    ];
    return directions.reduce((acc, [dx, dz]) => {
      return Math.max(acc, func(Math.round(x + dx!), Math.round(z + dz!)));
    }, -Infinity);
  }
  getMinHeightAt(
    x: number,
    z: number,
    sampleDistance = 1,
    func = this.map.modules.ground.getHeightAt.bind(this.map.modules.ground)
  ): number {
    const directions = [
      [0, 0],
      [0, sampleDistance],
      [sampleDistance, sampleDistance],
      [sampleDistance, 0]
    ];
    return directions.reduce((acc, [dx, dz]) => {
      return Math.min(acc, func(Math.round(x + dx!), Math.round(z + dz!)));
    }, Infinity);
  }

  private cachePrecision = 5;
  private heightCache: { [key: string]: { [key: string]: number } } = {};
  private resetHeightCache() {
    this.heightCache = {};
  }

  private getHeightFromRaycast(
    x: number,
    z: number,
    ignoredUnits: Unit[] = [],
    unitFilter?: (unit: Unit) => boolean,
    maxDistance = 100
  ): number {
    const x_ = x.toPrecision(this.cachePrecision);
    const z_ = z.toPrecision(this.cachePrecision);

    if (this.heightCache[x_] && this.heightCache[x_][z_]) {
      return this.heightCache[x_][z_];
    }

    this.surfaceData.position.set(x, 50, z);

    const raycaster = this.surfaceData.raycaster;
    raycaster.far = maxDistance;
    raycaster.set(this.surfaceData.position, this.surfaceData.direction);

    const allMeshes: Object3D[] = [];
    this.map.modules.units.getUnits().forEach(unit => {
      if (!ignoredUnits.includes(unit) && (!unitFilter || unitFilter(unit))) {
        allMeshes.push(...getAllMeshes(unit.root));
      }
    });

    const intersections = raycaster.intersectObjects(allMeshes, true);
    const unitIntersections = intersections.map(intersection => ({
      intersection,
      unit: this.map.app
        .getScene()
        .getObjectById(
          intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]
        )?.userData.unit as Unit
    }));
    const groundHeight = this.getHeightAt(x, z);

    if (unitIntersections.length > 0) {
      const airModule = (unitIntersections[0]?.unit as AirVehicleUnit)?.modules
        .airVehicle;

      const isFlying =
        airModule &&
        airModule.getFlightStatus() === FLIGHT_STATUS.FLYING &&
        unitIntersections[0]!.intersection.point.y - groundHeight > 1;

      if (isFlying) {
        return groundHeight;
      }

      return unitIntersections[0]!.intersection.point.y;
    }

    this.heightCache[x_] = this.heightCache[x_] || {};
    this.heightCache[x_][z_] = groundHeight;

    return groundHeight;
  }

  getSurfaceHeightAt(
    x: number | Vector2,
    z?: number,
    ignoredUnits: Unit[] = [],
    maxDistance = 100
  ): number {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }
    const height = this.getHeightFromRaycast(
      x,
      z!,
      ignoredUnits,
      undefined,
      maxDistance
    );
    return height;
  }

  getTerrainHeightAt(
    x: number | Vector2,
    z?: number,
    ignoredUnits: Unit[] = [],
    maxDistance = 100
  ): number {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }
    return this.getHeightFromRaycast(
      x,
      z!,
      ignoredUnits,
      unit => unit instanceof BuildingUnit,
      maxDistance
    );
  }

  getTerrainInfoAt(
    x: number | Vector2,
    z?: number,
    ignoredUnits: Unit[] = [],
    maxDistance = 100
  ): {
    position: Vector3;
    unit?: Unit;
  } {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }

    this.surfaceData.position.set(x, 50, z!);

    const raycaster = this.surfaceData.raycaster;
    raycaster.far = maxDistance;
    raycaster.set(this.surfaceData.position, this.surfaceData.direction);

    const allMeshes: Object3D[] = [];
    this.map.modules.units.getUnits().forEach(unit => {
      if (!ignoredUnits.includes(unit) && unit instanceof BuildingUnit) {
        allMeshes.push(...getAllMeshes(unit.root));
      }
    });

    const intersections = raycaster.intersectObjects(allMeshes, false);
    const height = this.getHeightAt(x, z);

    if (intersections.length > 0) {
      const height_ = intersections[0]!.point.y;
      // Optional: Zusätzliche Logik, wenn nötig (z. B. Flying-Check)
      return {
        unit: this.map.app
          .getScene()
          .getObjectById(
            intersections[0]!.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]
          )?.userData.unit as Unit,
        position: new Vector3(x, height_, z)
      };
    }
    return {
      position: new Vector3(x, height, z)
    };
  }

  // getTerrainInfoAt(
  //   x: number | Vector2,
  //   z?: number,
  //   ignoredUnits: Unit[] = [],
  //   maxDistance = 100
  // ): {
  //   position: Vector3;
  //   unit?: Unit;
  // } {
  //   if (x instanceof Vector2) {
  //     z = x.y;
  //     x = x.x;
  //   }

  //   this.surfaceData.position.set(x, 50, z!);

  //   const raycaster = this.surfaceData.raycaster;
  //   raycaster.far = maxDistance; // Maximale Distanz
  //   raycaster.set(this.surfaceData.position, this.surfaceData.direction);

  //   const allMeshes: Object3D[] = [];
  //   this.map.modules.units.getUnits().forEach(unit => {
  //     if (!ignoredUnits.includes(unit) && unit instanceof BuildingUnit) {
  //       allMeshes.push(...getAllMeshes(unit.root));
  //     }
  //   });

  //   const intersections = raycaster.intersectObjects(allMeshes, false);
  //   const height = this.getSurfaceHeightAt(x, z, ignoredUnits);

  //   if (intersections.length > 0) {
  //     let height_ = intersections[0]!.point.y;
  //     if (intersections[0]!.point.y - height > 1) {
  //       height_ = height;
  //     }
  //     return {
  //       unit: this.map.app
  //         .getScene()
  //         .getObjectById(
  //           intersections[0]!.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]
  //         )?.userData.unit as Unit,
  //       position: new Vector3(x, height_, z)
  //     };
  //   }
  //   return {
  //     position: new Vector3(x, height, z)
  //   };
  // }

  private createRaycaster() {
    const raycaster = new Raycaster();
    this.surfaceData.raycaster = raycaster;
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

  async createMeshes() {
    const backgroundTexture = this.map.textures.backgroundTexture!;

    const width = backgroundTexture.width; // Terraingröße
    const height = backgroundTexture.height;

    this.state.terrainWidth = width;
    this.state.terrainHeight = height;

    const segments = this.state.segments;
    const heights = this.getGroundHeights(segments);
    this.state.heights = heights;

    const foregroundTexture = this.map.textures.foregroundTexture!;
    const noiseTexture = new CanvasTexture(
      resizeCanvas(
        generateNoiseTexture({
          width: width * 2,
          height: height * 2,
          intensity: 0.25,
          opacity: 1,
          monochrome: this.map.description.ground.noiseMonochrome ?? false
        }),
        foregroundTexture.image.width
      )
    );

    const combinedTexture = combineTerrainTextures(
      backgroundTexture,
      noiseTexture,
      foregroundTexture,
      width,
      height
    );

    const geometry = new PlaneGeometry(width, height, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const vertexCount = (segments + 1) * (segments + 1);
    for (let i = 0; i < vertexCount; i++) {
      geometry.attributes.position!.setY(i, heights[i]! * -10);
    }

    geometry.computeVertexNormals();

    // Einziges Material mit kombinierter Texture
    const terrainMaterial = new MeshLambertMaterial({
      map: combinedTexture,
      flatShading: true,
      wireframe: false
    });

    const backgroundTerrain = new Mesh(geometry, terrainMaterial);
    backgroundTerrain.name = 'Terrain Background';

    const shadowTerrain = new Mesh(geometry, new ShadowMaterial());
    shadowTerrain.name = 'Ground Shadow';
    shadowTerrain.receiveShadow = true;

    const waterMaterial = new MeshLambertMaterial({
      color: 0x004080,
      flatShading: true,
      wireframe: false,
      transparent: true,
      opacity: 0.9
    });

    const waterGeometry = new PlaneGeometry(width, height, 1, 1);
    waterGeometry.rotateX(-Math.PI / 2);
    waterGeometry.translate(0, -9, 0);

    const water = new Mesh(waterGeometry, waterMaterial);
    water.name = 'water';

    const object = new Object3D();
    object.add(backgroundTerrain);
    object.add(shadowTerrain);
    object.add(water);
    object.position.copy(new Vector3(0, 9, 0));
    // origin speichern, damit Abfragen korrekt transformieren
    this.state.origin.copy(object.position);
    return object;
  }

  private lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue): void {
    if ((time - this.lastUpdateTime) / 1000 < 1 / 2) {
      return;
    }
    this.lastUpdateTime = time;
    this.resetHeightCache();
  }

  override async setup() {
    await super.setup();

    const object = await this.createMeshes();
    this.map.addToRoot(object);
    this.root = object;

    const listener =
      this.map.app.renderer.modules.intersection.registerListener();
    listener.addMeshes(Array.from(object.children));

    this.subscription.add(
      listener.clickIntersect$.subscribe(intersect => {
        this.observables.select$?.next(
          new Vector2(intersect.point.x, intersect.point.z)
        );
      })
    );
    this.subscription.add(
      listener.hoverIntersect$
        .pipe(
          map(intersections => intersections[0]),
          filter(Boolean)
        )
        .subscribe(intersect => {
          this.observables.hover$?.next(
            new Vector2(intersect.point.x, intersect.point.z)
          );
        })
    );

    function tileTypeByColor(
      r: number,
      g: number,
      b: number,
      a: number
    ): TILE_TYPE | undefined {
      if (a > 128) {
        if (r === 166 && g === 166 && b === 166) return TILE_TYPE.BETON_ROAD; // D9D9D9
      }

      return undefined;
    }

    const { width, height } = this.map.textures.backgroundTexture!;

    // Pathfinder cells
    const cellSize = 3;
    let tileMap: (TILE_TYPE | undefined)[][] = Array.from(
      { length: height / cellSize },
      () => Array.from({ length: width / cellSize }, () => undefined)
    );

    tileMap = await getCostsFromImage(
      this.map.textures.heightMap!,
      (r, g, b) => {
        const maxSeaLevel = 255 * 0.9;

        if (r > maxSeaLevel && g > maxSeaLevel && b > maxSeaLevel) {
          return TILE_TYPE.WATER;
        } else {
          return TILE_TYPE.GRASS;
        }
      },
      new Vector2(width, height),
      cellSize,
      tileMap
    );

    tileMap = await getCostsFromImage(
      this.map.textures.foregroundTexture!,
      tileTypeByColor,
      new Vector2(width, height),
      cellSize,
      tileMap
    );

    this.pathfinderTileTypes = tileMap;
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

function combineTerrainTextures(
  backgroundTexture: Texture<ImageBitmap>,
  noiseTexture: CanvasTexture<HTMLCanvasElement>,
  foregroundTexture: Texture<ImageBitmap>,
  width: number,
  height: number
): CanvasTexture {
  let canvas: HTMLCanvasElement | OffscreenCanvas =
    document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D =
    canvas.getContext('2d')!;

  ctx.drawImage(backgroundTexture.image, 0, 0, width, height);
  // Canvas resize for foreground texture
  canvas = resizeCanvas(canvas, foregroundTexture.image.width);

  ctx = canvas.getContext('2d')!;

  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(
    noiseTexture.image,
    0,
    0,
    noiseTexture.width,
    noiseTexture.height
  );

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  ctx.drawImage(
    foregroundTexture.image,
    0,
    0,
    foregroundTexture.image.width,
    foregroundTexture.image.height
  );

  // Zurück zu Default

  const combinedTexture = new CanvasTexture(canvas);
  combinedTexture.minFilter = NearestFilter;
  combinedTexture.magFilter = NearestFilter;
  combinedTexture.generateMipmaps = false;
  combinedTexture.colorSpace = LinearSRGBColorSpace;
  return combinedTexture;
}
