import type {
  UnitConstructorOptions,
  UnitObservables,
  UnitState
} from '../Unit';
import PatrolUnitModule from '../unitModule/Patrol';
import PlayerUnitModule from '../unitModule/Player';
import { setDestroyedMaterials } from '../../utils/material';
import { addModules } from '../Module';
import type { SetupContext } from '../../types/unit';
import RadarUnitModule from '../unitModule/Radar';

import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules,
  type MovableUnitOptions
} from './Movable';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleUnitOptions extends MovableUnitOptions {}

export type VehicleUnitModules = MovableUnitModules & {
  radar: RadarUnitModule;
  patrol: PatrolUnitModule;
  player: PlayerUnitModule;
};

export type VehicleUnitModuleList = (
  | typeof RadarUnitModule
  | typeof PatrolUnitModule
  | typeof PlayerUnitModule
)[] &
  MovableUnitModuleList;
export default class VehicleUnit<
  Modules extends VehicleUnitModules = VehicleUnitModules,
  ModuleList extends VehicleUnitModuleList = VehicleUnitModuleList,
  Options extends VehicleUnitOptions = VehicleUnitOptions,
  Observables extends UnitObservables = UnitObservables,
  State extends UnitState = UnitState
> extends MovableUnit<Modules, ModuleList, Options, Observables, State> {
  constructor(
    options: UnitConstructorOptions<Options, State>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [
      RadarUnitModule,
      PatrolUnitModule,
      PlayerUnitModule
    ]);
    super(options, moduleList);
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
