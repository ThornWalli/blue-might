/* eslint-disable complexity */
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import {
  Object3D,
  AxesHelper,
  Mesh,
  SkinnedMesh,
  Vector2,
  LoopRepeat
} from 'three';
import { replaceColors } from '@blue-might/app/lib/utils/material';
import SeaVehicleUnit, {
  type SeaVehicleUnitModuleList,
  type SeaVehicleUnitModules,
  type SeaVehicleUnitOptions
} from '@blue-might/app/lib/classes/unit/SeaVehicle';
import {
  autoAimFunction,
  createBarrelTargetShoot
} from '@blue-might/app/lib/utils/turret';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import WeaponUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import {
  ControlAction,
  type ControlState
} from '@blue-might/app/lib/classes/playerModule/Controls';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { weapons } from '@blue-might/weapon';
import { playSound } from '@blue-might/weapon/utils';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

import baseGlb from './assets/combat_fregatte_1.glb?url';

interface State {
  weaponActive: boolean;
  weaponVelocity: Vector2[];
  weaponTargetRotation: Vector2[];
}

export interface CombatFregatteOptions extends SeaVehicleUnitOptions {
  weaponAngles: {
    min: Vector2;
    max: Vector2;
  }[];
  rotationSpeed: number;
}

export interface CombatFregatteModules extends SeaVehicleUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
}
export type CombatFregatteModuleList = SeaVehicleUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule | typeof PlayerUnitModule];

export default class CombatFregatte_1 extends SeaVehicleUnit<
  CombatFregatteModules,
  CombatFregatteModuleList,
  CombatFregatteOptions
> {
  static override KEY = 'combat_fregatte_1';

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
    options: Omit<UnitConstructorOptions<CombatFregatteOptions>, 'name'> = {},
    moduleList: Partial<CombatFregatteModuleList> = []
  ) {
    moduleList.push(AttackUnitModule, WeaponUnitModule, PlayerUnitModule);
    super(
      {
        ...options,
        name: 'Fregatte 1',
        options: {
          ...options.options,
          weaponAngles: options.options?.weaponAngles ?? [
            {
              min: new Vector2(-Math.PI / 4, -(Math.PI * 9) / 10),
              max: new Vector2((Math.PI * 1) / 20, (Math.PI * 9) / 10)
            }
          ],
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },
        moduleOptions: {
          ...options.moduleOptions,
          attack: {
            radius: 10
          },
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
                weapon: new weapons.default(PROJECTILE_TYPE.HEAVY_PROJECTILE),
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

    //#region Animation

    const action = this.modules.animation.getAction('radar');
    if (action) {
      action.clampWhenFinished = false;
      action.setLoop(LoopRepeat, Infinity);
      action.setDuration(4);
    }

    this.modules.animation.playAction('radar');

    this.subscription.add(
      this.modules.damage.observables.destroyed$.subscribe(() => {
        this.modules.animation.stopAction('radar');
      })
    );

    //#endregion
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);
    const mesh = object;

    if (!this.preview) {
      [1].forEach(index => {
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
        // (child.material as MeshMatcapMaterial).wireframe = true;

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

  private getControls(): Partial<ControlState> {
    if (!this.modules.player) return {};

    return (
      this.modules.player?.getPlayer()?.modules.controls.getControls() ?? {}
    );
  }

  override update(_v: AnimationLoopValue): void {
    if (this.preview) return;
    super.update(_v);
    this.updateControls();
    this.updateObjects();
  }

  updateControls() {
    const controls = this.getControls();

    const velocity =
      this.state.weaponVelocity[this.modules.weapon.getSlotIndex()]!;

    const precision = controls[ControlAction.MODIFIER];

    let value = 0.005;
    if (precision) {
      value *= 1 / 5;
    }

    if (controls[ControlAction.UP]) {
      velocity.y -= value;
    }
    if (controls[ControlAction.DOWN]) {
      velocity.y += value;
    }
    if (controls[ControlAction.LEFT]) {
      velocity.x += value;
    }
    if (controls[ControlAction.RIGHT]) {
      velocity.x -= value;
    }
    if (this.modules.weapon.isAutoAimActive()) return;
    if (controls[ControlAction.FIRE_PRIMARY]) {
      this.modules.weapon.shoot();
    } else {
      this.modules.weapon.abortShoot();
    }
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

        if (velocity.length() < 0.0001) {
          velocity.set(0, 0);
        } else {
          this.modules.weapon.updateSourcePosition(i);
        }
      }
    });
  }
}
