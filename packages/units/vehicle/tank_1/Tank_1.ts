import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import TankUnit, {
  type TankUnitModuleList,
  type TankUnitModules,
  type TankUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Tank';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';

import baseGlb from './assets/tank_1.glb?url';

export type Options = TankUnitOptions;
export type Modules = TankUnitModules;
export type ModuleList = TankUnitModuleList;

export interface RawUnitDescription_Tank_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'tank_1';
}

export default class Tank_1<
  Modules extends TankUnitModules = TankUnitModules,
  ModuleList extends TankUnitModuleList = TankUnitModuleList
> extends TankUnit<Modules, ModuleList, Options> {
  static override KEY = 'tank_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
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
      moduleList
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
      }
    });

    return mesh;
  }
}
