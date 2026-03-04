import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitObservables,
  UnitOptions,
  UnitState
} from '@blue-might/app/lib/classes/Unit';
import {
  type SetupContext,
  GROUND_ADJUSTMENT_MODE,
  type WeaponSupportOptions,
  type WeaponSupportState
} from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import type { Object3D } from 'three';
import { Vector2, Mesh, SkinnedMesh, LoopOnce } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { weapons } from '@blue-might/weapon';
import WeaponUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import AttackUnitModule, {
  ATTACK_TYPE
} from '@blue-might/app/lib/classes/unitModule/Attack';
import {
  autoAimFunction,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import { ReplaySubject, Subject } from 'rxjs';
import { playSound } from '@blue-might/weapon/utils';
import { lerp } from 'three/src/math/MathUtils.js';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';
import type { WeaponUnitInterface } from '@blue-might/app/lib/utils/unit/weapon';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/missile_launcher_1.glb?url';

interface State extends UnitState, WeaponSupportState {
  opened: boolean;
  opening: boolean;
}

interface MissileLauncherObservables extends UnitObservables {
  opened$: ReplaySubject<boolean>;
  opening$: Subject<boolean>;
}

export interface MissileLauncherOptions
  extends BuildingUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}

export interface MissileLauncherModules extends BuildingUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
}

export type MissileLauncherModuleList = BuildingUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule | typeof PlayerUnitModule];

export interface RawUnitDescription_MissileLauncher_1<
  O extends UnitOptions = MissileLauncherOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'missile_launcher_1';
}

const CLOSE_DELAY = 1000;

