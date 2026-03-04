import { GROUND_ADJUSTMENT_MODE, UNIT_TYPE } from '../../../types/unit';
import { addModules } from '../../Module';
import type {
  UnitConstructorOptions,
  UnitObservables,
  UnitState
} from '../../Unit';
import SeaVehicleUnitModule from '../../unitModule/movable/SeaVehicle';
import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '../Vehicle';

export type SeaVehicleUnitOptions = VehicleUnitOptions;

export type SeaVehicleUnitModules = VehicleUnitModules & {
  seaVehicle: SeaVehicleUnitModule;
};

export type SeaVehicleUnitModuleList = (typeof SeaVehicleUnitModule)[] &
  VehicleUnitModuleList;
export default class SeaVehicleUnit<
  Modules extends SeaVehicleUnitModules = SeaVehicleUnitModules,
  ModuleList extends SeaVehicleUnitModuleList = SeaVehicleUnitModuleList,
  Options extends SeaVehicleUnitOptions = SeaVehicleUnitOptions,
  Observables extends UnitObservables = UnitObservables,
  State extends UnitState = UnitState
> extends VehicleUnit<Modules, ModuleList, Options, Observables, State> {
  static override TYPE = UNIT_TYPE.SEA_VEHICLE;
  constructor(
    options: UnitConstructorOptions<Options, State>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [SeaVehicleUnitModule]);
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.SEA);
  }
}
