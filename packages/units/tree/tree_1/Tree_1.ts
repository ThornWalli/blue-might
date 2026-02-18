import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';
import PlantUnit, {
  type PlantUnitModuleList,
  type PlantUnitModules,
  type PlantUnitOptions
} from '@blue-might/app/lib/classes/unit/Plant';

import baseGlb from './assets/tree_1.glb?url';

export type Options = PlantUnitOptions;

export interface RawUnitDescription_Tree_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'tree_1';
}

export default class Tree_1<
  Modules extends PlantUnitModules = PlantUnitModules,
  ModuleList extends PlantUnitModuleList = PlantUnitModuleList
> extends PlantUnit<Modules, ModuleList, Options> {
  static override KEY = 'tree_1';

  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Tree 1',
        moduleOptions: {
          faction: {
            disabled: true
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [{ name: 'base', default: true }, { name: 'head' }]
          }
        }
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
        child.receiveShadow = false;
      }
    });

    return object;
  }
}
