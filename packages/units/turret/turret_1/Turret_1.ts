//#region  imports
import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitObservables,
  UnitOptions,
  UnitState
} from '@blue-might/app/lib/classes/Unit';
import type {
  WeaponSupportOptions,
  WeaponSupportState,
  SetupContext
} from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import type { Object3D } from 'three';
import { Vector2, Mesh, SkinnedMesh, LoopOnce } from 'three';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import type { AutoAimFnOptions } from '@blue-might/app/lib/classes/unitModule/Weapon';
import { playSound } from '@blue-might/weapon/utils';
import {
  autoAimFunction,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import type { WeaponUnitInterface } from '@blue-might/app/lib/utils/unit/weapon';
import {
  disablePathfinding,
  disableRaycaster
} from '@blue-might/app/lib/utils/object';
import type {
  TurretBuildingUnitModuleList,
  TurretBuildingUnitModules,
  TurretBuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/building/Turret';
import TurretBuildingUnit from '@blue-might/app/lib/classes/unit/building/Turret';
import type { AnimationSetting } from '@blue-might/app/lib/classes/unitModule/Animation';
import { WEAPON } from '@blue-might/app/lib/types/weapon';

import baseGlb from './assets/turret_1.glb?url';
//#endregion

//#region definitions

export interface TurretState extends UnitState, WeaponSupportState {}

export interface TurretOptions
  extends TurretBuildingUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}

export type TurretModules = TurretBuildingUnitModules;

export type TurretModuleList = TurretBuildingUnitModuleList;

export interface RawUnitDescription_Turret_1<
  O extends UnitOptions = TurretOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'turret_1';
}

//#endregion

export default class Turret_1
  extends TurretBuildingUnit<
    TurretModules,
    TurretModuleList,
    TurretOptions,
    UnitObservables,
    TurretState
  >
  implements WeaponUnitInterface<TurretState>
{
  static override KEY = 'turret_1';

  animationSettings: Record<string, AnimationSetting> = {
    destroyed: { clampWhenFinished: true, loop: LoopOnce, duration: 0.5 }
  };

  objects: {
    head?: Object3D;
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: UnitConstructorOptions<TurretOptions, TurretState> = {},
    moduleList?: TurretModuleList
  ) {
    super(
      {
        ...options,
        name: options.name ?? 'Turret',
        state: {
          weaponActive: false,
          weaponVelocity: [new Vector2(0, 0)],
          weaponTargetRotation: [new Vector2(0, 0)]
        },
        options: {
          ...options.options,
          weaponAngles: options.options?.weaponAngles ?? [
            {
              min: new Vector2((-Math.PI * 1) / 4, -Infinity),
              max: new Vector2((Math.PI * 1) / 15, Infinity)
            }
          ],
          rotationSpeed: options.options?.rotationSpeed ?? 0.05
        },
        moduleOptions: {
          ...options.moduleOptions,
          attack: {
            radius: options.moduleOptions?.attack?.radius ?? 10
          },
          weapon: {
            autoAimFn: (options: AutoAimFnOptions) =>
              autoAimFunction(
                this.getMap()!.modules.shoot,
                options,
                this.options.weaponAngles,
                this.options.rotationSpeed,
                this.objects.map(({ head, barrels }) => ({
                  head,
                  barrels
                })),
                this.state,
                () => this.getRotation()
              ),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: WEAPON.GATLING_GUN_35MM,
                maxAmmunition: Infinity,
                ammunition: Infinity
              }
            ],
            ...options.moduleOptions?.weapon
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [
              {
                name: 'head_base'
              },
              {
                name: 'body',
                default: true
              }
            ]
          }
        }
      },
      moduleList
    );
  }

  override setup(context: SetupContext) {
    //#region barrel target shoot
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ shoot: { projectileInstance } }) => {
          playSound(await projectileInstance.projectile.getShootSfx(), 0.3);
        }
      )
    );
    //#endregion
    this.subscription.add(
      this.modules.damage.observables.destroyed$.subscribe(() => {
        this.modules.animation.playAction('destroyed');
      })
    );
    return super.setup(context);
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
    this.modules.animation.applySettings(this.animationSettings);
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    //#region barrel

    const headObj = object.getObjectByName('head')!;
    const barrelObj = object.getObjectByName('barrel')!;
    const barrelTargetObj = object.getObjectByName('barrel_target')!;

    this.objects.push({
      head: headObj,
      barrels: [barrelObj],
      barrelTargets: [barrelTargetObj],
      barrelTargetShoots: [barrelTargetObj]
    });

    this.modules.weapon.registerBarrelTarget(barrelTargetObj);

    //#endregion

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    disableRaycaster(barrelObj);
    disablePathfinding(barrelObj);

    return object;
  }

  override update(_v: AnimationLoopValue): void {
    if (this.preview) return;
    super.update(_v);
    updateControls(this);
    this.updateObjects();
  }

  private updateObjects() {
    this.objects.forEach(({ head: headObj, barrels: [barrelObj] }, index) => {
      const weaponVelocity = this.state.weaponVelocity[index]!;
      if (headObj && barrelObj) {
        // NEU: Manuelle Bewegung nur, wenn Auto-Aim nicht aktiv ist
        if (!this.modules.weapon.isAutoAimActive()) {
          headObj.rotation.y += weaponVelocity.x;
          barrelObj.rotation.x += weaponVelocity.y;
        }

        headObj.rotation.y = Math.max(
          this.options.weaponAngles[index]!.min.y,
          Math.min(this.options.weaponAngles[index]!.max.y, headObj.rotation.y)
        );

        barrelObj.rotation.x = Math.max(
          this.options.weaponAngles[index]!.min.x,
          Math.min(
            this.options.weaponAngles[index]!.max.x,
            barrelObj.rotation.x
          )
        );

        weaponVelocity.multiplyScalar(0.9);

        if (weaponVelocity.length() < 0.001) {
          weaponVelocity.set(0, 0);
        } else {
          this.modules.weapon.updateSourcePosition(0);
        }
      }
    });
  }
}

