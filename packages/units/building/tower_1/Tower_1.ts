import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import type { MeshStandardMaterial } from 'three';
import { DoubleSide, Mesh, SkinnedMesh } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
// import { replaceColors } from '@blue-might/app/lib/utils/material';

import baseGlb from './assets/tower_1.glb?url';

export type Options = BuildingUnitOptions;

export default class Tower_1<
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'tower_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    super(
      {
        ...options,
        name: 'Tower 1'
      },
      moduleList as ModuleList
    );
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
        (child.material as MeshStandardMaterial).side = DoubleSide;
        // replaceColors(
        //   [
        //     [
        //       'primary',
        //       this.modules.faction.getFaction()?.colors[0] ?? 0xf2f2f2
        //     ],
        //     [
        //       'secondary',
        //       this.modules.faction.getFaction()?.colors[1] ?? 0xf2f2f2
        //     ]
        //   ],
        //   child
        // );
      }
    });

    return object;
  }
}
