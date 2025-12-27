import { Subject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';

declare module '../Unit' {
  interface ModuleStates {
    selection: Partial<SelectionUnitModuleState>;
  }
  interface ModuleOptions {
    selection: Partial<SelectionUnitModuleOptions>;
  }
  interface ModuleDebug {
    selection: boolean;
  }
}

interface Obervables extends UnitModuleObservables {
  select$: Subject<boolean>;
}

export type SelectionUnitModuleOptions = UnitModuleOptions;
export type SelectionUnitModuleState = UnitModuleState;
export default class SelectionUnitModule extends UnitModule<
  SelectionUnitModuleOptions,
  SelectionUnitModuleState,
  Obervables
> {
  static override TYPE = 'selection';

  constructor(
    unit: Unit,
    options: SelectionUnitModuleOptions,
    state: SelectionUnitModuleState,
    debug: boolean
  ) {
    super(unit, options, state, debug);
    //#region observables
    this.observables.select$ = new Subject<boolean>();
    //#endregion
  }

  select() {
    this.observables.select$.next(true);
  }

  unselect() {
    if (!this.observables.select$.closed) {
      this.observables.select$.next(false);
    }
  }
}
