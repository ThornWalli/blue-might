import type Unit from './Unit';
import { ReplaySubject, type SubscriptionLike } from 'rxjs';
import { Subscription } from 'rxjs';
import VehicleModule from './playerModule/Vehicle';
import type VehicleUnit from './unit/Vehicle';
import type ControlsModule from './playerModule/Controls';

export type PlayerModuleList = (typeof VehicleModule)[];

export interface PlayerModules {
  vehicle: VehicleModule;
  controls: ControlsModule;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PlayerState {}

export interface PlayerConstructorOptions {
  id?: string;
  name: string;
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
    { id, name }: PlayerConstructorOptions,
    protected moduleList: unknown[] = []
  ) {
    moduleList.push(VehicleModule);

    this.id = id || crypto.randomUUID();
    this.name = name || 'Player';

    this.observables = {
      unit$: new ReplaySubject<{
        lastUnit?: Unit;
        unit: Unit;
      }>(1)
    };

    const preparedModules = (moduleList as ModuleList).map(ModuleClass => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moduleInstance = new (ModuleClass as any)(this, this.debug);
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

  setVehicle(unit: VehicleUnit | null) {
    if (this.modules.vehicle.hasVehicle()) {
      this.modules.vehicle.getVehicle()?.modules.player.setPlayer(null);
    }
    this.modules.vehicle.setVehicle(unit);
  }
}
