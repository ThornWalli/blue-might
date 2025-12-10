import {
  GROUND_ADJUSTMENT_MODE,
  type UnitConstructorOptions
} from '../../Unit';
import HelicopterUnitModule from '../../unitModule/Helicopter';
import type CollisionUnitModule from '../../unitModule/Collision';
import type PlayerUnitModule from '../../unitModule/Player';
import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '../Vehicle';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HelicopterUnitOptions extends VehicleUnitOptions {}

export type HelicopterUnitModules = VehicleUnitModules & {
  helicopter: HelicopterUnitModule;
  player: PlayerUnitModule;
  collision: CollisionUnitModule;
};

export type HelicopterUnitModuleList = (typeof HelicopterUnitModule)[] &
  VehicleUnitModuleList;
export default class HelicopterUnit<
  Options extends HelicopterUnitOptions = HelicopterUnitOptions,
  Modules extends HelicopterUnitModules = HelicopterUnitModules,
  ModuleList extends HelicopterUnitModuleList = HelicopterUnitModuleList
> extends VehicleUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(HelicopterUnitModule);
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.FLIGHT);
  }
}
