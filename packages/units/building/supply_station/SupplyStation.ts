import { Mesh, SkinnedMesh } from 'three';
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { replaceColors } from '@blue-might/app/lib/utils/object';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import SupplyUnitModule from '@blue-might/app/lib/classes/unitModule/Supply';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';

import baseGlb from './assets/supply_station.glb?url';
// import baseTexture from './texture.png?url';

export type Options = BuildingUnitOptions;
export interface Modules extends BuildingUnitModules {
  supply: SupplyUnitModule;
}
export type ModuleList = BuildingUnitModuleList & [typeof SupplyUnitModule];

export default class SupplyStation extends BuildingUnit {
  static override KEY = 'supply_station';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: ModuleList = [] as unknown as ModuleList
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
      moduleList as ModuleList
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
        replaceColors(
          [
            [
              'primary',
              this.modules.faction.getFaction()?.colors[0] ?? 0xf2f2f2
            ],
            [
              'secondary',
              this.modules.faction.getFaction()?.colors[1] ?? 0xf2f2f2
            ]
          ],
          child
        );
      }
    });

    return object;
  }
}
