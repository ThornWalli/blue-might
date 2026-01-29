import type {
  RawUnitDescription,
  SetupContext,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh } from 'three';
import FigureUnit, {
  type FigureUnitModuleList,
  type FigureUnitModules,
  type FigureUnitOptions
} from '@blue-might/app/lib/classes/unit/Figure';

import baseGlb from './assets/soldat_1.glb?url';

export type Options = FigureUnitOptions;

export interface RawUnitDescription_Soldat_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'soldat_1';
}

export default class Soldat_1<
  Modules extends FigureUnitModules = FigureUnitModules,
  ModuleList extends FigureUnitModuleList = FigureUnitModuleList
> extends FigureUnit<Modules, ModuleList, Options> {
  static override KEY = 'soldat_1';

  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Soldat 1'
      },
      moduleList
    );
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
    this.modules.animation.playAction('idle');
    this.subscription.add(
      (this as FigureUnit).modules.movable.observables.move$.subscribe(() => {
        this.modules.animation.stopAction('idle');
        this.modules.animation.playAction('walk');
      })
    );
    this.subscription.add(
      (this as FigureUnit).modules.movable.observables.stop$.subscribe(() => {
        this.modules.animation.stopAction('walk');
        this.modules.animation.playAction('idle');
      })
    );
    this.subscription.add(
      this.modules.damage.observables.destroyed$.subscribe(() => {
        this.setDead();
      })
    );
  }

  setDead() {
    this.root.rotation.x += Math.PI / 2;
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
