import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh, Vector2 } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import RescueUnitModule from '@blue-might/app/lib/classes/unitModule/Rescue';
import { addModules } from '@blue-might/app/lib/classes/Module';
import TransportUnitModule from '@blue-might/app/lib/classes/unitModule/Transport';

import baseGlb from './assets/barrack_rescue_1.glb?url';

export type Options = BuildingUnitOptions;
interface BarrackRescueUnitModules extends BuildingUnitModules {
  rescue: RescueUnitModule;
  transport: TransportUnitModule;
}
type BarrackRescueUnitModuleList = (
  | typeof RescueUnitModule
  | typeof TransportUnitModule
)[] &
  BuildingUnitModuleList;
export interface RawUnitDescription_BarrackRescue_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'barrack_rescue_1';
}

export default class BarrackRescue_1<
  Modules extends BarrackRescueUnitModules = BarrackRescueUnitModules,
  ModuleList extends BarrackRescueUnitModuleList = BarrackRescueUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'barrack_rescue_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    moduleList = addModules(moduleList, [
      RescueUnitModule,
      TransportUnitModule
    ]);
    super(
      {
        ...options,
        name: 'Barrack Rescue 1',
        moduleOptions: {
          ...options.moduleOptions,
          transport: {
            maxSlots: Infinity,
            entryPosition: new Vector2(0, 0.65)
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [{ name: 'base', default: true }]
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
