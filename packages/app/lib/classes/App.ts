import { ReplaySubject, Subscription, type SubscriptionLike } from 'rxjs';
import type Renderer from './Renderer';
import AssetLoader from './AssetLoader';
import CursorAppModule from './appModule/Cursor';
import PlayerAppModule from './appModule/Player';
import MapAppModule from './appModule/Map';
import type { MapDescription } from './Map';
import SelectionAppModule from './appModule/Selection';

type AppModuleList = (
  | typeof CursorAppModule
  | typeof PlayerAppModule
  | typeof MapAppModule
  | typeof SelectionAppModule
)[];
interface AppModules {
  cursor: CursorAppModule;
  player: PlayerAppModule;
  map: MapAppModule;
  selection: SelectionAppModule;
}

interface AppObservables {
  mode$: ReplaySubject<APP_MODE>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppState {}

export enum APP_MODE {
  PLAYGROUND = 'playground',
  EDITOR = 'editor'
}

export interface AppConfig {
  mode?: APP_MODE;
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
      CursorAppModule,
      PlayerAppModule,
      MapAppModule,
      SelectionAppModule
    );

    this.moduleList = moduleList;
  }

  async setup() {
    if (this.ready) return;

    //#region Modules
    const preparedModules = this.moduleList.map(ModuleClass => {
      const moduleInstance = new ModuleClass(this);
      return [ModuleClass.TYPE, moduleInstance];
    });
    this.modules = Object.fromEntries(preparedModules);
    //#endregion

    await Promise.all(
      Object.values(this.modules).map(module => module.setup())
    );

    this.ready = true;
  }

  async enterMap(desc: MapDescription) {
    const map = await this.loadMap(desc);
    await this.modules.map.setMap(map);
    console.log('Map loaded', map);

    // Player hinzufügen
    const player = this.modules.player.getCurrentPlayer();
    const vehicle = player.modules.vehicle.getVehicle();
    if (vehicle) {
      await this.modules.map.getMap().modules.units.add(vehicle);
      // this.subscription.add(
      //   vehicle.observables.position$.subscribe(position => {
      //     // Kamera auf Fahrzeug setzen
      //     this.renderer.updateCamera(
      //       position.clone(),
      //       vehicle.root.quaternion.clone()
      //     );
      //   })
      // );
    }
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
