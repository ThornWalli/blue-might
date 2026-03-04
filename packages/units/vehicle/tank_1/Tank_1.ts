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
import { Mesh, SkinnedMesh, Vector2 } from 'three';
import TransportUnitModule from '@blue-might/app/lib/classes/unitModule/Transport';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/tank_1.glb?url';

export type Options = TankUnitOptions;
export interface Modules extends TankUnitModules {
  transport: TransportUnitModule;
}
export type ModuleList = TankUnitModuleList & [typeof TransportUnitModule];

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
    moduleList = addModules(moduleList, [TransportUnitModule]);
    super(
      {
        ...options,
        name: 'Tank',
        moduleOptions: {
          ...options?.moduleOptions,
          transport: {
            entryPosition: new Vector2(0.25, 0.25),
            maxSlots: 4
          },
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
