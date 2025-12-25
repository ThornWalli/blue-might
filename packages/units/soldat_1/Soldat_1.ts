import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import type { MeshStandardMaterial } from 'three';
import { Mesh, SkinnedMesh } from 'three';
import baseGlb from './assets/soldat_1.glb?url';
import FigureUnit, {
  type FigureUnitModuleList,
  type FigureUnitModules,
  type FigureUnitOptions
} from '@blue-might/app/lib/classes/unit/Figure';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';

export type Options = FigureUnitOptions;

export default class Human_1<
  Modules extends FigureUnitModules = FigureUnitModules,
  ModuleList extends FigureUnitModuleList = FigureUnitModuleList
> extends FigureUnit<FigureUnitOptions, Modules, ModuleList> {
  static override KEY = 'soldat_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    super(
      {
        ...options,
        name: 'Soldat 1'
      },
      moduleList as ModuleList
    );
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
    this.modules.animation.playAction('idle');
    this.subscription.add(
      (this as FigureUnit)
        .getModuleByType(MovableUnitModule)
        .observables.move$.subscribe(() => {
          this.modules.animation.stopAction('idle');
          this.modules.animation.playAction('walk');
        })
    );
    this.subscription.add(
      (this as FigureUnit)
        .getModuleByType(MovableUnitModule)
        .observables.stop$.subscribe(() => {
          this.modules.animation.stopAction('walk');
          this.modules.animation.playAction('idle');
        })
    );
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    const scale = 0.056 / 1;
    object.scale.set(scale, scale, scale);
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
      }
    });

    return object;
  }
}
