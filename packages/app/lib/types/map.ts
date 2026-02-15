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
import type { ModuleDebug } from '../classes/Map';
import type { RawUnitDescription } from '../classes/Unit';

export interface Textures {
  heightMap: Texture<ImageBitmap>;
  backgroundTexture: Texture<ImageBitmap>;
  foregroundTexture: Texture<ImageBitmap>;
}

export interface MapDescription {
  debug?: Partial<ModuleDebug>;
  meta: Meta;
  playerOptions: RawPlayerOptions;
  fogOptions?: RawFogOptions;
  surface: {
    textures: {
      heightMap: string;
      backgroundTexture: string;
      foregroundTexture: string;
    };
    heightMapInclude?: boolean;
    noise?: MapNoise;
  };
  units: RawUnitDescription[];
  factions: FactionDescription[];
}

export interface MapNoise {
  active: boolean;
  size: number;
  intensity: number;
  opacity: number;
  monochrome: boolean;
}

export const DEFAULT_MAP_NOISE = Object.freeze<MapNoise>({
  active: false,
  size: 2,
  intensity: 0.25,
  opacity: 0.5,
  monochrome: false
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
