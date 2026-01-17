import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import TankUnit, {
  type TankUnitModuleList,
  type TankUnitModules,
  type TankUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Tank';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';
import { replaceColors } from '@blue-might/app/lib/utils/material';

import baseGlb from './assets/tank_1.glb?url';

export type Options = TankUnitOptions;
export type Modules = TankUnitModules;
export type ModuleList = TankUnitModuleList;

export default class Tank_1<
  Modules extends TankUnitModules = TankUnitModules,
  ModuleList extends TankUnitModuleList = TankUnitModuleList
> extends TankUnit<Modules, ModuleList, Options> {
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
          ...options?.moduleOptions,
          collision: {
            ...options?.moduleOptions?.collision,
            targets: [
              {
                name: 'base'
              }
            ]
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

    return mesh;
  }
}
