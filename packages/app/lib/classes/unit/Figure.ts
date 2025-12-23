import type { UnitConstructorOptions, UnitOptions } from '../Unit';
import FigureUnitModule from '../unitModule/moveable/Figure';
import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules
} from './Movable';
import PatrolUnitModule from '../unitModule/Patrol';
import { COLLISION_TYPE } from '../unitModule/Collision';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FigureUnitOptions extends UnitOptions {}

export type FigureUnitModules = MovableUnitModules & {
  figure: FigureUnitModule;
  patrol: PatrolUnitModule;
};

export type FigureUnitModuleList = (
  | typeof FigureUnitModule
  | typeof PatrolUnitModule
)[] &
  MovableUnitModuleList;
export default class FigureUnit<
  Options extends FigureUnitOptions = FigureUnitOptions,
  Modules extends FigureUnitModules = FigureUnitModules,
  ModuleList extends FigureUnitModuleList = FigureUnitModuleList
> extends MovableUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(PatrolUnitModule);
    if (
      !(moduleList as ModuleList).find(
        ({ TYPE }) => TYPE === FigureUnitModule.TYPE
      )
    ) {
      moduleList.push(FigureUnitModule);
    }
    super(
      {
        ...options,
        moduleOptions: {
          ...options.moduleOptions,
          collision: {
            disabled: true,
            type: COLLISION_TYPE.SOFT,
            ...options.moduleOptions?.collision
          }
        }
      },
      moduleList
    );
  }
}
