import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { LoopOnce, LoopRepeat, Mesh, SkinnedMesh } from 'three';
import FigureUnit, {
  type FigureUnitModuleList,
  type FigureUnitModules,
  type FigureUnitOptions
} from '@blue-might/app/lib/classes/unit/Figure';
import type { AnimationSetting } from '@blue-might/app/lib/classes/unitModule/Animation';
import { FIGURE_STATUS } from '@blue-might/app/lib/classes/unitModule/movable/FigureMovable';

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

  animationSettings: Record<string, AnimationSetting> = {
    idle: { clampWhenFinished: false, loop: LoopRepeat, duration: 8 },
    walk: { clampWhenFinished: false, loop: LoopRepeat, duration: 0.5 },
    run: { clampWhenFinished: false, loop: LoopRepeat, duration: 0.25 },
    swim: { clampWhenFinished: false, loop: LoopRepeat, duration: 0.5 },
    dead: { clampWhenFinished: true, loop: LoopOnce, duration: 0.25 }
  };

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
    if (!this.preview) {
      this.modules.animation.applySettings(this.animationSettings);
      this.subscription.add(
        this.modules.figureMovable.observables.status$.subscribe(status => {
          this.modules.animation.stopActions();
          switch (status) {
            case FIGURE_STATUS.WALKING:
              this.modules.animation.playAction('walk');
              break;
            case FIGURE_STATUS.RUNNING:
              this.modules.animation.playAction('run');
              break;
            case FIGURE_STATUS.IDLE:
              this.modules.animation.playAction('idle');
              break;
            case FIGURE_STATUS.SWIMMING:
              this.modules.animation.playAction('swim');
              break;
            case FIGURE_STATUS.DEAD:
              this.modules.animation.playAction('dead');
              break;
            default:
              this.modules.animation.playAction('idle');
          }
        })
      );
    }
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    if (!this.preview) {
      this.modules.animation.setAnimations(animations);
    }

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return object;
  }
}
