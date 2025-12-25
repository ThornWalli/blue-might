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
import type { MeshStandardMaterial } from 'three';
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

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object } = await loadGltf(baseGlb);

    const mesh = object;

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;

        if ((child.material as MeshStandardMaterial).name === 'primary') {
          child.material.color.set(
            this.modules.faction.getFaction()?.colors[0] ?? 0xf2f2f2
          );
          child.material.needsUpdate = true;
        }
        if ((child.material as MeshStandardMaterial).name === 'secondary') {
          child.material.color.set(
            this.modules.faction.getFaction()?.colors[1] ?? 0xf2f2f2
          );
          child.material.needsUpdate = true;
        }
      }
    });

    return mesh;
  }
}
