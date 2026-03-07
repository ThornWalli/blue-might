import { GROUND_ADJUSTMENT_MODE, UNIT_TYPE } from '../../../types/unit';
import { addModules } from '../../Module';
import type {
  UnitConstructorOptions,
  UnitObservables,
  UnitState
} from '../../Unit';
import AttackUnitModule from '../../unitModule/Attack';
import PlayerUnitModule from '../../unitModule/Player';
import RadarUnitModule from '../../unitModule/Radar';
import WeaponUnitModule from '../../unitModule/Weapon';
import type {
  BuildingUnitModuleList,
  BuildingUnitModules,
  BuildingUnitOptions
} from '../Building';
import BuildingUnit from '../Building';

export type TurretBuildingUnitOptions = BuildingUnitOptions;

export type TurretBuildingUnitModules = BuildingUnitModules & {
  radar: RadarUnitModule;
  attack: AttackUnitModule;
  player: PlayerUnitModule;
  weapon: WeaponUnitModule;
};

export type TurretBuildingUnitModuleList = (
  | typeof RadarUnitModule
  | typeof AttackUnitModule
  | typeof PlayerUnitModule
  | typeof WeaponUnitModule
)[] &
  BuildingUnitModuleList;
export default class TurretBuildingUnit<
  Modules extends TurretBuildingUnitModules = TurretBuildingUnitModules,
  ModuleList extends TurretBuildingUnitModuleList =
    TurretBuildingUnitModuleList,
  Options extends TurretBuildingUnitOptions = TurretBuildingUnitOptions,
  Observables extends UnitObservables = UnitObservables,
  State extends UnitState = UnitState
> extends BuildingUnit<Modules, ModuleList, Options, Observables, State> {
  static override TYPE = UNIT_TYPE.SEA_VEHICLE;
  constructor(
    options: UnitConstructorOptions<Options, State>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [
      RadarUnitModule,
      AttackUnitModule,
      PlayerUnitModule,
      WeaponUnitModule
    ]);
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.GROUND);
  }
}
