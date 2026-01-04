import {
  EMPTY,
  filter,
  map,
  ReplaySubject,
  Subscription,
  switchMap,
  type SubscriptionLike
} from 'rxjs';
import type { RendererOptions } from '@blue-might/app/types';

import type Renderer from './Renderer';
import AssetLoader from './AssetLoader';
import CursorAppModule from './appModule/Cursor';
import PlayerAppModule from './appModule/Player';
import MapAppModule from './appModule/Map';
import type { MapDescription, ModuleDebug as MapModuleDebug } from './Map';
import SelectionAppModule from './appModule/Selection';
import type Unit from './Unit';
import UnitFocusAppModule from './appModule/UnitFocus';
import DebugAppModule from './appModule/Debug';

type AppModuleList = (
  | typeof DebugAppModule
  | typeof CursorAppModule
  | typeof PlayerAppModule
  | typeof MapAppModule
  | typeof SelectionAppModule
  | typeof UnitFocusAppModule
)[];
interface AppModules {
  debug: DebugAppModule;
  cursor: CursorAppModule;
  player: PlayerAppModule;
  map: MapAppModule;
  selection: SelectionAppModule;
  unitFocus: UnitFocusAppModule;
}

interface AppObservables {
  mode$: ReplaySubject<APP_MODE>;
}

interface AppState {
  focusedUnit?: Unit;
}

export enum APP_MODE {
  PLAYGROUND = 'playground',
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

export class BaseApp<
  Modules extends AppModules = AppModules,
  ModuleList extends AppModuleList = AppModuleList
> {
  assetLoader = new AssetLoader();

  observables: AppObservables = {
    mode$: new ReplaySubject<APP_MODE>(1)
  };

  state: AppState = {};

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
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    moduleList.push(
      DebugAppModule,
      CursorAppModule,
      PlayerAppModule,
      MapAppModule,
      SelectionAppModule,
      UnitFocusAppModule
    );

    this.moduleList = moduleList;

    if (config.debug?.renderer) {
      this.renderer.setOptions(config.debug.renderer);
    }
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
      this.modules.player.observables.currentPlayer$
        .pipe(
          switchMap(
            player => player.modules.vehicle?.observables.vehicle$ ?? EMPTY
          ),
          map(({ current }) => current),
          filter(Boolean),
          switchMap(
            vehicle =>
              vehicle?.observables.ready$.pipe(map(() => vehicle)) ?? EMPTY
          )
        )
        .subscribe(vehicle => {
          this.modules.unitFocus.focus(vehicle);
        })
    );

    this.ready = true;
  }

  async enterMap(desc: MapDescription) {
    const map = await this.loadMap(desc);
    map.setModuleDebug(this.config.debug?.map ?? {});
    await this.modules.map.setMap(map);
    console.log('Map loaded', map);
  }

  private async loadMap(description: MapDescription) {
    return this.modules.map.fromDescription(description);
  }

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

interface AppPlaygroundModules extends AppModules {
  player: PlayerAppModule;
}

export default class App extends BaseApp<AppPlaygroundModules> {
  constructor(
    config: AppConfig,
    renderer: Renderer,
    modules: AppModuleList = []
  ) {
    super(config, renderer, modules);
  }
}
