import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Euler, LoopRepeat, Mesh, SkinnedMesh } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import type { AnimationSetting } from '@blue-might/app/lib/classes/unitModule/Animation';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';

import baseGlb from './assets/wind_turbine_1.glb?url';

export type Options = BuildingUnitOptions;
export interface RawUnitDescription_WindTurbine_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'wind_turbine_1';
}
export default class WindTurbine_1<
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'wind_turbine_1';
  animationSettings: Record<string, AnimationSetting> = {
    active: { clampWhenFinished: false, loop: LoopRepeat, duration: 8 },
    inactive: { clampWhenFinished: false, loop: LoopRepeat, duration: 8 },
    idle: { clampWhenFinished: false, loop: LoopRepeat, duration: 120 }
  };

  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Wind Turbine 1',
        moduleOptions: {
          ...options.moduleOptions,
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
    this.modules.animation.applySettings(this.animationSettings);
    this.modules.animation.playAction('active');
  }

  initialRotationY: number = 0;
  override update(_v: AnimationLoopValue): void {
    if (this.modules.damage.isDestroyed()) return;

    const globalRotation =
      this.getMap()?.modules.airFlow.getRotation() ?? new Euler();
    const head = this.root.getObjectByName('head');
    if (head) {
      head.rotation.y = globalRotation.y;
      head.rotation.y = globalRotation.y;
    }
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
