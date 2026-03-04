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
  type UnitOptions,
  type UnitState
} from '../Unit';
import BuildingUnitModule from '../unitModule/Building';

export type BuildingUnitObservables = UnitObservables;

export type BuildingUnitOptions = UnitOptions;

export type BuildingUnitModules = UnitModules & {
  building: BuildingUnitModule;
};

export type BuildingUnitModuleList = (typeof BuildingUnitModule)[] &
  UnitModuleList;
export default class BuildingUnit<
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList,
  Options extends BuildingUnitOptions = BuildingUnitOptions,
  Observables extends BuildingUnitObservables = BuildingUnitObservables,
  State extends UnitState = UnitState
> extends Unit<Modules, ModuleList, Options, Observables, State> {
  static override TYPE = UNIT_TYPE.BUILDING;
  constructor(
    options: UnitConstructorOptions<Options, State>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [BuildingUnitModule]);
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
