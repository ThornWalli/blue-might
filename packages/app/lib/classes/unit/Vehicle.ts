import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '../Unit';
import VehicleUnitModule from '../unitModule/Vehicle';
import CollisionUnitModule from '../unitModule/Collision';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleUnitOptions extends UnitOptions {}

export type VehicleUnitModules = UnitModules & {
  vehicle: VehicleUnitModule;
  collision: CollisionUnitModule;
};

export type VehicleUnitModuleList = (
  | typeof VehicleUnitModule
  | typeof CollisionUnitModule
)[] &
  UnitModuleList;
export default class VehicleUnit<
  Options extends VehicleUnitOptions = VehicleUnitOptions,
  Modules extends VehicleUnitModules = VehicleUnitModules,
  ModuleList extends VehicleUnitModuleList = VehicleUnitModuleList
> extends Unit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(CollisionUnitModule);
    if (
      !(moduleList as ModuleList).find(
        ({ TYPE }) => TYPE === VehicleUnitModule.TYPE
      )
    ) {
      moduleList.push(VehicleUnitModule);
    }
    super(options, moduleList);
  }
}
