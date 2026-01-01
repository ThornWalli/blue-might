import { ReplaySubject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type AirVehicleUnit from '../unit/AirVehicle';
import type LandingPortUnit from '../unit/LandingPort';

declare module '../Unit' {
  interface ModuleStates {
    landingPort: Partial<LandingPortUnitModuleState>;
  }
  interface ModuleOptions {
    landingPort: Partial<LandingPortUnitModuleOptions>;
  }
  interface ModuleDebug {
    landingPort: boolean;
  }
}
export interface LandingPortUnitModuleObservables extends UnitModuleObservables {
  landedUnit: ReplaySubject<AirVehicleUnit | null>;
}
export interface LandingPortUnitModuleOptions extends UnitModuleOptions {
  /**
   * Whether the landing port supports air vehicles.
   */
  support: boolean;
}
export interface LandingPortUnitModuleState extends UnitModuleState {
  /**
   * The unit that is currently using the landing port.
   */
  landedUnit: AirVehicleUnit | null;
}

export default class LandingPortUnitModule extends UnitModule<
  LandingPortUnitModuleOptions,
  LandingPortUnitModuleState,
  LandingPortUnitModuleObservables,
  LandingPortUnit
> {
  static override TYPE = 'landingPort';

  constructor(
    unit: LandingPortUnit,
    options: LandingPortUnitModuleOptions,
    state: LandingPortUnitModuleState,
    debug: boolean
  ) {
    super(unit, options, { ...state, landedUnit: null }, debug);

    //#region observables
    this.observables.landedUnit = new ReplaySubject<AirVehicleUnit | null>(1);
    this.observables.landedUnit.next(null);
    //#endregion
  }

  hasUnit(unit: AirVehicleUnit | null) {
    return this.state.landedUnit === unit;
  }

  setLandedUnit(unit: AirVehicleUnit | null) {
    if (unit === this.state.landedUnit) return;

    this.state.landedUnit = unit;

    unit?.modules.airVehicle.setLandingPort(this.getUnit());

    this.observables.landedUnit.next(unit);
  }
}
