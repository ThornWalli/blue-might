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
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Object3D, AxesHelper, Mesh, SkinnedMesh, Vector2 } from 'three';
import SeaVehicleUnit, {
  type SeaVehicleUnitModuleList,
  type SeaVehicleUnitModules,
  type SeaVehicleUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/SeaVehicle';
import {
  autoAimFunction,
  createBarrelTargetShoot,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import WeaponUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { weapons } from '@blue-might/weapon';
import { playSound } from '@blue-might/weapon/utils';
import type { WeaponUnitInterface } from '@blue-might/app/lib/utils/unit/weapon';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/combat_submarine_1.glb?url';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends WeaponSupportState {}

export interface CombatSubmarineOptions
  extends SeaVehicleUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}

export interface CombatSubmarineModules extends SeaVehicleUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
}
export type CombatSubmarineModuleList = SeaVehicleUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule | typeof PlayerUnitModule];

export interface RawUnitDescription_CombatSubmarine_1<
  O extends UnitOptions = CombatSubmarineOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'combat_submarine_1';
}

export default class CombatSubmarine_1
  extends SeaVehicleUnit<
    CombatSubmarineModules,
    CombatSubmarineModuleList,
    CombatSubmarineOptions
  >
  implements WeaponUnitInterface<State>
{
  static override KEY = 'combat_submarine_1';

  state: State = {
    weaponActive: false,
    weaponVelocity: [new Vector2(0, 0), new Vector2(0, 0)],
    weaponTargetRotation: [new Vector2(0, 0), new Vector2(0, 0)]
  };

  private objects: {
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: Omit<UnitConstructorOptions<CombatSubmarineOptions>, 'name'> = {},
    moduleList?: CombatSubmarineModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      PlayerUnitModule
    ]);
    super(
      {
        ...options,
        name: 'Submarine 1',
        options: {
          ...options.options,
          weaponAngles: options.options?.weaponAngles ?? [
            {
              min: new Vector2(-Math.PI / 4, -(Math.PI * 9) / 10),
              max: new Vector2((Math.PI * 1) / 6, (Math.PI * 9) / 10)
            },
            {
              revert: true,
              min: new Vector2(-Math.PI / 4, -(Math.PI * 9) / 10),
              max: new Vector2((Math.PI * 1) / 6, (Math.PI * 9) / 10)
            }
          ],
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },
        moduleOptions: {
          ...options.moduleOptions,
          seaVehicle: {
            ...options.moduleOptions?.seaVehicle,
            turnSpeed: 1 / 3
          },
          weapon: {
            autoAimFn: (options: AutoAimFnOptions) =>
              autoAimFunction(
                this.getMap()!.modules.shoot,
                options,
                this.options.weaponAngles,
                this.options.rotationSpeed,
                this.objects.map(({ barrels }) => ({ barrels })),
                this.state,
                () => this.getRotation()
              ),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: new weapons.default('light_projectile'),
                maxAmmunition: 100,
                ammunition: 100
              },
              {
                weapon: new weapons.default('light_projectile'),
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
  private barrelTargetShootTimeouts: number[] = [];

  override async afterSetup(context: SetupContext) {
    await super.afterSetup(context);
    //#region barrel target shoot
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ index, shoot: { slot, projectile } }) => {
          this.objects[index]!.barrelTargetShoots[0]!.visible = true;
          window.clearTimeout(this.barrelTargetShootTimeouts[0]);
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
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);
    const mesh = object;

    if (!this.preview) {
      [1, 2].forEach(index => {
        const headObj = object.getObjectByName(`turretbase_${index}_base`)!;
        const barrelObj = object.getObjectByName(
          `turretbase_${index}_turretgun`
        )!;
        const barrelTargetObj = object.getObjectByName(
          `turretbase_${index}_target`
        )!;

        const barrelWrapperY = new Object3D();
        const barrelWrapperX = new Object3D();

        const barrelTargetShoot = createBarrelTargetShoot({
          object: barrelTargetObj
        });
        barrelTargetObj.add(barrelTargetShoot);

        let parent = headObj.parent!;
        barrelWrapperY.add(headObj);

        barrelWrapperY.position.copy(headObj.position);
        headObj.position.set(0, 0, 0);

        parent.add(barrelWrapperY);

        parent = barrelObj.parent!;
        barrelWrapperX.add(barrelObj);

        barrelWrapperX.position.copy(barrelObj.position);
        barrelObj.position.set(0, 0, 0);

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
          barrelTargetShoots: [barrelTargetShoot]
        });

        this.modules.weapon.registerBarrelTarget(barrelTargetObj);
      });
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
    this.objects.forEach(({ barrels }, i) => {
      const [barrelObjX, barrelObjY] = barrels as [Object3D, Object3D];

      const velocity = this.state.weaponVelocity[i]!;

      if (barrelObjY) {
        barrelObjX.rotation.x += velocity.y;
        barrelObjY.rotation.y += velocity.x;

        barrelObjX.rotation.x = Math.max(
          this.options.weaponAngles[i]!.min.x,
          Math.min(this.options.weaponAngles[i]!.max.x, barrelObjX.rotation.x)
        );
        barrelObjY.rotation.y = Math.max(
          this.options.weaponAngles[i]!.min.y,
          Math.min(this.options.weaponAngles[i]!.max.y, barrelObjY.rotation.y)
        );

        velocity.multiplyScalar(0.9);

        if (velocity.length() < 0.001) {
          velocity.set(0, 0);
        } else {
          this.modules.weapon.updateSourcePosition(i);
        }
      }
    });
  }
}
