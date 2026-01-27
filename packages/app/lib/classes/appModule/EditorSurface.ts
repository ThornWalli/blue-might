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
}

export interface TextureDescription {
  key: string;
  texture: Texture<ImageBitmap>;
}

interface State extends AppModuleState {
  textures: TextureDescription[];
}
export default class EditorSurfaceAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorSurface';
  override state: State = {
    textures: []
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.textures$ = new ReplaySubject<TextureDescription[]>(1);
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

  async apply() {
    const map = this.app.modules.map.getMap()!;
    map.setTextures(
      this.state.textures.reduce((acc, cur) => {
        acc[cur.key as keyof Textures] = cur.texture;
        return acc;
      }, {} as Textures)
    );

    // map?.description.surface = Object.fromEntries(
    //   Object.entries(map?.description.surface).map([
    //     key,
    //     texture => {
    //       return [key, URL.createObjectURL(createBlob)];
    //     }
    //   ])
    // ) = this.state.textures.reduce((acc, cur) => {
    //   acc[cur.key as keyof Textures] = cur.texture;
    //   return acc;
    // }, {} as Textures);

    await this.app.modules.map.restartMap(await map.toDescription());
  }
}
