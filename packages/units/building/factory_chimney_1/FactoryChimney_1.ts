import type {
  SetupContext,
  UnitConstructorOptions,
  RawUnitDescription,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';

import baseGlb from './assets/factory_chimney_1.glb?url';

export type Options = BuildingUnitOptions;

export interface RawUnitDescription_FactoryChimney_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'factory_chimney_1';
}

export default class FactoryChimney_1<
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'factory_chimney_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Factory Chimney 1'
      },
      moduleList
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
      }
    });

    return object;
  }
}
