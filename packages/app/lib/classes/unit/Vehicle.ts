import type {
  SetupContext,
  UnitConstructorOptions,
  UnitOptions
} from '../Unit';
import PatrolUnitModule from '../unitModule/Patrol';
import PlayerUnitModule from '../unitModule/Player';
import { setDestroyedMaterials } from '../../utils/material';

import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules
} from './Movable';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleUnitOptions extends UnitOptions {}

export type VehicleUnitModules = MovableUnitModules & {
  patrol: PatrolUnitModule;
  player: PlayerUnitModule;
};

export type VehicleUnitModuleList = (
  | typeof PatrolUnitModule
  | typeof PlayerUnitModule
)[] &
  MovableUnitModuleList;
export default class VehicleUnit<
  Modules extends VehicleUnitModules = VehicleUnitModules,
  ModuleList extends VehicleUnitModuleList = VehicleUnitModuleList,
  Options extends VehicleUnitOptions = VehicleUnitOptions
> extends MovableUnit<Modules, ModuleList, Options> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(PatrolUnitModule, PlayerUnitModule);
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
