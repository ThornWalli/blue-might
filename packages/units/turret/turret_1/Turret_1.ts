import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import {
  type WeaponSupportOptions,
  type WeaponSupportState,
  GROUND_ADJUSTMENT_MODE,
  type SetupContext
} from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import type { Object3D } from 'three';
import { Vector2, Mesh, SkinnedMesh } from 'three';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import WeaponUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import { playSound } from '@blue-might/weapon/utils';
import {
  autoAimFunction,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import Weapon from '@blue-might/app/lib/classes/Weapon';
import {
  PROJECTILE_TYPE,
  WEAPON_SHOOT_TYPE
} from '@blue-might/app/lib/types/weapon';
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
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/turret_1.glb?url';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends WeaponSupportState {}

export interface TurretOptions
  extends TurretBuildingUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}

export interface TurretModules extends TurretBuildingUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
}

export type TurretModuleList = TurretBuildingUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule | typeof PlayerUnitModule];

export interface RawUnitDescription_Turret_1<
  O extends UnitOptions = TurretOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'turret_1';
}

export default class Turret_1
  extends TurretBuildingUnit<TurretModules, TurretModuleList, TurretOptions>
  implements WeaponUnitInterface<State>
{
  static override KEY = 'turret_1';

  state: State = {
    weaponActive: false,
    weaponVelocity: [new Vector2(0, 0)],
    weaponTargetRotation: [new Vector2(0, 0)]
  };

  objects: {
    head?: Object3D;
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: Omit<UnitConstructorOptions<TurretOptions>, 'name'> = {},
    moduleList?: TurretModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      PlayerUnitModule
    ]);
    super(
      {
        ...options,
        name: 'Turret 1',
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
              // {
              //   weapon: new weapons.default('light_projectile'),
              //   maxAmmunition: Infinity,
              //   ammunition: Infinity
              // },
              {
                weapon: new Weapon({
                  id: 'gatling_gun',
                  spreadAmount: 0.125,
                  perSeconds: 15,
                  projectile: PROJECTILE_TYPE.LIGHT_PROJECTILE,
                  shootType: WEAPON_SHOOT_TYPE.AUTO
                }),
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
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.MIN_HEIGHT);
  }

  override setup(context: SetupContext) {
    //#region barrel target shoot
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ shoot: { projectile } }) => {
          playSound(await projectile.getSfx(), 0.3);
        }
      )
    );
    //#endregion
    return super.setup(context);
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
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
