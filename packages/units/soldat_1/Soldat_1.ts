import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';
import baseGlb from './assets/soldat_1.glb?url';
import FigureUnit, {
  type FigureUnitModuleList,
  type FigureUnitModules,
  type FigureUnitOptions
} from '@blue-might/app/lib/classes/unit/Figure';

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
    this.setMaterialReady();
    this.modules.animation.playAction('idle');
    this.subscription.add(
      (this as FigureUnit).modules.figure.observables.move$.subscribe(() => {
        this.modules.animation.stopAction('idle');
        this.modules.animation.playAction('walk');
      })
    );
    this.subscription.add(
      (this as FigureUnit).modules.figure.observables.stop$.subscribe(() => {
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
      }
    });

    return object;
  }
}
