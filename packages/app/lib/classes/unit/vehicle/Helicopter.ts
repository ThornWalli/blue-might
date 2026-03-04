import {
  GROUND_ADJUSTMENT_MODE,
  UNIT_TYPE
} from '@blue-might/app/lib/types/unit';

import type {
  UnitConstructorOptions,
  UnitObservables,
  UnitState
} from '../../Unit';
import HelicopterUnitModule from '../../unitModule/movable/airVehicle/Helicopter';
import { addModules } from '../../Module';

import AirVehicleUnit, {
  type AirVehicleUnitModuleList,
  type AirVehicleUnitModules,
  type AirVehicleUnitOptions
} from './AirVehicle';

export type HelicopterUnitOptions = AirVehicleUnitOptions;

export type HelicopterUnitModules = AirVehicleUnitModules & {
  helicopter: HelicopterUnitModule;
};

export type HelicopterUnitModuleList = (typeof HelicopterUnitModule)[] &
  AirVehicleUnitModuleList;
export default class HelicopterUnit<
  Modules extends HelicopterUnitModules = HelicopterUnitModules,
  ModuleList extends HelicopterUnitModuleList = HelicopterUnitModuleList,
  Options extends HelicopterUnitOptions = HelicopterUnitOptions,
  Observables extends UnitObservables = UnitObservables,
  State extends UnitState = UnitState
> extends AirVehicleUnit<Modules, ModuleList, Options, Observables, State> {
  static override TYPE = UNIT_TYPE.HELICOPTER;
  constructor(
    options: UnitConstructorOptions<Options, State>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [HelicopterUnitModule]);
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.FLIGHT);
  }
}