export class Turret_35mm_Gatling extends Turret_1 {
  static override KEY = 'turret_35mm_gatling';
  constructor(
    options: Omit<
      UnitConstructorOptions<TurretOptions, TurretState>,
      'name'
    > = {},
    moduleList?: TurretModuleList
  ) {
    super(
      {
        ...options,
        name: 'Turret 35mm (Gatling)',
        moduleOptions: {
          ...options.moduleOptions,
          weapon: {
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: WEAPON.GATLING_GUN_35MM,
                maxAmmunition: Infinity,
                ammunition: Infinity
              }
            ]
          }
        }
      },
      moduleList
    );
  }
}
export class Turret_35mm_Rapid extends Turret_1 {
  static override KEY = 'turret_35mm_rapid';
  constructor(
    options: Omit<
      UnitConstructorOptions<TurretOptions, TurretState>,
      'name'
    > = {},
    moduleList?: TurretModuleList
  ) {
    super(
      {
        ...options,
        name: 'Turret 35mm (Rapid)',
        moduleOptions: {
          ...options.moduleOptions,
          weapon: {
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: WEAPON.RAPID_FIRE_GUN_35MM,
                maxAmmunition: Infinity,
                ammunition: Infinity
              }
            ]
          }
        }
      },
      moduleList
    );
  }
}
export class Turret_120mm extends Turret_1 {
  static override KEY = 'turret_120mm';
  constructor(
    options: Omit<
      UnitConstructorOptions<TurretOptions, TurretState>,
      'name'
    > = {},
    moduleList?: TurretModuleList
  ) {
    super(
      {
        ...options,
        name: 'Turret 120mm',
        moduleOptions: {
          ...options.moduleOptions,
          weapon: {
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: WEAPON.GUN_120MM,
                maxAmmunition: Infinity,
                ammunition: Infinity
              }
            ]
          }
        }
      },
      moduleList
    );
  }
}
export class Turret_155mm extends Turret_1 {
  static override KEY = 'turret_155mm';
  constructor(
    options: Omit<
      UnitConstructorOptions<TurretOptions, TurretState>,
      'name'
    > = {},
    moduleList?: TurretModuleList
  ) {
    super(
      {
        ...options,
        name: 'Turret 155mm',
        moduleOptions: {
          ...options.moduleOptions,
          radar: {
            radius: 15
          },
          attack: {
            radius: 15
          },
          weapon: {
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: WEAPON.GUN_155MM,
                maxAmmunition: Infinity,
                ammunition: Infinity
              }
            ]
          }
        }
      },
      moduleList
    );
  }
}
