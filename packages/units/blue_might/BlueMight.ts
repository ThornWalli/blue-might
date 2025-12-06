import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';

import baseGlb from './assets/blue_might.glb?url';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh, LoopRepeat } from 'three';
import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '@blue-might/app/lib/classes/unit/Vehicle';

export type Options = VehicleUnitOptions;
export type Modules = VehicleUnitModules;
export type ModuleList = VehicleUnitModuleList;

export default class BlueMight<
  Modules extends VehicleUnitModules = VehicleUnitModules,
  ModuleList extends VehicleUnitModuleList = VehicleUnitModuleList
> extends VehicleUnit<Options, Modules, ModuleList> {
  static override KEY = 'blue_might';

  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    super(
      {
        ...options,
        name: 'BlueMight',
        moduleOptions: {
          collision: {
            targetName: 'base',
            targetChild: true
          }
        }
      },
      moduleList as ModuleList
    );
  }

  override async afterSetup(_context: SetupContext) {
    const action = this.modules.animation.getAction('idle_rotor');
    if (action) {
      action.clampWhenFinished = false;
      action.setLoop(LoopRepeat, Infinity);
      action.setDuration(4);
    }

    // this.modules.animation.setAnimationAction('idle_rotor');
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);
    const mesh = object;

    // mesh.traverse(child => {
    //   if (child instanceof Mesh) {
    //     child.castShadow = true;
    //     child.receiveShadow = true;
    //   }
    // });
    // mesh.castShadow = true;

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return mesh;
  }
}
