import {
  Box3,
  CanvasTexture,
  LinearSRGBColorSpace,
  Raycaster,
  ShadowMaterial,
  Texture,
  Vector2,
  Vector3,
  Mesh,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  Color,
  MeshStandardMaterial
} from 'three';
import { filter, map, Subject } from 'rxjs';
import type { Units } from '@blue-might/units';
import assetLoader from '@blue-might/app/services/assetLoader';
import { imageBitmapToBlob } from '@blue-might/app/utils/blob';

import MapModule, {
  type MapModuleObservables,
  type MapModuleOptions,
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
import type AirVehicleUnit from '../unit/vehicle/AirVehicle';
import type { AnimationLoopValue } from '../Renderer';
import type { IntersectionListener } from '../rendererModule/Intersection';
import type {
  MapHeightMap,
  MapNoise,
  Textures,
  WaterOptions
} from '../../types/map';
import { isBuilding, isFigure, isPlant } from '../../utils/unit';
import { LOADER } from '../AssetLoader';

const DEFAULT_MAX_ALTITUDE = 3;

declare module '../Map' {
  interface ModuleStates {
    surface: Partial<State>;
  }
  interface ModuleOptions {
    surface: SurfaceModuleOptions;
  }
  interface ModuleDebug {
    surface: boolean;
  }
}

declare module '../../utils/object' {
  interface ObjectUserData {
    IGNORE_SURFACE_DETECTION: string;
  }
}

OBJECT_USER_DATA.IGNORE_SURFACE_DETECTION = 'ignoreSurfaceDetection';

interface Observables extends MapModuleObservables {
  select$: Subject<Vector2>;
  hover$: Subject<Vector2>;
}

export interface SurfaceModuleOptions extends MapModuleOptions {
  textures: {
    heightMap: string;
    backgroundTexture: string;
    foregroundTexture: string;
  };
  heightMap?: MapHeightMap | null;
  noise?: MapNoise;
  water?: WaterOptions;
  maxAltitude?: number;
}

interface State extends MapModuleState {
  terrainHeight: number;
  terrainWidth: number;
  heights: number[];
  origin: Vector3;
}

export default class SurfaceModule extends MapModule<
  SurfaceModuleOptions,
  State,
  Observables
> {
  static override TYPE = 'surface';
  private root?: Object3D;
  private surfaceData = {
    raycaster: new Raycaster(),
    position: new Vector3(0, 0, 0),
    direction: new Vector3(0, -1, 0)
  };
  private pathfinderTileTypes: (TILE_TYPE | undefined)[][] = [];

  private heightMap = new globalThis.Map<string, number>();
  private listener: IntersectionListener | undefined;
  private textures: Textures = {
    heightMap: new Texture(),
    backgroundTexture: new Texture(),
    foregroundTexture: new Texture()
  };
  size = new Vector2();

  constructor(
    map: Map,
    options: SurfaceModuleOptions,
    state: State,
    debug: boolean
  ) {
    super(
      map,
      {
        ...options,
        water: {
          enabled: options.water?.enabled ?? true,
          waterLevel: options.water?.waterLevel ?? 0,
          color: new Color(options.water?.color ?? 0x004080),
          opacity: options.water?.opacity ?? 0.9
        },
        maxAltitude: options.maxAltitude ?? DEFAULT_MAX_ALTITUDE
      },
      {
        ...state,
        terrainWidth: state.terrainWidth ?? 0,
        terrainHeight: state.terrainHeight ?? 0,
        heights: state.heights ?? [],
        origin: state.origin ?? new Vector3(0, 9, 0)
      },
      debug
    );
    //#region observables
    this.observables.select$ = new Subject<Vector2>();
    this.observables.hover$ = new Subject<Vector2>();
    //#endregion
  }

  override destroy() {
    if (this.listener) {
      this.map.app.renderer.modules.intersection.unregisterListener(
        this.listener
      );
    }
    super.destroy();
  }

  override async setup() {
    await super.setup();

    await this.loadAssets();
    const textures = this.getTextures();

    const object = await this.createMeshes();
    this.map.addToRoot(object);
    this.root = object;

    const listener =
      this.map.app.renderer.modules.intersection.registerListener();
    this.listener = listener;
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
        if (r === 166 && g === 166 && b === 166) return TILE_TYPE.BETON_ROAD; // A6A6A6
      }

      return undefined;
    }

    const { width, height } = textures.backgroundTexture!;

    this.size.set(width, height);

    // Pathfinder cells
    const cellSize = 3;
    let tileMap: (TILE_TYPE | undefined)[][] = Array.from(
      { length: height * cellSize },
      () => Array.from({ length: width / (1 / cellSize) }, () => undefined)
    );

    tileMap = await getCostsFromImage(
      textures.heightMap!,
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
      textures.foregroundTexture!,
      tileTypeByColor,
      new Vector2(width, height),
      cellSize,
      tileMap
    );

    this.pathfinderTileTypes = tileMap;
  }

  private async loadAssets() {
    const [heightMap, backgroundTexture, foregroundTexture] = await Promise.all(
      [
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.options.textures.heightMap,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.options.textures.backgroundTexture,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.options.textures.foregroundTexture,
          loader: LOADER.TEXTURE
        })
      ]
    );
    this.textures.heightMap = heightMap;
    this.textures.backgroundTexture = backgroundTexture;
    this.textures.foregroundTexture = foregroundTexture;
  }

  getWaterLevel() {
    if (this.options.water?.enabled) {
      return this.options.water.waterLevel ?? 0;
    } else {
      return 0;
    }
  }

  getRoot() {
    return this.root!;
  }

  getTextures() {
    return this.textures;
  }

  setTextures(textures: Textures) {
    this.textures = textures;
  }

  getPathfinderTileTypes() {
    return this.pathfinderTileTypes;
  }

  setWaterOptions(waterOptions: WaterOptions) {
    this.options.water = waterOptions;
  }

  setHeightMapOptions(heightMapOptions: MapHeightMap) {
    this.options.heightMap = heightMapOptions;
  }

  getNoiseOptions() {
    return this.options.noise;
  }

  setNoiseOptions(noiseOptions: MapNoise) {
    this.options.noise = noiseOptions;
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

    const { terrainWidth, terrainHeight, heights, origin } = this.state;

    const segments = terrainWidth;
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

  getAvgHeightAt(
    x: number,
    z: number,
    sampleDistance = 1,
    func = this.getHeightAt.bind(this)
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
    func = this.getHeightAt.bind(this)
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

  private cachePrecision = 5;
  private heightCache: { [key: string]: { [key: string]: number } } = {};
  private resetHeightCache() {
    this.heightCache = {};
  }

  public resetHeightCacheAt(x: number, z: number) {
    const x_ = x.toPrecision(this.cachePrecision);
    const z_ = z.toPrecision(this.cachePrecision);
    if (this.heightCache[x_]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.heightCache[x_][z_];
    }
  }

  private getHeightFromRaycast(
    x: number,
    z: number,
    unitFilter?: (unit: Unit) => boolean,
    maxDistance = 20,
    ignoreCache?: boolean
  ): number {
    const x_ = x.toPrecision(this.cachePrecision);
    const z_ = z.toPrecision(this.cachePrecision);

    if (this.heightCache[x_] && this.heightCache[x_][z_] && !ignoreCache) {
      return this.heightCache[x_][z_];
    }

    this.surfaceData.position.set(x, maxDistance, z);

    const raycaster = this.surfaceData.raycaster;
    raycaster.far = maxDistance;
    raycaster.set(this.surfaceData.position, this.surfaceData.direction);

    let allMeshes: Object3D[] = [];
    this.map.modules.units.getUnits().forEach(unit => {
      if ((!unitFilter || unitFilter(unit)) && !isFigure(unit)) {
        allMeshes.push(...getAllMeshes(unit.root));
      }
    });

    allMeshes = allMeshes.filter(
      mesh =>
        !mesh.userData[OBJECT_USER_DATA.IGNORE_RAYCASTER] ||
        !mesh.userData[OBJECT_USER_DATA.IGNORE_SURFACE_DETECTION]
    );

    const intersections = raycaster.intersectObjects(allMeshes, true);
    const unitIntersections = intersections.map(intersection => ({
      intersection,
      unit: this.map.app
        .getScene()
        .getObjectById(
          intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]
        )?.userData.unit as Units
    }));
    let groundHeight = this.getHeightAt(x, z);

    if (unitIntersections.length > 0) {
      const { intersection, unit } = unitIntersections[0]!;

      if ('airVehicle' in unit.modules) {
        const airModule = (unitIntersections[0]?.unit as AirVehicleUnit)
          ?.modules.airVehicle;
        const isFlying =
          airModule &&
          airModule.getFlightStatus() === FLIGHT_STATUS.FLYING &&
          unitIntersections[0]!.intersection.point.y - groundHeight > 1;

        if (isFlying) {
          return groundHeight;
        }
        groundHeight = intersection.point.y;
        // groundHeight -= unit.modules.airVehicle.getGearsHeight();
      } else {
        groundHeight = intersection.point.y;
      }
    }

    this.heightCache[x_] = this.heightCache[x_] || {};
    this.heightCache[x_][z_] = groundHeight;

    return groundHeight;
  }

  getTerrainHeightAt(
    x: number | Vector2,
    z?: number,
    _ignoredUnits: Unit[] = [],
    maxDistance?: number
  ): number {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }
    return this.getHeightFromRaycast(
      x,
      z!,
      () => false,
      // !ignoredUnits.includes(unit) &&
      // !!(unit as BuildingUnit).modules.building,
      maxDistance
    );
  }

  getTerrainInfoAt(
    x: number | Vector2,
    z: number,
    ignoredUnits: Unit[] = [],
    maxDistance = 10
  ): {
    position: Vector3;
    unit?: Unit;
  } {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }

    this.surfaceData.position.set(x, maxDistance, z!);

    const raycaster = this.surfaceData.raycaster;
    raycaster.far = maxDistance;
    raycaster.set(this.surfaceData.position, this.surfaceData.direction);

    let allMeshes: Object3D[] = [];
    this.map.modules.units.getUnits().forEach(unit => {
      if (!ignoredUnits.includes(unit) && unit instanceof BuildingUnit) {
        allMeshes.push(...getAllMeshes(unit.root));
      }
    });

    allMeshes = allMeshes.filter(
      mesh =>
        !mesh.userData[OBJECT_USER_DATA.IGNORE_RAYCASTER] ||
        !mesh.userData[OBJECT_USER_DATA.IGNORE_SURFACE_DETECTION]
    );

    const intersections = raycaster.intersectObjects(allMeshes, false);
    const height = this.getHeightAt(x, z);

    if (intersections.length > 0) {
      const height_ = intersections[0]!.point.y;
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

  private getGroundHeights(segments = 64) {
    const heightMap = this.getTextures().heightMap!;
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
    const textures = this.getTextures();
    const backgroundTexture = textures.backgroundTexture!;

    // Terrain-Dimensionen
    const dimension = new Vector2(
      backgroundTexture.width,
      backgroundTexture.height
    );

    this.state.terrainWidth = dimension.x;
    this.state.terrainHeight = dimension.y;

    const segments = this.state.terrainWidth;
    const heights = this.getGroundHeights(segments);
    this.state.heights = heights;

    for (let i = 0; i < heights.length; i++) {
      const vx = i % (segments + 1); // Vertex-X (0 bis segments)
      const vz = Math.floor(i / (segments + 1)); // Vertex-Z (0 bis segments)

      // Weltkoordinaten berechnen (Terrain zentriert um (0,0))
      const worldX =
        (vx / segments) * this.state.terrainWidth - this.state.terrainWidth / 2;
      const worldZ =
        (vz / segments) * this.state.terrainHeight -
        this.state.terrainHeight / 2;

      // Schlüssel runden wie in getHeightAt
      const key = `${Math.round(worldX * 1000) / 1000}_${Math.round(worldZ * 1000) / 1000}`;
      this.heightMap.set(key, heights[i]! - 0.9);
    }

    const foregroundTexture = textures.foregroundTexture!;

    let noiseTexture: CanvasTexture | null = null;
    if (this.options.noise?.enable) {
      const { size, intensity, opacity, monochrome } = this.options.noise;
      noiseTexture = new CanvasTexture(
        resizeCanvas(
          generateNoiseTexture({
            width: dimension.x * size,
            height: dimension.y * size,
            intensity,
            opacity,
            monochrome: monochrome
          }),
          foregroundTexture.image.width
        )
      );
    }
    const combinedTexture = combineTerrainTextures(
      dimension,
      {
        heightMap: this.options.heightMap ?? null,
        noise: this.options.noise ?? null
      },
      {
        ...textures,
        noiseTexture
      }
    );

    const geometry = new PlaneGeometry(
      dimension.x,
      dimension.y,
      segments,
      segments
    );
    geometry.rotateX(-Math.PI / 2);

    const vertexCount = (segments + 1) * (segments + 1);
    for (let i = 0; i < vertexCount; i++) {
      geometry.attributes.position!.setY(i, heights[i]! * -10);
    }

    geometry.computeVertexNormals();

    // Einziges Material mit kombinierter Texture
    const terrainMaterial = new MeshStandardMaterial({
      map: combinedTexture,
      flatShading: true,
      wireframe: false,
      roughness: 1
    });

    const backgroundTerrain = new Mesh(geometry, terrainMaterial);
    backgroundTerrain.name = 'Terrain Background';

    const shadowTerrain = new Mesh(geometry, new ShadowMaterial());
    shadowTerrain.name = 'Ground Shadow';
    shadowTerrain.receiveShadow = true;

    const object = new Object3D();
    object.add(backgroundTerrain);
    object.add(shadowTerrain);
    if (this.options.water?.enabled) {
      object.add(this.createWater(dimension)!);
    }
    object.position.copy(new Vector3(0, 9, 0));

    this.backgroundMeshes = {
      terrain: backgroundTerrain,
      shadow: shadowTerrain
    };

    // origin speichern, damit Abfragen korrekt transformieren
    this.state.origin.copy(object.position);
    return object;
  }

  backgroundMeshes?: {
    terrain: Mesh;
    shadow: Mesh;
  };

  private lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue): void {
    if ((time - this.lastUpdateTime) / 1000 < 1 / 2) {
      return;
    }
    this.lastUpdateTime = time;
    this.resetHeightCache();
  }

  private createWater(dimension: Vector2) {
    if (!this.options.water) return null;
    const waterMaterial = new MeshStandardMaterial({
      color: this.options.water.color,
      flatShading: true,
      wireframe: false,
      transparent: true,
      opacity: this.options.water.opacity ?? 0.8
    });

    const waterGeometry = new PlaneGeometry(dimension.x, dimension.y, 1, 1);
    waterGeometry.rotateX(-Math.PI / 2);
    waterGeometry.translate(0, -9 + this.getWaterLevel(), 0);

    const water = new Mesh(waterGeometry, waterMaterial);
    water.name = 'water';
    return water;
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

  // updateHeightAt(x: number, z: number, newHeight: number) {
  //   const key = `${x}_${z}`;
  //   this.heightMap.set(key, newHeight);
  //   this.surfaceHeightMap.set(key, newHeight + this.getSeaLevel()); // Passe an
  // }

  // Optimierte getHeightAt: Cache prüfen, sonst Raycast und speichern
  getHeightAt(x: number, z: number): number {
    const key = `${Math.round(x * 1000) / 1000}_${Math.round(z * 1000) / 1000}`; // Runde für Konsistenz
    if (this.heightMap.has(key)) {
      return this.heightMap.get(key)!;
    }
    const height = this.performRaycastForHeight(x, z);
    this.heightMap.set(key, height);
    return height;
  }

  // Ähnlich für getSurfaceHeightAt
  getSurfaceHeightAt(
    x: number,
    z: number,
    unitFilter?: (unit: Unit) => boolean,
    options?: {
      raycaster?: boolean;
      raycasterDistance?: number;
      ignoreCache?: boolean;
    }
  ): number {
    unitFilter = unitFilter ?? (() => true);
    if (options?.raycaster) {
      return this.performRaycastForSurfaceHeight(
        x,
        z,
        unitFilter,
        options?.raycasterDistance,
        options?.ignoreCache
      );
    }

    const testUnits = this.map.modules.units.getUnitsInRadius(
      new Vector3(x, 0, z),
      0.1,
      unit => isBuilding(unit) && !isPlant(unit) && unitFilter(unit)
    );

    testUnits.sort((a, b) => a.unit.getPosition().y - b.unit.getPosition().y);

    if (testUnits.length > 0) {
      // Bounding-Box der ersten Unit berechnen und minY abrufen
      const unit = testUnits[0]!.unit;
      const box = new Box3().setFromObject(
        unit.modules.collision.getDefaultCollisionObject() ?? unit.root
      );

      return box.max.y;
    }
    return this.getHeightByHeightMapTexture(x, z);
  }

  private getHeightByHeightMapTexture(x: number, z: number): number {
    const depth = this.getDepthAt(x, z);
    return depth * -10 + this.state.origin.y;
  }

  // Hilfsmethoden für Raycast (dein bestehender Code)
  private performRaycastForHeight(x: number, z?: number): number {
    const depth = this.getDepthAt(x, z);
    // gleiche Transformation wie im Mesh: vertices Y = depth * -10; object.position.y = 9
    return depth * -10 + this.state.origin.y;
  }

  performRaycastForSurfaceHeight(
    x: number | Vector2,
    z: number | undefined = undefined,
    unitFilter: (unit: Unit) => boolean = () => true,
    maxDistance?: number,
    ignoreCache?: boolean
  ): number {
    if (x instanceof Vector2) {
      z = x.y;
      x = x.x;
    }
    const height = this.getHeightFromRaycast(
      x,
      z!,
      unitFilter,
      maxDistance ?? 20,
      ignoreCache
    );
    return height;
  }

  override async getOptions() {
    const textures = Object.fromEntries(
      await Promise.all(
        Object.entries(this.textures).map(async ([key, texture]) => {
          return [
            key,
            URL.createObjectURL(await imageBitmapToBlob(texture.image))
          ];
        })
      )
    );

    return {
      textures: textures,
      heightMap: this.options.heightMap ?? {
        operation: 'darken'
      },
      noise: this.options.noise ?? {
        enable: false,
        size: 2,
        intensity: 0.25,
        opacity: 0.5,
        monochrome: false,
        operation: 'multiply'
      },
      water: this.options.water ?? {
        enabled: true,
        waterLevel: 0,
        color: new Color(0x004080)
      },
      maxAltitude: this.options.maxAltitude ?? DEFAULT_MAX_ALTITUDE
    };
  }

  getDefaultAltitude() {
    return DEFAULT_MAX_ALTITUDE;
  }

  getMaxAltitude() {
    return this.options.maxAltitude ?? DEFAULT_MAX_ALTITUDE;
  }
  setMaxAltitude(value: number) {
    this.options.maxAltitude = value;
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
  dimension: Vector2,
  combine: {
    heightMap: MapHeightMap | null;
    noise: MapNoise | null;
  },
  textures: Textures & {
    noiseTexture?: CanvasTexture<HTMLCanvasElement> | null;
  },
  operation?: {
    noise: GlobalCompositeOperation;
    heightMap: GlobalCompositeOperation;
  }
): CanvasTexture {
  let canvas: HTMLCanvasElement | OffscreenCanvas =
    document.createElement('canvas');
  canvas.width = dimension.x;
  canvas.height = dimension.y;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D =
    canvas.getContext('2d')!;

  ctx.drawImage(
    textures.backgroundTexture.image,
    0,
    0,
    dimension.x,
    dimension.y
  );

  if (combine.heightMap?.include) {
    ctx.globalCompositeOperation = operation?.heightMap ?? 'multiply';
    ctx.globalAlpha = 1;
    ctx.drawImage(
      textures.heightMap.image,
      0,
      0,
      textures.heightMap.width,
      textures.heightMap.height,
      0,
      0,
      dimension.x,
      dimension.y
    );
  }

  // Canvas resize for foreground texture
  canvas = resizeCanvas(canvas, textures.foregroundTexture.image.width);

  ctx = canvas.getContext('2d')!;

  if (textures.noiseTexture) {
    ctx.globalCompositeOperation = operation?.noise ?? 'multiply';
    // ctx.globalAlpha = 0.5;
    ctx.drawImage(
      textures.noiseTexture.image,
      0,
      0,
      textures.noiseTexture.width,
      textures.noiseTexture.height
    );
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  ctx.drawImage(
    textures.foregroundTexture.image,
    0,
    0,
    textures.foregroundTexture.image.width,
    textures.foregroundTexture.image.height
  );

  // Zurück zu Default

  const combinedTexture = new CanvasTexture(canvas);
  combinedTexture.minFilter = NearestFilter;
  combinedTexture.magFilter = NearestFilter;
  combinedTexture.generateMipmaps = false;
  combinedTexture.colorSpace = LinearSRGBColorSpace;
  return combinedTexture;
}
