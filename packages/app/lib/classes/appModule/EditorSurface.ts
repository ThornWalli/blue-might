import { ReplaySubject } from 'rxjs';
import { Color, type Texture } from 'three';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import {
  DEFAULT_MAP_NOISE,
  type MapHeightMap,
  type MapNoise,
  type Textures,
  type WaterOptions
} from '../../types/map';

interface Observables extends AppModuleObservables {
  textures$: ReplaySubject<TextureDescription[]>;
  noiseOptions$: ReplaySubject<MapNoise>;
  noiseMonochrome$: ReplaySubject<boolean>;
  waterOptions$: ReplaySubject<WaterOptions>;
  heightMapOptions$: ReplaySubject<MapHeightMap>;
  maxAltitude$: ReplaySubject<number>;
}

export interface TextureDescription {
  key: string;
  texture: Texture<ImageBitmap>;
}

interface State extends AppModuleState {
  maxAltitude: number;
  textures: TextureDescription[];
  noise: MapNoise;
  noiseMonochrome: boolean;
  waterOptions: WaterOptions;
  heightMapOptions: MapHeightMap;
}
export default class EditorSurfaceAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorSurface';
  constructor(app: App) {
    super(app, {
      maxAltitude: 0,
      textures: [],
      noise: {
        ...DEFAULT_MAP_NOISE
      },
      noiseMonochrome: false,
      waterOptions: {
        enabled: false,
        color: new Color(0x004080),
        waterLevel: 0,
        opacity: 0.9
      },
      heightMapOptions: {
        operation: 'darken',
        include: false
      }
    });
    //#region observables
    this.observables.textures$ = new ReplaySubject<TextureDescription[]>(1);
    this.observables.noiseOptions$ = new ReplaySubject<MapNoise>(1);
    this.observables.noiseOptions$.next(this.state.noise);
    this.observables.noiseMonochrome$ = new ReplaySubject<boolean>(1);
    this.observables.noiseMonochrome$.next(this.state.noiseMonochrome);
    this.observables.waterOptions$ = new ReplaySubject<WaterOptions>(1);
    this.observables.waterOptions$.next(this.state.waterOptions);
    this.observables.heightMapOptions$ = new ReplaySubject<MapHeightMap>(1);
    this.observables.heightMapOptions$.next(this.state.heightMapOptions);
    this.observables.maxAltitude$ = new ReplaySubject<number>(1);
    this.observables.maxAltitude$.next(this.state.maxAltitude);
    //#endregion
  }

  override async setup() {
    this.subscription.add(
      this.app.modules.map.observables.map$.subscribe(map => {
        this.setTextures(
          Object.entries(map.modules.surface.getTextures()).map(
            ([key, texture]) => {
              return {
                key,
                texture
              };
            }
          )
        );

        this.setMaxAltitude(map.modules.surface.options.maxAltitude ?? 0);
        this.setHeightMapOptions(map.modules.surface.options.heightMap ?? {});
        this.setNoiseOptions(
          map.modules.surface.options.noise ?? DEFAULT_MAP_NOISE
        );
        this.setWaterOptions(map.modules.surface.options.water ?? {});
      })
    );
  }

  getTextures() {
    return this.state.textures;
  }

  setTextures(textures: TextureDescription[]) {
    this.state.textures = textures;
    this.observables.textures$.next(this.state.textures);
  }

  getNoiseOptions() {
    return this.state.noise;
  }

  setNoiseOptions(noise: Partial<MapNoise>) {
    this.state.noise = { ...this.state.noise, ...noise };
    this.observables.noiseOptions$.next(this.state.noise);
  }

  getWaterOptions() {
    return this.state.waterOptions;
  }

  getMaxAltitude() {
    return this.state.maxAltitude;
  }

  setWaterOptions(waterOptions: Partial<WaterOptions>) {
    this.state.waterOptions = { ...this.state.waterOptions, ...waterOptions };
    this.observables.waterOptions$.next(this.state.waterOptions);
  }

  getHeightMapOptions() {
    return this.state.heightMapOptions;
  }

  setMaxAltitude(maxAltitude: number) {
    this.state.maxAltitude = maxAltitude;
    this.observables.maxAltitude$.next(maxAltitude);
  }

  setHeightMapOptions(heightMapOptions: Partial<MapHeightMap>) {
    this.state.heightMapOptions = {
      ...this.state.heightMapOptions,
      ...heightMapOptions
    };
    this.observables.heightMapOptions$.next(this.state.heightMapOptions);
  }

  // setAltitudeOptions(options: Partial<MapHeightMap>) {
  //   this.setHeightMapOptions(options);
  // }

  async apply() {
    const map = this.app.modules.map.getMap()!;
    const surface = map.modules.surface;
    surface.setTextures(
      this.state.textures.reduce((acc, cur) => {
        acc[cur.key as keyof Textures] = cur.texture;
        return acc;
      }, {} as Textures)
    );

    surface.setHeightMapOptions(this.getHeightMapOptions());
    surface.setNoiseOptions(this.getNoiseOptions());
    surface.setWaterOptions(this.getWaterOptions());
    surface.setMaxAltitude(this.getMaxAltitude());

    await this.app.modules.map.restartMap(await map.toDescription());
  }
}
