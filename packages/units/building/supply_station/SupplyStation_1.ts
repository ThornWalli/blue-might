import { Mesh, SkinnedMesh } from 'three';
import type {
  RawUnitDescription,
  SetupContext,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import SupplyUnitModule from '@blue-might/app/lib/classes/unitModule/Supply';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/supply_station.glb?url';
// import baseTexture from './texture.png?url';

export type Options = BuildingUnitOptions;
export interface Modules extends BuildingUnitModules {
  supply: SupplyUnitModule;
}
export type ModuleList = BuildingUnitModuleList & [typeof SupplyUnitModule];
export interface RawUnitDescription_SupplyStation_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'supply_station_1';
}

export default class SupplyStation_1 extends BuildingUnit {
  static override KEY = 'supply_station_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    moduleList = addModules(moduleList, [SupplyUnitModule]);
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
          landingPort: {
            ...options.moduleOptions?.landingPort,
            support: true
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [{ name: 'additional_1' }]
          }
        }
      },
      moduleList
    );
  }

  override async afterSetup(_context: SetupContext): Promise<void> {
    await super.afterSetup(_context);

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
