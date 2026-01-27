import { ReplaySubject, Subscription, type SubscriptionLike } from 'rxjs';
import type { RendererOptions } from '@blue-might/app/types';

import type Renderer from './Renderer';
import AssetLoader from './AssetLoader';
import CursorAppModule from './appModule/Cursor';
import MapAppModule from './appModule/Map';
import type { ModuleDebug as MapModuleDebug } from './Map';
import SelectionAppModule from './appModule/Selection';
import type Unit from './Unit';
import UnitFocusAppModule from './appModule/UnitFocus';
import type { AnimationLoopValue } from './Renderer';
import TimeAppModule from './appModule/Time';

export type AppModuleList = (
  | typeof CursorAppModule
  | typeof MapAppModule
  | typeof SelectionAppModule
  | typeof UnitFocusAppModule
  | typeof TimeAppModule
)[];
export interface AppModules {
  cursor: CursorAppModule;
  map: MapAppModule;
  selection: SelectionAppModule;
  unitFocus: UnitFocusAppModule;
  time: TimeAppModule;
}

export interface AppObservables {
  updateActive$: ReplaySubject<boolean>;
}

export interface AppState {
  focusedUnit?: Unit;
  updateActive: boolean;
}

export enum APP_MODE {
  PLAYGROUND = 'playground',
  EDITOR = 'editor',
  DEBUG = 'debug'
}

export interface AppConfig {
  mode?: APP_MODE;
  rendererOptions: RendererOptions;
  debug?: {
    renderer?: Partial<RendererOptions>;
    map?: Partial<MapModuleDebug>;
  };
}

export default class BaseApp<
  State extends AppState = AppState,
  Observables extends AppObservables = AppObservables,
  Modules extends AppModules = AppModules,
  ModuleList extends AppModuleList = AppModuleList
> {
  assetLoader = new AssetLoader();

  state: State;
  observables: Observables = {} as Observables;

  subscription = new Subscription();

  //#region room
  roomSubscription?: Subscription;
  //#endregion

  modules: Modules = {} as Modules;
  moduleList: ModuleList;

  ready = false;

  constructor(
    public config: AppConfig,
    public renderer: Renderer,
    state: Partial<State>,
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    this.state = {
      ...state,
      updateActive: state.updateActive ?? true
    } as State;
    moduleList.push(
      CursorAppModule,
      MapAppModule,
      SelectionAppModule,
      UnitFocusAppModule,
      TimeAppModule
    );

    this.moduleList = moduleList;

    if (config.debug?.renderer) {
      this.renderer.setOptions(config.debug.renderer);
    }

    //#region observables
    this.observables.updateActive$ = new ReplaySubject<boolean>(1);
    //#endregion
  }

  async setup() {
    if (this.ready) return;

    //#region Modules
    const preparedModules = this.moduleList
      .map(ModuleClass => {
        const moduleInstance = new ModuleClass(this);
        return ModuleClass.TYPES.map(type => [type, moduleInstance]);
      })
      .flat();
    this.modules = Object.fromEntries(preparedModules);
    //#endregion

    await Promise.all(
      Object.values(this.modules).map(module => module.setup())
    );

    this.subscription.add(
      this.renderer.observables.animationLoop$.subscribe(v => this.update(v))
    );

    this.ready = true;
  }

  update(v: AnimationLoopValue) {
    if (!this.state.updateActive) return;
    Object.values(this.modules).forEach(module => module.update?.(v));
  }

  isUpdateActive() {
    return this.state.updateActive;
  }
  setUpdateActive(value: boolean) {
    if (this.state.updateActive === value) return;
    this.state.updateActive = value;
    this.observables.updateActive$.next(value);
  }

  // private mapDescription: MapDescription | null = null;
  // async enterMap(description: MapDescription) {
  //   const lastMap = this.modules.map.getMap();
  //   if (lastMap) {
  //     lastMap.destroy();
  //   }
  //   this.mapDescription = description;
  //   const newMap = this.modules.map.fromDescription(description);
  //   newMap.setModuleDebug(this.config.debug?.map ?? {});
  //   const map = await this.modules.map.setMap(newMap);

  //   console.log('Map loaded', newMap, newMap.toDescription());
  //   return map;
  // }

  // restartMap() {
  //   if (!this.mapDescription) {
  //     throw new Error('No map description available to restart');
  //   }

  //   this.beforeRestartMap();

  //   this.enterMap(this.mapDescription!);
  // }

  destroy() {
    this.subscription.unsubscribe();
    Object.values(this.observables).forEach(o =>
      (o as SubscriptionLike).unsubscribe()
    );
    this.roomSubscription?.unsubscribe();
    Object.values(this.modules).forEach(module => {
      module.destroy();
    });
    this.renderer.destroy();
  }

  getScene() {
    return this.renderer.scene;
  }
}