export default class MissileLauncher_1
  extends BuildingUnit<
    MissileLauncherModules,
    MissileLauncherModuleList,
    MissileLauncherOptions,
    MissileLauncherObservables,
    State
  >
  implements WeaponUnitInterface<State>
{
  static override KEY = 'missile_launcher_1';
  closeTimeout: number = 0;
  reopen = false;

  objects: {
    head?: Object3D;
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: Omit<
      UnitConstructorOptions<MissileLauncherOptions, State>,
      'name'
    > = {},
    moduleList?: MissileLauncherModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      PlayerUnitModule
    ]);
    super(
      {
        ...options,
        name: 'MissileLauncher',
        state: {
          opened: false,
          opening: false,
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
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },
        moduleOptions: {
          ...options.moduleOptions,
          attack: {
            ...options.moduleOptions?.attack,
            radius: options.moduleOptions?.attack?.radius ?? 15,
            attackTypes: [ATTACK_TYPE.AIR]
          },
          weapon: {
            autoAimFn: (options: AutoAimFnOptions) =>
              this.state.opened &&
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
                weapon: new weapons.air_surface_missile_1({
                  perSeconds: 0.5,
                  projectile: PROJECTILE_TYPE.AIR_HOMING_MISSILE_1
                })
              }
            ],
            ...options.moduleOptions?.weapon
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [
              {
                name: 'base',
                childIndex: 1
              }
            ]
          }
        }
      },
      moduleList
    );

    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.MIN_HEIGHT);

    //#region observables
    this.observables.opened$ = new ReplaySubject<boolean>(1);
    this.observables.opened$.next(false);
    this.observables.opening$ = new Subject<boolean>();
    //#endregion
  }

  override setup(context: SetupContext) {
    // //#region barrel target shoot
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ shoot: { projectile } }) => {
          playSound(await projectile.getSfx(), 0.3);
        }
      )
    );
    // //#endregion
    return super.setup(context);
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);

    this.setMaterialReady();

    if (this.preview) return;

    this.modules.animation.applySettings({
      open: {
        clampWhenFinished: true,
        loop: LoopOnce,
        duration: 2
      }
    });

    this.subscription.add(
      this.modules.player.observables.player$.subscribe(player => {
        if (player && !this.state.opened) {
          this.openWeapon();
        } else if (
          this.state.opened &&
          !player &&
          !this.modules.attack.hasTarget()
        ) {
          this.closeTimeout = window.setTimeout(() => {
            this.closeWeapon();
          }, CLOSE_DELAY);
        }
      })
    );

    this.subscription.add(
      this.modules.attack.observables.targetUnit$.subscribe(target => {
        if (target) {
          this.openWeapon(true);
        } else {
          this.resetPosition = true;
        }
      })
    );
    this.subscription.add(
      this.observables.opening$.subscribe(opening => {
        this.root.getObjectByName('weapon')!.visible =
          this.root.getObjectByName('weapon')!.visible || opening;
      })
    );

    this.subscription.add(
      this.observables.opened$.subscribe(opened => {
        this.root.getObjectByName('weapon')!.visible = opened;
      })
    );
  }

  private async openWeapon(force = false) {
    window.clearTimeout(this.closeTimeout);
    if (this.state.opening || this.state.opened) {
      if (this.state.opening && force) {
        this.reopen = true;
      }
      return;
    }
    this.setOpening(true);

    await this.modules.animation.playAction('open', {
      reverse: false
    });

    this.setOpening(false);
    this.setOpened(true);
  }

  async closeWeapon() {
    window.clearTimeout(this.closeTimeout);
    if (this.state.opening || !this.state.opened) return;
    this.setOpening(true);

    await this.modules.animation.playAction('open', {
      reverse: true
    });

    this.setOpening(false);
    this.setOpened(false);
    if (this.reopen) {
      this.reopen = false;
      this.openWeapon();
    }
  }

  private setOpened(opened: boolean) {
    if (this.state.opened === opened) return;
    this.state.opened = opened;
    this.observables.opened$.next(opened);
  }

  private setOpening(opening: boolean) {
    if (this.state.opening === opening) return;
    this.state.opening = opening;
    this.observables.opening$.next(opening);
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    if (this.preview) {
      object.getObjectByName('weapon')?.removeFromParent();
    } else {
      //#region barrel

      const headObj = object.getObjectByName('head_wrapper')!;
      const barrelObj = object.getObjectByName('head')!;
      const barrelTargetObj = object.getObjectByName('target')!;

      this.objects.push({
        head: headObj,
        barrels: [barrelObj],
        barrelTargets: [barrelTargetObj],
        barrelTargetShoots: [barrelTargetObj]
      });

      this.modules.weapon.registerBarrelTarget(barrelTargetObj);

      //#endregion
    }

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return object;
  }

  isReadyToClose = false;

  override update(_v: AnimationLoopValue): void {
    if (this.preview) return;

    super.update(_v);

    if (this.modules.damage.isDestroyed()) return;

    if (this.state.opened) {
      updateControls(this);
    }
    this.updateObjects();
  }

  resetPosition = false;
  private updateObjects() {
    this.objects.forEach(({ head: headObj, barrels: [barrelObj] }, index) => {
      const weaponVelocity = this.state.weaponVelocity[index]!;
      if (headObj && barrelObj) {
        // NEU: Manuelle Bewegung nur, wenn Auto-Aim nicht aktiv ist
        if (!this.modules.weapon.isAutoAimActive()) {
          headObj.rotation.y += weaponVelocity.x;
          barrelObj.rotation.x += weaponVelocity.y;
        }

        if (this.resetPosition) {
          // Berechne die Annäherung
          headObj.rotation.x = lerp(
            headObj.rotation.x,
            0,
            this.options.rotationSpeed
          );
          headObj.rotation.y = lerp(
            headObj.rotation.y,
            0,
            this.options.rotationSpeed
          );

          const epsilon = 0.001;

          if (
            Math.abs(headObj.rotation.x) < epsilon &&
            Math.abs(headObj.rotation.y) < epsilon
          ) {
            headObj.rotation.x = 0;
            headObj.rotation.y = 0;
            this.resetPosition = false;
            this.closeWeapon();
          }
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
