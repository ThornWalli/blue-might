import { LoopRepeat, Mesh, SkinnedMesh } from 'three';
import type {
  RawUnitDescription,
  SetupContext,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import SupplyUnitModule from '@blue-might/app/lib/classes/unitModule/Supply';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/sea_supply_station.glb?url';

export type Options = BuildingUnitOptions;
export interface Modules extends BuildingUnitModules {
  supply: SupplyUnitModule;
}
export type ModuleList = BuildingUnitModuleList & [typeof SupplyUnitModule];
export interface RawUnitDescription_SeaSupplyStation_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'sea_supply_station_1';
}

export default class SeaSupplyStation_1 extends BuildingUnit<
  Modules,
  ModuleList,
  Options
> {
  static override KEY = 'sea_supply_station_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    moduleList = addModules(moduleList, [SupplyUnitModule]);
    super(
      {
        ...options,
        name: 'Sea Supply Station',
        moduleOptions: {
          ...options.moduleOptions,
          supply: {
            ...options.moduleOptions?.supply,
            radius: 2,
            sphereTarget: {
              name: 'head'
            },
            allowedType: {
              sea: true
            }
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [{ name: 'base' }, { name: 'head' }]
          }
        }
      },
      moduleList
    );
  }

  override async afterSetup(_context: SetupContext): Promise<void> {
    await super.afterSetup(_context);

    // this.subscription.add(
    //   this.modules.landingPort.observables.landedUnit.subscribe(unit =>
    //     this.modules.supply.setSupplyUnit(unit)
    //   )
    // );

    this.setMaterialReady();

    //#region Animation

    const action = this.modules.animation.getAction('radar');
    if (action) {
      action.clampWhenFinished = false;
      action.setLoop(LoopRepeat, Infinity);
      action.setDuration(2);
    }

    this.modules.animation.playAction('radar');

    this.subscription.add(
      this.modules.damage.observables.destroyed$.subscribe(() => {
        this.modules.animation.stopAction('radar');
      })
    );

    //#endregion
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    setIgnorePathfinding(object.getObjectByName('base')!, true);

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.receiveShadow = true;
      }
    });

    return object;
  }
}
