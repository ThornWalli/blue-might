import { ReplaySubject } from 'rxjs';
import type { Texture } from 'three';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import { DEFAULT_MAP_NOISE, type MapNoise, type Textures } from '../Map';

interface Observables extends AppModuleObservables {
  textures$: ReplaySubject<TextureDescription[]>;
  heightMapInclude$: ReplaySubject<boolean>;
  noise$: ReplaySubject<MapNoise>;
  noiseMonochrome$: ReplaySubject<boolean>;
}

export interface TextureDescription {
  key: string;
  texture: Texture<ImageBitmap>;
}

interface State extends AppModuleState {
  textures: TextureDescription[];
  heightMapInclude: boolean;
  noise: MapNoise;
  noiseMonochrome: boolean;
}
export default class EditorSurfaceAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorSurface';
  override state: State = {
    textures: [],
    heightMapInclude: false,
    noise: {
      ...DEFAULT_MAP_NOISE
    },
    noiseMonochrome: false
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.textures$ = new ReplaySubject<TextureDescription[]>(1);
    this.observables.heightMapInclude$ = new ReplaySubject<boolean>(1);
    this.observables.heightMapInclude$.next(this.state.heightMapInclude);
    this.observables.noise$ = new ReplaySubject<MapNoise>(1);
    this.observables.noise$.next(this.state.noise);
    this.observables.noiseMonochrome$ = new ReplaySubject<boolean>(1);
    this.observables.noiseMonochrome$.next(this.state.noiseMonochrome);
    //#endregion
  }

  override async setup() {
    this.subscription.add(
      this.app.modules.map.observables.map$.subscribe(map => {
        this.setTextures(
          Object.entries(map.getTextures()).map(([key, texture]) => {
            return {
              key,
              texture
            };
          })
        );
        this.setHeightMapInclude(
          map.description.surface.heightMapInclude ?? false
        );
        this.setNoise(map.description.surface.noise ?? DEFAULT_MAP_NOISE);
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

  getHeightMapInclude() {
    return this.state.heightMapInclude;
  }

  setHeightMapInclude(heightMapInclude: boolean) {
    if (this.state.heightMapInclude === heightMapInclude) return;
    this.state.heightMapInclude = heightMapInclude;
    this.observables.heightMapInclude$.next(this.state.heightMapInclude);
  }

  getNoise() {
    return this.state.noise;
  }

  setNoise(noise: Partial<MapNoise>) {
    this.state.noise = { ...this.state.noise, ...noise };
    this.observables.noise$.next(this.state.noise);
  }

  async apply() {
    const map = this.app.modules.map.getMap()!;
    map.setTextures(
      this.state.textures.reduce((acc, cur) => {
        acc[cur.key as keyof Textures] = cur.texture;
        return acc;
      }, {} as Textures)
    );

    map.description.surface.heightMapInclude = this.getHeightMapInclude();
    map.description.surface.noise = this.getNoise();

    await this.app.modules.map.restartMap(await map.toDescription());
  }
}
