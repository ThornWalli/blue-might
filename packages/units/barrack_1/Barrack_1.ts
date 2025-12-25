import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';
import baseGlb from './assets/barrack_1.glb?url';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';

export type Options = BuildingUnitOptions;

export default class Barrack_1<
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList
> extends BuildingUnit<BuildingUnitOptions, Modules, ModuleList> {
  static override KEY = 'barrack_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    super(
      {
        ...options,
        name: 'Barrack 1'
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
      }
    });

    return object;
  }
}
