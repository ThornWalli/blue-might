import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Euler, Mesh, SkinnedMesh } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';

import baseGlb from './assets/windsock_1.glb?url';

export type Options = BuildingUnitOptions;
export interface RawUnitDescription_Windsock_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'windsock_1';
}
export default class Windsock_1<
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'windsock_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Windsock'
      },
      moduleList
    );
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
  }

  override async setup(context: SetupContext) {
    await super.setup(context);

    this.subscription.add(
      this.modules.damage.observables.destroyed$.subscribe(() => {
        const flag = this.root.getObjectByName('windsock')!;
        flag.visible = false;
      })
    );
  }

  initialRotationY: number = 0;
  override update(v: AnimationLoopValue): void {
    if (this.modules.damage.isDestroyed()) return;
    const speed = this.getMap()?.modules.airFlow.getSpeed() ?? 0;

    const wave = Math.sin(v.time * speed * (0.5 / 100)) * 0.1;

    const globalRotation =
      this.getMap()?.modules.airFlow.getRotation() ?? new Euler();
    if (this.root) {
      this.root.rotation.y = globalRotation.y;
      this.root.rotation.y = globalRotation.y + wave;
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
