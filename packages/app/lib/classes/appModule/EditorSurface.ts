import { ReplaySubject } from 'rxjs';
import type { Texture } from 'three';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type { Textures } from '../Map';

interface Observables extends AppModuleObservables {
  textures$: ReplaySubject<TextureDescription[]>;
  noiseMonochrome$: ReplaySubject<boolean>;
}

export interface TextureDescription {
  key: string;
  texture: Texture<ImageBitmap>;
}

interface State extends AppModuleState {
  textures: TextureDescription[];
  noiseMonochrome: boolean;
}
export default class EditorSurfaceAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorSurface';
  override state: State = {
    textures: [],
    noiseMonochrome: false
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.textures$ = new ReplaySubject<TextureDescription[]>(1);
    this.observables.noiseMonochrome$ = new ReplaySubject<boolean>(1);
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
        this.setNoiseMonochrome(
          map.description.surface.noiseMonochrome ?? false
        );
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

  getNoiseMonochrome() {
    return this.state.noiseMonochrome;
  }

  setNoiseMonochrome(noiseMonochrome: boolean) {
    this.state.noiseMonochrome = noiseMonochrome;
    this.observables.noiseMonochrome$.next(this.state.noiseMonochrome);
  }

  async apply() {
    const map = this.app.modules.map.getMap()!;
    map.setTextures(
      this.state.textures.reduce((acc, cur) => {
        acc[cur.key as keyof Textures] = cur.texture;
        return acc;
      }, {} as Textures)
    );

    map.description.surface.noiseMonochrome = this.getNoiseMonochrome();

    await this.app.modules.map.restartMap(await map.toDescription());
  }
}
