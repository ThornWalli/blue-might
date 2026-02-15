import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
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
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import type { AutoAimFnOptions } from '@blue-might/app/lib/classes/unitModule/Weapon';
import { weapons } from '@blue-might/weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { playSound } from '@blue-might/weapon/utils';
import type { WeaponUnitInterface } from '@blue-might/app/lib/utils/unit/weapon';
import {
  autoAimFunction,
  createBarrelTargetShoot,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/combat_tank_1.glb?url';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends WeaponSupportState {}

export interface CombatTankOptions
  extends TankUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}
export interface CombatTankModules extends TankUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
}
export type CombatTankModuleList = TankUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule | typeof PlayerUnitModule];

export interface RawUnitDescription_CombatTank_1<
  O extends UnitOptions = CombatTankOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'combat_tank_1';
}

export default class CombatTank_1
  extends TankUnit<CombatTankModules, CombatTankModuleList, CombatTankOptions>
  implements WeaponUnitInterface<State>
{
  static override KEY = 'combat_tank_1';

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

  private barrelTargetShootTimeouts: number[] = [];

  constructor(
    options: Omit<UnitConstructorOptions<CombatTankOptions>, 'name'> = {},
    moduleList?: CombatTankModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      PlayerUnitModule
    ]);

    super(
      {
        ...options,
        name: 'Combat Tank 1',
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
                this.objects.map(obj => ({
                  head: obj.head,
                  barrels: obj.barrels
                })),
                this.state,
                () => this.getRotation()
              ),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: new weapons.default('heavy_projectile'),
                maxAmmunition: 100,
                ammunition: 100
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
        async ({ index, shoot: { projectile, slot } }) => {
          this.objects[index]!.barrelTargetShoots[0]!.visible = true;
          window.clearTimeout(this.barrelTargetShootTimeouts[index]);
          this.barrelTargetShootTimeouts[index] = window.setTimeout(() => {
            this.objects[index]!.barrelTargetShoots[0]!.visible = false;
          }, 1000 / slot.weapon.perSeconds);
          playSound(await projectile.getSfx(), 0.3);
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

    const barrelTargetShoot = createBarrelTargetShoot();
    barrelTargetObj.add(barrelTargetShoot);

    this.objects.push({
      head: headObj,
      barrels: [barrelWrapper],
      barrelTargets: [barrelTargetObj],
      barrelTargetShoots: [barrelTargetShoot]
    });

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
