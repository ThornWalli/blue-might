import {
  GROUND_ADJUSTMENT_MODE,
  type UnitConstructorOptions,
  type UnitOptions
} from '../Unit';
import FigureUnitModule from '../unitModule/movable/Figure';
import PatrolUnitModule from '../unitModule/Patrol';
import { COLLISION_TYPE } from '../unitModule/Collision';
import { UNIT_TYPE } from '../../types/unit';
import PlayerUnitModule from '../unitModule/Player';
import { addModules } from '../Module';

import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules
} from './Movable';

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
  Modules extends FigureUnitModules = FigureUnitModules,
  ModuleList extends FigureUnitModuleList = FigureUnitModuleList,
  Options extends FigureUnitOptions = FigureUnitOptions
> extends MovableUnit<Modules, ModuleList, Options> {
  static override TYPE = UNIT_TYPE.FIGURE;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [
      FigureUnitModule,
      PatrolUnitModule,
      PlayerUnitModule
    ]);

    super(
      {
        ...options,
        moduleOptions: {
          ...options.moduleOptions,
          collision: {
            disabled: true,
            type: COLLISION_TYPE.SOFT,
            ...options.moduleOptions?.collision
          },
          damage: {
            fire: false,
            maxDamage: 0.1
          }
        },
        moduleStates: {
          ...options.moduleStates,
          damage: {
            ...options.moduleStates?.damage
          }
        }
      },
      moduleList
    );
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.GROUND);
  }
}
