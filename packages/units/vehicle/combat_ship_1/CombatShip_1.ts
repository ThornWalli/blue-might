import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitObservables,
  UnitOptions,
  UnitState
} from '@blue-might/app/lib/classes/Unit';
import type {
  SetupContext,
  WeaponSupportOptions,
  WeaponSupportState
} from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { AxesHelper, Mesh, Object3D, SkinnedMesh, Vector2 } from 'three';
import SeaVehicleUnit, {
  type SeaVehicleUnitModuleList,
  type SeaVehicleUnitModules,
  type SeaVehicleUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/SeaVehicle';
import {
  autoAimFunction,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import WeaponUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { weapons } from '@blue-might/weapon';
import { playSound } from '@blue-might/weapon/utils';
import type { WeaponUnitInterface } from '@blue-might/app/lib/utils/unit/weapon';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/combat_ship_1.glb?url';

interface State extends UnitState, WeaponSupportState {}

export interface CombatShipOptions
  extends SeaVehicleUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}

export interface CombatShipModules extends SeaVehicleUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
}
export type CombatShipModuleList = SeaVehicleUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule];

export interface RawUnitDescription_CombatShip_1<
  O extends UnitOptions = CombatShipOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'combat_ship_1';
}

export default class CombatShip_1
  extends SeaVehicleUnit<
    CombatShipModules,
    CombatShipModuleList,
    CombatShipOptions,
    UnitObservables,
    State
  >
  implements WeaponUnitInterface<State>
{
  static override KEY = 'combat_ship_1';

  private objects: {
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: Omit<
      UnitConstructorOptions<CombatShipOptions, State>,
      'name'
    > = {},
    moduleList?: CombatShipModuleList
  ) {
    moduleList = addModules(moduleList, [AttackUnitModule, WeaponUnitModule]);
    super(
      {
        ...options,
        name: 'Boat',
        state: {
          weaponActive: false,
          weaponVelocity: [new Vector2(0, 0)],
          weaponTargetRotation: [new Vector2(0, 0)]
        },
        options: {
          ...options.options,
          weaponAngles: options.options?.weaponAngles ?? [
            {
              min: new Vector2((-Math.PI * 1) / 4, -Math.PI * (3 / 5)),
              max: new Vector2(0, Math.PI * (3 / 5))
            }
          ],
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },
        moduleOptions: {
          ...options.moduleOptions,
          damage: {
            maxDamage: 2
          },
          weapon: {
            autoAimFn: (options: AutoAimFnOptions) =>
              autoAimFunction(
                this.getMap()!.modules.shoot,
                options,
                this.options.weaponAngles,
                this.options.rotationSpeed,
                this.objects.map(obj => ({ barrels: obj.barrels })),
                this.state,
                () => this.getRotation()
              ),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: new weapons.rapid_fire_gun_35mm(),
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
          playSound(await projectileInstance.projectile.getSfx(), 0.3);
        }
      )
    );
    //#endregion
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);
    const mesh = object;

    const headObj = object.getObjectByName('weapon_head')!;
    const barrelObj = object.getObjectByName('weapon_barrel')!;
    const barrelTargetObj = object.getObjectByName('weapon_barrel_target')!;

    if (!this.preview) {
      const barrelWrapperY = new Object3D();
      const barrelWrapperX = new Object3D();

      let parent = headObj.parent!;
      barrelWrapperY.add(headObj);
      parent.add(barrelWrapperY);

      parent = barrelObj.parent!;
      barrelWrapperX.add(barrelObj);
      parent.add(barrelWrapperX);

      if (this.debug) {
        let axesHelper = new AxesHelper(1);
        barrelWrapperX.add(axesHelper);
        axesHelper = new AxesHelper(1);
        barrelWrapperY.add(axesHelper);
        axesHelper = new AxesHelper(1);
        parent.add(axesHelper);
      }

      this.objects.push({
        barrels: [barrelWrapperX, barrelWrapperY],
        barrelTargets: [barrelTargetObj],
        barrelTargetShoots: [barrelTargetObj]
      });

      this.modules.weapon.registerBarrelTarget(barrelTargetObj);
    }

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return mesh;
  }

  override update(_v: AnimationLoopValue): void {
    if (this.preview) return;
    super.update(_v);
    updateControls(this);
    this.updateObjects();
  }

  private updateObjects() {
    this.objects.forEach(({ barrels }, index) => {
      const [barrelObjX, barrelObjY] = barrels as [Object3D, Object3D];

      const velocity = this.state.weaponVelocity[index]!;

      if (barrelObjY) {
        barrelObjX.rotation.x += velocity.y;
        barrelObjY.rotation.y += velocity.x;
        // weaponObj.rotation.y += this.state.weaponVelocity.x;
        // barrelObj.rotation.x += this.state.weaponVelocity.y;

        barrelObjX.rotation.x = Math.max(
          this.options.weaponAngles[0]!.min.x,
          Math.min(this.options.weaponAngles[0]!.max.x, barrelObjX.rotation.x)
        );
        barrelObjY.rotation.y = Math.max(
          this.options.weaponAngles[0]!.min.y,
          Math.min(this.options.weaponAngles[0]!.max.y, barrelObjY.rotation.y)
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
