import { GROUND_ADJUSTMENT_MODE, UNIT_TYPE } from '../../../types/unit';
import { addModules } from '../../Module';
import type { UnitConstructorOptions } from '../../Unit';
import PlayerUnitModule from '../../unitModule/Player';
import type {
  BuildingUnitModuleList,
  BuildingUnitModules,
  BuildingUnitOptions
} from '../Building';
import BuildingUnit from '../Building';

export type TurretBuildingUnitOptions = BuildingUnitOptions;

export type TurretBuildingUnitModules = BuildingUnitModules & {
  player: PlayerUnitModule;
};

export type TurretBuildingUnitModuleList = (typeof PlayerUnitModule)[] &
  BuildingUnitModuleList;
export default class TurretBuildingUnit<
  Modules extends TurretBuildingUnitModules = TurretBuildingUnitModules,
  ModuleList extends TurretBuildingUnitModuleList =
    TurretBuildingUnitModuleList,
  Options extends TurretBuildingUnitOptions = TurretBuildingUnitOptions
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override TYPE = UNIT_TYPE.SEA_VEHICLE;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [PlayerUnitModule]);
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.GROUND);
  }
}
