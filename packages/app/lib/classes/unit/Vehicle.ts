import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '../Unit';
import VehicleUnitModule from '../unitModule/Vehicle';
import CollisionUnitModule from '../unitModule/Collision';
import PlayerUnitModule from '../unitModule/Player';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleUnitOptions extends UnitOptions {}

export type VehicleUnitModules = UnitModules & {
  player: PlayerUnitModule;
  collision: CollisionUnitModule;
};

export type VehicleUnitModuleList = (
  | typeof VehicleUnitModule
  | typeof PlayerUnitModule
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
    moduleList.push(PlayerUnitModule, CollisionUnitModule);
    super(options, moduleList);
  }
  isTurnOn() {
    return this.getModuleByType(VehicleUnitModule)?.getActive() ?? false;
  }
  turnOn() {
    this.getModuleByType(VehicleUnitModule)?.setActive(true);
  }

  turnOff() {
    this.getModuleByType(VehicleUnitModule)?.setActive(false);
  }
}
