import { combineLatest, filter } from 'rxjs';
import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import type { Object3D } from 'three';
import { Mesh, SkinnedMesh, LoopRepeat, LoopOnce, Vector2 } from 'three';
import HelicopterUnit, {
  type HelicopterUnitModuleList,
  type HelicopterUnitModules,
  type HelicopterUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Helicopter';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import type { AnimationSetting } from '@blue-might/app/lib/classes/unitModule/Animation';
import { addModules } from '@blue-might/app/lib/classes/Module';
import TransportUnitModule from '@blue-might/app/lib/classes/unitModule/Transport';

import baseGlb from './assets/helicopter_1.glb?url';

export interface HelicopterOptions extends HelicopterUnitOptions {
  rotationSpeed: number;
}

export interface HelicopterModules extends HelicopterUnitModules {
  attack: AttackUnitModule;
  transport: TransportUnitModule;
}
export type HelicopterModuleList = HelicopterUnitModuleList &
  [
    | typeof AttackUnitModule
    | typeof WeaponUnitModule
    | typeof TransportUnitModule
  ];

export interface RawUnitDescription_Helicopter_1<
  O extends UnitOptions = HelicopterOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'helicopter_1';
}

export default class Helicopter_1 extends HelicopterUnit<
  HelicopterModules,
  HelicopterModuleList,
  HelicopterOptions
> {
  static override KEY = 'helicopter_1';

  animationSettings: Record<string, AnimationSetting> = {
    land_gears: { clampWhenFinished: true, loop: LoopOnce, duration: 2 },
    rotor_idle: { clampWhenFinished: false, loop: LoopRepeat, duration: 8 },
    rotor_run: { clampWhenFinished: false, loop: LoopRepeat, duration: 0.25 },
    rotor_off: { clampWhenFinished: false, loop: LoopRepeat, duration: 0 }
  };

  private objects: {
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: Omit<UnitConstructorOptions<HelicopterOptions>, 'name'> = {},
    moduleList?: HelicopterModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      TransportUnitModule
    ]);
    super(
      {
        ...options,
        name: 'Helicopter',

        options: {
          ...options.options,
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },

        moduleOptions: {
          ...options.moduleOptions,
          movable: {
            ...options.moduleOptions?.movable,
            maxFuel: 200
          },
          transport: {
            entryPosition: new Vector2(0.25, 0.25),
            maxSlots: 4
          },
          helicopter: {
            ...options.moduleOptions?.helicopter,
            gearsHeight: 0.165,
            maxSpeed: 1.5,
            yawSpeed: 2
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [
              {
                name: 'base'
              }
            ]
          }
        },
        moduleStates: {
          ...options.moduleStates
        }
      },
      moduleList
    );
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);

    this.modules.animation.applySettings(this.animationSettings);

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

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return mesh;
  }

  override update(_v: AnimationLoopValue): void {
    super.update(_v);
  }
}
