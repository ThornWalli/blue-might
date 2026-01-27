import { Mesh, SkinnedMesh } from 'three';
import type {
  RawUnitDescription,
  SetupContext,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import LandingPortUnit, {
  type LandingPortUnitModuleList,
  type LandingPortUnitModules,
  type LandingPortUnitOptions
} from '@blue-might/app/lib/classes/unit/LandingPort';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import SupplyUnitModule from '@blue-might/app/lib/classes/unitModule/Supply';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';

import baseGlb from './assets/landing_port_supply_station.glb?url';

export type Options = LandingPortUnitOptions;
export interface Modules extends LandingPortUnitModules {
  supply: SupplyUnitModule;
}
export type ModuleList = LandingPortUnitModuleList & [typeof SupplyUnitModule];

export interface RawUnitDescription_LandingPortSupplyStation_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'landing_port_supply_station_1';
}

export default class LandingPortSupplyStation_1 extends LandingPortUnit<
  Modules,
  ModuleList,
  Options
> {
  static override KEY = 'landing_port_supply_station_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    moduleList.push(SupplyUnitModule);
    super(
      {
        ...options,
        name: 'Landing Port Supply Station',
        moduleOptions: {
          ...options.moduleOptions,
          supply: {
            ...options.moduleOptions?.supply,
            radius: 0.5
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [
              { name: 'base' },
              { name: 'additional_1' },
              { name: 'additional_2' }
            ]
          }
        }
      },
      moduleList as ModuleList
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
