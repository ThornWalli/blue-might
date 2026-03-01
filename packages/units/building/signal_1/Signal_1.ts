import { EMPTY, switchMap, timer, map } from 'rxjs';
import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh, Vector3 } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';

import baseGlb from './assets/signal_1.glb?url';

export interface Options extends BuildingUnitOptions {
  interval: number;
}

export interface RawUnitDescription_Signal_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'signal_1';
}

export default class Signal_1<
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'signal_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Signal',
        options: {
          ...options.options,
          interval: options.options?.interval ?? 25
        },
        moduleOptions: {
          ...options.moduleOptions,
          collision: {
            enabled: false
          }
        }
      },
      moduleList
    );
  }

  override destroy(): void {
    window.clearInterval(this.interval);
    super.destroy();
  }

  private interval: number = -1;
  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();

    this.subscription.add(
      this.observables.active$
        .pipe(
          switchMap(active =>
            active
              ? this.observables.position$.pipe(
                  switchMap(position => {
                    return timer(this.options.interval).pipe(
                      map(() => ({ active, position }))
                    );
                  })
                )
              : EMPTY
          )
        )
        .subscribe(() => {
          this.interval = window.setInterval(async () => {
            const target = this.root.getObjectByName('target');
            if (target) {
              await this.map?.modules.effect.addSignalSmoke(
                target.getWorldPosition(new Vector3())
              );
            }
          }, this.options.interval);
        })
    );
  }

  // override async setup(context: SetupContext) {
  //   await super.setup(context);

  //   this.subscription.add(
  //     this.modules.damage.observables.destroyed$.subscribe(() => {
  //       const flag = this.root.getObjectByName('flag')!;
  //       flag.visible = false;
  //     })
  //   );
  // }

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
