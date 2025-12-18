import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import TankUnit, {
  type TankUnitModuleList,
  type TankUnitModules,
  type TankUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Tank';

import baseGlb from './assets/tank_1.glb?url';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';

export type Options = TankUnitOptions;
export type Modules = TankUnitModules;
export type ModuleList = TankUnitModuleList;

export default class Tank_1<
  Modules extends TankUnitModules = TankUnitModules,
  ModuleList extends TankUnitModuleList = TankUnitModuleList
> extends TankUnit<Options, Modules, ModuleList> {
  static override KEY = 'tank_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    super(
      {
        ...options,
        name: 'Tank 1',
        moduleOptions: {
          ...options.moduleOptions,
          collision: {
            targetName: 'base'
          }
        }
      },
      moduleList as ModuleList
    );
  }

  override afterSetup(_context: SetupContext): void {
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object } = await loadGltf(baseGlb);

    const mesh = object;

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return mesh;
  }
}
