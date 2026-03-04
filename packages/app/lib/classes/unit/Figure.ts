import type {
  UnitConstructorOptions,
  UnitObservables,
  UnitOptions,
  UnitState
} from '../Unit';
import PatrolUnitModule from '../unitModule/Patrol';
import {
  GROUND_ADJUSTMENT_MODE,
  UNIT_TYPE,
  type SetupContext
} from '../../types/unit';
import { addModules } from '../Module';
import FigureMovableUnitModule from '../unitModule/movable/FigureMovable';
import FigureUnitModule from '../unitModule/Figure';
import { disableSurfaceDetection } from '../../utils/object';

import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules
} from './Movable';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FigureUnitOptions extends UnitOptions {}

export type FigureUnitModules = MovableUnitModules & {
  figureMovable: FigureMovableUnitModule;
  figure: FigureUnitModule;
  patrol: PatrolUnitModule;
};

export type FigureUnitModuleList = (
  | typeof FigureMovableUnitModule
  | typeof FigureUnitModule
  | typeof PatrolUnitModule
)[] &
  MovableUnitModuleList;
export default class FigureUnit<
  Modules extends FigureUnitModules = FigureUnitModules,
  ModuleList extends FigureUnitModuleList = FigureUnitModuleList,
  Options extends FigureUnitOptions = FigureUnitOptions,
  Observables extends UnitObservables = UnitObservables,
  State extends UnitState = UnitState
> extends MovableUnit<Modules, ModuleList, Options, Observables, State> {
  static override TYPE = UNIT_TYPE.FIGURE;
  constructor(
    options: UnitConstructorOptions<Options, State>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [
      FigureMovableUnitModule,
      FigureUnitModule,
      PatrolUnitModule
    ]);

    super(
      {
        ...options,
        moduleOptions: {
          ...options.moduleOptions,
          collision: {
            ...options.moduleOptions?.collision,
            enabled: false
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
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.FIGURE);
  }
  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);

    disableSurfaceDetection(this.root);
  }
}
