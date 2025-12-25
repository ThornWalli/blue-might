import type Unit from './Unit';
import { ReplaySubject, type SubscriptionLike } from 'rxjs';
import { Subscription } from 'rxjs';
import VehicleModule from './playerModule/Vehicle';
import type MovableUnit from './unit/Movable';
import ControlsModule from './playerModule/Controls';
import PlayerUnitModule from './unitModule/Player';
import FactionModule from './playerModule/Faction';
import type App from './App';
import type { PlayerModuleState } from './PlayerModule';

export type PlayerModuleList = (
  | typeof VehicleModule
  | typeof ControlsModule
  | typeof FactionModule
)[];

export interface PlayerModules {
  vehicle: VehicleModule;
  controls: ControlsModule;
  faction: FactionModule;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PlayerState {}

export interface PlayerConstructorOptions {
  id?: string;
  name: string;
  moduleStates?: { [key: string]: PlayerModuleState };
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Observables {}

export default class Player<
  Modules extends PlayerModules = PlayerModules,
  ModuleList extends PlayerModuleList = PlayerModuleList
> {
  debug = false;

  private ready: boolean = false;
  state: PlayerState = {};
  modules: Modules = {} as Modules;

  id: string;
  name: string;
  observables: Observables = {} as Observables;
  subscription = new Subscription();

  constructor(
    public app: App,
    { id, name, moduleStates }: PlayerConstructorOptions,
    protected moduleList: unknown[] = []
  ) {
    moduleList.push(ControlsModule, VehicleModule, FactionModule);

    this.id = id || crypto.randomUUID();
    this.name = name || 'Player';

    this.observables = {
      unit$: new ReplaySubject<{
        lastUnit?: Unit;
        unit: Unit;
      }>(1)
    };

    const preparedModules = (moduleList as ModuleList).map(ModuleClass => {
      const state = moduleStates?.[ModuleClass.TYPE] ?? {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moduleInstance = new (ModuleClass as any)(this, state, this.debug);
      return [ModuleClass.TYPE, moduleInstance];
    });
    this.modules = Object.fromEntries(preparedModules);
  }

  async setup() {
    await this.setupModules();
  }

  private async setupModules() {
    await Promise.all(
      Object.values(this.modules).map(module => module.setup())
    );
  }

  destroy() {
    Object.values(this.observables).forEach(o =>
      (o as SubscriptionLike).unsubscribe()
    );
    this.subscription.unsubscribe();
  }

  setReady(value: boolean) {
    this.ready = value;
  }
  isReady() {
    return this.ready;
  }

  equal(player?: Player | null) {
    if (!player) return false;
    return this.id === player.id;
  }

  setVehicle(unit: MovableUnit | null) {
    if (this.modules.vehicle.hasVehicle()) {
      this.modules.vehicle
        .getVehicle()
        ?.getModuleByType(PlayerUnitModule)
        .setPlayer(null);
    }
    this.modules.vehicle.setVehicle(unit);
  }
}
