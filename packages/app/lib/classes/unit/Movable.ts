import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '../Unit';
import MovableUnitModule from '../unitModule/Movable';
import PlayerUnitModule from '../unitModule/Player';

export interface MovableUnitOptions extends UnitOptions {
  active?: boolean;
}

export type MovableUnitModules = UnitModules & {
  player: PlayerUnitModule;
  movable: MovableUnitModule;
};

export type MovableUnitModuleList = (
  | typeof MovableUnitModule
  | typeof PlayerUnitModule
)[] &
  UnitModuleList;
export default class MovableUnit<
  Modules extends MovableUnitModules = MovableUnitModules,
  ModuleList extends MovableUnitModuleList = MovableUnitModuleList,
  Options extends MovableUnitOptions = MovableUnitOptions
> extends Unit<Modules, ModuleList, Options> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    if (
      !(moduleList as ModuleList).find(test =>
        test.TYPES.includes(MovableUnitModule.TYPE)
      )
    ) {
      moduleList.push(MovableUnitModule);
    }
    moduleList.push(PlayerUnitModule);
    super(options, moduleList);
  }
}
