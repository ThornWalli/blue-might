import { Mesh, SkinnedMesh } from 'three';
import type {
  SetupContext,
  UnitConstructorOptions,
  RawUnitDescription,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import LandingPortUnit, {
  type LandingPortUnitModuleList,
  type LandingPortUnitModules,
  type LandingPortUnitOptions
} from '@blue-might/app/lib/classes/unit/LandingPort';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';

import baseGlb from './assets/landing_port_1.glb?url';

export type Options = LandingPortUnitOptions;
export type Modules = LandingPortUnitModules;
export type ModuleList = LandingPortUnitModuleList;
export interface RawUnitDescription_LandingPort_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'landing_port_1';
}
export default class LandingPort_1 extends LandingPortUnit<
  Modules,
  ModuleList,
  Options
> {
  static override KEY = 'landing_port_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Landing Port 1',
        moduleOptions: {
          ...options.moduleOptions,
          collision: {
            ...options.moduleOptions?.collision,
            targets: [
              {
                name: 'base'
              }
            ]
          },
          damage: {
            ...options.moduleOptions?.damage,
            enabled: false
          }
        }
      },
      moduleList as ModuleList
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
      }
    });

    return object;
  }
}
