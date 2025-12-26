import { combineLatest, filter } from 'rxjs';
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';

import baseGlb from './assets/combat_helicopter_1.glb?url';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh, LoopRepeat, LoopOnce } from 'three';
import HelicopterUnit, {
  type HelicopterUnitModuleList,
  type HelicopterUnitModules,
  type HelicopterUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Helicopter';
import { replaceColors } from '@blue-might/app/lib/utils/object';

export type Options = HelicopterUnitOptions;
export type Modules = HelicopterUnitModules;
export type ModuleList = HelicopterUnitModuleList;

export default class CombatHelicopter_1<
  Modules extends HelicopterUnitModules = HelicopterUnitModules,
  ModuleList extends HelicopterUnitModuleList = HelicopterUnitModuleList
> extends HelicopterUnit<Options, Modules, ModuleList> {
  static override KEY = 'combat_helicopter_1';

  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    super(
      {
        ...options,
        name: 'Combat Helicopter 1',

        moduleOptions: {
          ...options.moduleOptions,
          helicopter: {
            ...options.moduleOptions?.helicopter,
            gearsHeight: 0.15
          },
          collision: {
            ...options.moduleOptions?.collision,
            targetName: 'base',
            targetChildIndex: 1
          }
        }
      },
      moduleList as ModuleList
    );
  }

  override async setup(context: SetupContext) {
    await super.setup(context);
  }

  animationSettings: Record<
    string,
    {
      clampWhenFinished: boolean;
      loop: typeof LoopRepeat | typeof LoopOnce;
      duration: number;
    }
  > = {
    land_gears: { clampWhenFinished: true, loop: LoopOnce, duration: 2 },
    rotor_idle: { clampWhenFinished: false, loop: LoopRepeat, duration: 8 },
    rotor_run: { clampWhenFinished: false, loop: LoopRepeat, duration: 0.25 },
    rotor_off: { clampWhenFinished: false, loop: LoopRepeat, duration: 0 }
  };

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    Object.entries(this.animationSettings).forEach(
      ([name, { clampWhenFinished, loop, duration }]) => {
        const action = this.modules.animation.getAction(name);
        if (action) {
          action.clampWhenFinished = clampWhenFinished;
          action.setLoop(loop, Infinity);
          action.setDuration(duration);
        }
      }
    );

    this.setMaterialReady();

    this.subscription.add(
      this.modules.helicopter.observables.gearsActive$
        .pipe(filter(gearsActive => gearsActive))
        .subscribe(() => {
          if (!this.modules.helicopter.getGearsOpened()) {
            this.modules.animation.playAction('land_gears', { reverse: true });
          } else {
            this.modules.animation.playAction('land_gears');
          }
        })
    );

    this.subscription.add(
      combineLatest([
        this.modules.helicopter.observables.active$,
        this.modules.helicopter.observables.powerInfo$,
        this.modules.helicopter.observables.flightStatus$
      ]).subscribe(([_active, powerInfo]) => {
        const action = this.modules.animation.getAction('rotor_run');
        if (action) {
          action.timeScale = powerInfo.currentPower;
        }
      })
    );

    this.modules.animation.playAction('rotor_run');
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

        replaceColors(
          [
            [
              'primary',
              this.modules.faction.getFaction()?.colors[0] ?? 0xf2f2f2
            ],
            [
              'secondary',
              this.modules.faction.getFaction()?.colors[1] ?? 0xf2f2f2
            ]
          ],
          child
        );
      }
    });

    return mesh;
  }
}
