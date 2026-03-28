import { ReplaySubject } from 'rxjs';
import type { Units } from '@blue-might/units';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';

declare module '../Unit' {
  interface ModuleStates {
    customize: Partial<CustomizeUnitModuleState>;
  }
  interface ModuleOptions {
    customize: Partial<CustomizeUnitModuleOptions>;
  }
  interface ModuleDebug {
    customize: boolean;
  }
}
export interface CustomizeUnitModuleObservables extends UnitModuleObservables {
  supplyUnit$: ReplaySubject<Units | null>;
}
export type CustomizeUnitModuleOptions = UnitModuleOptions;
export interface CustomizeUnitModuleState extends UnitModuleState {
  supplyUnit: Units | null;
}

export default class CustomizeUnitModule extends UnitModule<
  CustomizeUnitModuleOptions,
  CustomizeUnitModuleState,
  CustomizeUnitModuleObservables
> {
  static override TYPE = 'customize';

  constructor(
    unit: Unit,
    options: CustomizeUnitModuleOptions,
    state: CustomizeUnitModuleState,
    debug: boolean
  ) {
    super(unit, options, { ...state, supplyUnit: null }, debug);

    //#region observables
    this.observables.supplyUnit$ = new ReplaySubject<Units | null>(1);
    this.observables.supplyUnit$.next(null);
    //#endregion
  }

  public hasSupplyUnit(unit: Units | null) {
    return this.state.supplyUnit === unit;
  }

  public setSupplyUnit(unit: Units | null) {
    if (unit === this.state.supplyUnit) return;
    console.log('Setting supply unit:', unit);
    this.state.supplyUnit = unit;
    this.observables.supplyUnit$.next(unit);
  }
}
