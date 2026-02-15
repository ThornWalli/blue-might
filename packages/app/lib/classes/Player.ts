/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SubscriptionLike } from 'rxjs';
import { Subscription } from 'rxjs';
import type { VehicleUnits } from '@blue-might/units';

import type { App } from '../types';

import VehiclePlayerModule from './playerModule/Vehicle';
import ControlsPlayerModule from './playerModule/Controls';
import FactionPlayerModule from './playerModule/Faction';
import LifePlayerModule from './playerModule/Life';
import type { ModuleOptions, ModuleStates } from './Unit';

export type PlayerModuleList = (
  | typeof VehiclePlayerModule
  | typeof ControlsPlayerModule
  | typeof FactionPlayerModule
  | typeof LifePlayerModule
)[];

export interface PlayerModules {
  vehicle: VehiclePlayerModule;
  controls: ControlsPlayerModule;
  faction: FactionPlayerModule;
  life: LifePlayerModule;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PlayerState {}

export interface PlayerConstructorOptions {
  id?: string;
  name: string;
  moduleOptions?: Partial<ModuleOptions>;
  moduleStates?: Partial<ModuleStates>;
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
    { id, name, moduleStates, moduleOptions }: PlayerConstructorOptions,
    protected moduleList: unknown[] = []
  ) {
    moduleList.push(
      ControlsPlayerModule,
      VehiclePlayerModule,
      FactionPlayerModule,
      LifePlayerModule
    );

    this.id = id || crypto.randomUUID();
    this.name = name || 'Player';

    const preparedModules = (moduleList as ModuleList)
      .map(ModuleClass => {
        const types = ModuleClass.TYPES;

        const { options, state } = types.reduce<{
          options: any;
          state: any;
        }>(
          (acc, type) => {
            acc.options = {
              ...acc.options,
              ...(moduleOptions?.[type] ?? {})
            };
            acc.state = {
              ...acc.state,
              ...(moduleStates?.[type] ?? {})
            };
            return acc;
          },
          { options: {}, state: {} }
        );

        const moduleInstance = new ModuleClass(this, options, state);
        return ModuleClass.TYPES.map(type => [type, moduleInstance]);
      })
      .flat();

    this.modules = Object.fromEntries(preparedModules);
  }

  reset() {
    this.setVehicle(null);
    this.modules.life.reset();
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
    Object.values(this.modules).forEach(m => m.destroy());
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

  setVehicle(unit: VehicleUnits | null) {
    const currentUnit = this.modules.vehicle.getCurrentUnit();
    if (this.modules.vehicle.hasVehicle() && 'player' in currentUnit.modules) {
      currentUnit.modules.player.setPlayer(null);
    }
    this.modules.vehicle.setVehicleUnit(unit);
  }
}
