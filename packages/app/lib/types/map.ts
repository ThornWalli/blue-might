import type { UnitDescriptions } from '@blue-might/units';
import type {
  Color,
  Euler,
  EulerTuple,
  Texture,
  Vector3,
  Vector3Tuple
} from 'three';

import type { FactionDescription, FactionIdentifier } from '../classes/Faction';
import type { ModuleOptions, ModuleStates } from '../classes/Map';
import type { ModuleDebug, RawUnitDescription } from '../classes/Unit';

export interface Textures {
  heightMap: Texture<ImageBitmap>;
  backgroundTexture: Texture<ImageBitmap>;
  foregroundTexture: Texture<ImageBitmap>;
}

export interface MapDescription extends LegacyMapDescription {
  meta: Meta;
  playerOptions: RawPlayerOptions;
  fogOptions?: RawFogOptions;
  waterOptions?: RawWaterOptions;
  moduleOptions: Partial<ModuleOptions>;
  moduleStates?: Partial<ModuleStates>;
  moduleDebug?: Partial<ModuleDebug>;
}

interface LegacyMapDescription {
  /**
   * @deprecated
   */
  debug?: Partial<ModuleDebug>;
  /**
   * @deprecated
   */
  surface?: {
    textures: {
      heightMap: string;
      backgroundTexture: string;
      foregroundTexture: string;
    };
    heightMap?: MapHeightMap;
    noise?: MapNoise;
  };
  /**
   * @deprecated
   */
  factions?: FactionDescription[];
  /**
   * @deprecated
   */
  units?: RawUnitDescription[];
}

export interface MapHeightMap {
  include: boolean;
  operation?: GlobalCompositeOperation;
}

export const DEFAULT_MAP_HEIGHT_MAP = Object.freeze<MapHeightMap>({
  include: false,
  operation: 'multiply'
});

export interface MapNoise {
  enable: boolean;
  size: number;
  intensity: number;
  opacity: number;
  monochrome: boolean;
  operation?: GlobalCompositeOperation;
}

export const DEFAULT_MAP_NOISE = Object.freeze<MapNoise>({
  enable: false,
  size: 2,
  intensity: 0.25,
  opacity: 0.5,
  monochrome: false,
  operation: 'multiply'
});

export interface RawPlayerOptions<
  UD extends UnitDescriptions = UnitDescriptions,
  V3 = Vector3Tuple,
  E = EulerTuple
> {
  unit: UD;
  position: V3;
  rotation?: E;
  faction: FactionIdentifier;
  unitDebug?: Partial<ModuleDebug>;
}

export type PlayerOptions<UD extends UnitDescriptions = UnitDescriptions> =
  RawPlayerOptions<UD, Vector3, Euler>;

export interface Meta {
  name: string;
  description?: string | null;
}

export interface RawFogOptions<C = number[]> {
  enabled: boolean;
  color: C;
  fogDistance: number;
}

export type FogOptions = RawFogOptions<Color>;

export interface RawWaterOptions<C = number[]> {
  enabled: boolean;
  color: C;
  waterLevel: number;
  opacity: number;
}

export type WaterOptions = RawWaterOptions<Color>;
