import { Mesh, SkinnedMesh } from 'three';
import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import SupplyUnitModule from '@blue-might/app/lib/classes/unitModule/Supply';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';
import { addModules } from '@blue-might/app/lib/classes/Module';
import RadarUnitModule from '@blue-might/app/lib/classes/unitModule/Radar';
import type {
  BuildingUnitModuleList,
  BuildingUnitModules,
  BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import BuildingUnit from '@blue-might/app/lib/classes/unit/Building';

import baseGlb from './assets/sea_platform_1.glb?url';

export type Options = BuildingUnitOptions;
export type Modules = BuildingUnitModules;
export type ModuleList = BuildingUnitModuleList;

export interface RawUnitDescription_SeaPlatform_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'sea_platform_1';
}

export default class SeaPlatform_1 extends BuildingUnit<
  Modules,
  ModuleList,
  Options
> {
  static override KEY = 'sea_platform_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    moduleList = addModules(moduleList, [RadarUnitModule, SupplyUnitModule]);
    super(
      {
        ...options,
        name: 'Sea Platform 1',
        moduleStates: {
          collision: {
            enabled: false
          }
        },
        moduleOptions: {
          ...options.moduleOptions,
          damage: {
            enabled: false
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [{ name: 'base' }]
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
        child.castShadow = true;
      }
    });

    return object;
  }
}
