import { ReplaySubject } from 'rxjs';
import type { Units } from '@blue-might/units';

import TransportUnitModule, {
  type TransportUnitModuleObservables,
  type TransportUnitModuleOptions,
  type TransportUnitModuleState
} from './Transport';

declare module '../Unit' {
  interface ModuleStates {
    rescue: Partial<RescueUnitModuleState>;
  }
  interface ModuleOptions {
    rescue: Partial<RescueUnitModuleOptions>;
  }
  interface ModuleDebug {
    rescue: boolean;
  }
}

interface Obervables extends TransportUnitModuleObservables {
  readyForUnload$: ReplaySubject<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RescueUnitModuleOptions extends TransportUnitModuleOptions {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RescueUnitModuleState extends TransportUnitModuleState {}

export default class RescueUnitModule extends TransportUnitModule<
  RescueUnitModuleOptions,
  RescueUnitModuleState,
  Obervables
> {
  static override TYPE = 'rescue';

  constructor(
    unit: Units,
    options: RescueUnitModuleOptions,
    state: RescueUnitModuleState,
    debug: boolean
  ) {
    super(unit, { ...options }, { ...state }, debug);
    //#region observables
    this.observables.readyForUnload$ = new ReplaySubject<boolean>();
    //#endregion
  }

  rescueUnit(u: Units) {
    if ('figure' in u.modules) {
      this.load(u);
      u.modules.figure.setRescueUnit(u);
    } else throw new Error('Unit is not a figure');
  }
}
