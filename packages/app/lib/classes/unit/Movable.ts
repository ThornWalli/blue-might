import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '../Unit';
import MovableUnitModule from '../unitModule/Movable';
import CollisionUnitModule from '../unitModule/Collision';
import PlayerUnitModule from '../unitModule/Player';

export interface MovableUnitOptions extends UnitOptions {
  active?: boolean;
}

export type MovableUnitModules = UnitModules & {
  player: PlayerUnitModule;
  collision: CollisionUnitModule;
};

export type MovableUnitModuleList = (
  | typeof MovableUnitModule
  | typeof PlayerUnitModule
  | typeof CollisionUnitModule
)[] &
  UnitModuleList;
export default class MovableUnit<
  Options extends MovableUnitOptions = MovableUnitOptions,
  Modules extends MovableUnitModules = MovableUnitModules,
  ModuleList extends MovableUnitModuleList = MovableUnitModuleList
> extends Unit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(PlayerUnitModule, CollisionUnitModule);
    super(options, moduleList);
  }

  isTurnOn() {
    return this.getModuleByType(MovableUnitModule)?.getActive() ?? false;
  }

  turnOn() {
    this.getModuleByType(MovableUnitModule)?.setActive(true);
  }

  turnOff() {
    this.getModuleByType(MovableUnitModule)?.setActive(false);
  }
}
