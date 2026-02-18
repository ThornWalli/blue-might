import {
  GROUND_ADJUSTMENT_MODE,
  UNIT_TYPE,
  type SetupContext
} from '../../types/unit';
import { setDestroyedMaterials } from '../../utils/material';
import { addModules } from '../Module';
import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitObservables,
  type UnitOptions
} from '../Unit';
import PlantUnitModule from '../unitModule/Plant';

export type PlantUnitObservables = UnitObservables;

export type PlantUnitOptions = UnitOptions;

export type PlantUnitModules = UnitModules & {
  building: PlantUnitModule;
};

export type PlantUnitModuleList = (typeof PlantUnitModule)[] & UnitModuleList;
export default class PlantUnit<
  Modules extends PlantUnitModules = PlantUnitModules,
  ModuleList extends PlantUnitModuleList = PlantUnitModuleList,
  Options extends PlantUnitOptions = PlantUnitOptions,
  Observables extends PlantUnitObservables = PlantUnitObservables
> extends Unit<Modules, ModuleList, Options, Observables> {
  static override TYPE = UNIT_TYPE.PLANT;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [PlantUnitModule]);
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.MIN_HEIGHT);
  }

  override async setup(context: SetupContext) {
    await super.setup(context);
    this.subscription.add(
      this.modules.damage.observables.destroyed$.subscribe(() => {
        setDestroyedMaterials(this.root);
      })
    );
  }
}
