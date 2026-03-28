import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions,
  UnitState
} from '@blue-might/app/lib/classes/Unit';
import type {
  SetupContext,
  WeaponSupportOptions,
  WeaponSupportState
} from '@blue-might/app/lib/types/unit';
import TankUnit, {
  type TankUnitModuleList,
  type TankUnitModules,
  type TankUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Tank';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Object3D, Vector2, Mesh, SkinnedMesh } from 'three';
import WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import type { AutoAimFnOptions } from '@blue-might/app/lib/classes/unitModule/Weapon';
import { weapons } from '@blue-might/weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { playSound } from '@blue-might/weapon/utils';
import type { WeaponUnitInterface } from '@blue-might/app/lib/utils/unit/weapon';
import {
  autoAimFunction,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import { addModules } from '@blue-might/app/lib/classes/Module';
import CustomizeUnitModule from '@blue-might/app/lib/classes/unitModule/Customize';

import type { UnitObservables } from './../../../app/lib/classes/Unit';
import baseGlb from './assets/combat_tank_1.glb?url';

interface State extends UnitState, WeaponSupportState {}

export interface CombatTankOptions
  extends TankUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}
export interface CombatTankModules extends TankUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  customize: CustomizeUnitModule;
}
export type CombatTankModuleList = TankUnitModuleList &
  [
    | typeof AttackUnitModule
    | typeof WeaponUnitModule
    | typeof CustomizeUnitModule
  ];

export interface RawUnitDescription_CombatTank_1<
  O extends UnitOptions = CombatTankOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'combat_tank_1';
}

export default class CombatTank_1
  extends TankUnit<
    CombatTankModules,
    CombatTankModuleList,
    CombatTankOptions,
    UnitObservables,
    State
  >
  implements WeaponUnitInterface<State>
{
  static override KEY = 'combat_tank_1';

  objects: {
    head?: Object3D;
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: Omit<
      UnitConstructorOptions<CombatTankOptions, State>,
      'name'
    > = {},
    moduleList?: CombatTankModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      CustomizeUnitModule
    ]);

    super(
      {
        ...options,
        name: 'Combat Tank',
        state: {
          weaponActive: false,
          weaponVelocity: [
            new Vector2(0, 0),
            new Vector2(0, 0),
            new Vector2(0, 0)
          ],
          weaponTargetRotation: [
            new Vector2(0, 0),
            new Vector2(0, 0),
            new Vector2(0, 0)
          ]
        },
        options: {
          ...options.options,
          weaponAngles: options.options?.weaponAngles ?? [
            {
              min: new Vector2((-Math.PI * 1) / 4, -Infinity),
              max: new Vector2((Math.PI * 1) / 15, Infinity)
            },
            {
              min: new Vector2((-Math.PI * 1) / 4, -Infinity),
              max: new Vector2((Math.PI * 1) / 15, Infinity)
            },
            {
              min: new Vector2((-Math.PI * 1) / 4, -Infinity),
              max: new Vector2((Math.PI * 1) / 15, Infinity)
            }
          ],
          rotationSpeed: options.options?.rotationSpeed ?? 0.05
        },
        moduleOptions: {
          ...options.moduleOptions,
          damage: {
            maxDamage: 5
          },
          attack: {
            radius: 10
          },
          weapon: {
            autoAimFn: (options: AutoAimFnOptions) =>
              autoAimFunction(
                this.getMap()!.modules.shoot,
                options,
                this.options.weaponAngles,
                this.options.rotationSpeed,
                this.objects.map(obj => ({
                  head: obj.head,
                  barrels: obj.barrels
                })),
                this.state,
                () => this.getRotation()
              ),
            slotCount: 3,
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: new weapons.gun_120mm(),
                maxAmmunition: 50,
                ammunition: 50
              },
              {
                weapon: new weapons.rapid_fire_gun_35mm(),
                maxAmmunition: 200,
                ammunition: 200
              },
              {
                weapon: new weapons.gun_155mm(),
                maxAmmunition: 5,
                ammunition: 5
              }
            ],
            ...options.moduleOptions?.weapon
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [
              {
                name: 'base'
              }
            ]
          }
        }
      },
      moduleList
    );
  }

  override async afterSetup(context: SetupContext) {
    await super.afterSetup(context);
    //#region barrel target shoot
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ shoot: { projectileInstance } }) => {
          playSound(await projectileInstance.projectile.getShootSfx(), 0.3);
        }
      )
    );
    //#endregion
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object } = await loadGltf(baseGlb);

    //#region barrel

    const headObj = object.getObjectByName('head')!;
    const barrelObj = object.getObjectByName('barrel')!;
    const barrelTargetObj = object.getObjectByName('barrel_target')!;

    const barrelWrapper = new Object3D();

    barrelObj.position.set(0, -0.55, 0);
    barrelWrapper.position.set(0, 0.55, 0.1);
    barrelWrapper.add(barrelObj);
    headObj.add(barrelWrapper);

    this.objects.push(
      {
        head: headObj,
        barrels: [barrelWrapper],
        barrelTargets: [barrelTargetObj],
        barrelTargetShoots: [barrelTargetObj]
      },
      {
        head: headObj,
        barrels: [barrelWrapper],
        barrelTargets: [barrelTargetObj],
        barrelTargetShoots: [barrelTargetObj]
      },
      {
        head: headObj,
        barrels: [barrelWrapper],
        barrelTargets: [barrelTargetObj],
        barrelTargetShoots: [barrelTargetObj]
      }
    );

    this.modules.weapon.registerBarrelTarget(barrelTargetObj);
    this.modules.weapon.registerBarrelTarget(barrelTargetObj);
    this.modules.weapon.registerBarrelTarget(barrelTargetObj);

    //#endregion

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

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
      const velocity = this.state.weaponVelocity[index]!;
      if (headObj && barrelObj) {
        // NEU: Manuelle Bewegung nur, wenn Auto-Aim nicht aktiv ist
        if (!this.modules.weapon.isAutoAimActive()) {
          headObj.rotation.y += velocity.x;
          barrelObj.rotation.x += velocity.y;
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

        velocity.multiplyScalar(0.9);

        if (velocity.length() < 0.001) {
          velocity.set(0, 0);
        } else {
          this.modules.weapon.updateSourcePosition(0);
        }
      }
    });
  }
}
