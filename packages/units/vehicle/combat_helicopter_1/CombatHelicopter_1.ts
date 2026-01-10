/* eslint-disable complexity */
import { combineLatest, filter } from 'rxjs';
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import {
  Object3D,
  Mesh,
  SkinnedMesh,
  LoopRepeat,
  LoopOnce,
  AxesHelper,
  Vector2
} from 'three';
import HelicopterUnit, {
  type HelicopterUnitModuleList,
  type HelicopterUnitModules,
  type HelicopterUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Helicopter';
import { replaceColors } from '@blue-might/app/lib/utils/material';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import WeaponUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import { weapons } from '@blue-might/weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import {
  ControlAction,
  type ControlState
} from '@blue-might/app/lib/classes/playerModule/Controls';
import { playSound } from '@blue-might/weapon/utils';
import {
  autoAimFunction,
  createBarrelTargetShoot
} from '@blue-might/app/lib/utils/turret';

import baseGlb from './assets/combat_helicopter_1.glb?url';

interface State {
  weaponActive: boolean;
  weaponVelocity: Vector2;
  weaponTargetRotation: Vector2;
}

export interface CombatHelicopterOptions extends HelicopterUnitOptions {
  minWeaponAngle: Vector2;
  maxWeaponAngle: Vector2;
  rotationSpeed: number;
}

export interface CombatHelicopterModules extends HelicopterUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
}
export type CombatHelicopterModuleList = HelicopterUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule];

export default class CombatHelicopter_1 extends HelicopterUnit<
  CombatHelicopterModules,
  CombatHelicopterModuleList,
  CombatHelicopterOptions
> {
  static override KEY = 'combat_helicopter_1';

  state: State = {
    weaponActive: false,
    weaponVelocity: new Vector2(0, 0),
    weaponTargetRotation: new Vector2(0, 0)
  };

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

  private objects: {
    barrels: [Object3D, Object3D][];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  } = {
    barrels: [],
    barrelTargets: [],
    barrelTargetShoots: []
  };

  constructor(
    options: Omit<UnitConstructorOptions<CombatHelicopterOptions>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    moduleList.push(AttackUnitModule, WeaponUnitModule);
    super(
      {
        ...options,
        name: 'Combat Helicopter 1',

        options: {
          ...options.options,
          minWeaponAngle:
            options.options?.minWeaponAngle ?? new Vector2(-Math.PI / 2, -0.15),
          maxWeaponAngle:
            options.options?.maxWeaponAngle ??
            new Vector2(Math.PI / 2, Math.PI / 2),
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },

        moduleOptions: {
          ...options.moduleOptions,
          movable: {
            ...options.moduleOptions?.movable,
            maxFuel: 100
          },
          weapon: {
            ...options.moduleOptions?.weapon,
            autoAimFn: (options: AutoAimFnOptions) =>
              autoAimFunction(
                this.getMap()!.modules.shoot,
                options,
                this.options.minWeaponAngle,
                this.options.maxWeaponAngle,
                this.options.rotationSpeed,
                {
                  barrels: this.objects.barrels as unknown as Object3D[]
                },
                this.state,
                () => this.getRotation()
              ),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                slot: 0,
                weapon: new weapons.default(),
                maxAmmunition: 100,
                ammunition: 100
              },
              {
                slot: 0,
                weapon: new weapons.air_surface_missile_1(),
                maxAmmunition: 400,
                ammunition: 400
              }
            ],
            ...options.moduleOptions?.weapon
          },
          helicopter: {
            ...options.moduleOptions?.helicopter,
            gearsHeight: 0.15,
            maxSpeed: 2
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
          ...options.moduleStates,
          movable: {
            ...options.moduleStates?.movable,
            fuel: 100
          }
        }
      },
      moduleList
    );
  }

  private barrelTargetShootTimeouts: number[] = [];
  override setup(context: SetupContext) {
    //#region barrel target shoot
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ index, shoot: { projectile, weapon } }) => {
          this.objects.barrelTargetShoots[index]!.visible = true;
          window.clearTimeout(this.barrelTargetShootTimeouts[index]);
          this.barrelTargetShootTimeouts[index] = window.setTimeout(() => {
            this.objects.barrelTargetShoots[index]!.visible = false;
          }, 1000 / weapon.perSeconds);
          playSound(await projectile.getSfx(), 0.3);
        }
      )
    );
    return super.setup(context);
  }

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

    const barrelObj = object.getObjectByName('weapon')!;
    const barrelTargetObj = object.getObjectByName('weapon_barrel_target')!;

    if (!this.preview) {
      const parent = barrelObj.parent!;
      const barrelWrapperY = new Object3D();
      const barrelWrapperX = new Object3D();

      const barrelTargetShoot = createBarrelTargetShoot();
      barrelTargetObj.add(barrelTargetShoot);

      barrelObj.position.set(0, 0.03, -0.25);
      barrelWrapperX.add(barrelObj);

      if (this.debug) {
        let axesHelper = new AxesHelper(1);
        barrelWrapperX.add(axesHelper);
        axesHelper = new AxesHelper(1);
        barrelWrapperY.add(axesHelper);
        axesHelper = new AxesHelper(1);
        parent.add(axesHelper);
      }
      barrelWrapperY.position.set(0, -0.03, 0.25);

      barrelWrapperY.add(barrelWrapperX);

      parent.add(barrelWrapperY);

      // (window as any).barrelWrapper = barrelWrapper;

      this.objects = {
        barrels: [[barrelWrapperX, barrelWrapperY]],
        barrelTargets: [barrelTargetObj],
        barrelTargetShoots: [barrelTargetShoot]
      };

      this.modules.weapon.registerBarrelTarget(barrelTargetObj);
    }

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
        // (child.material as MeshStandardMaterial).wireframe = true;

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
    if (controls[ControlAction.UP]) {
      this.state.weaponVelocity.y -= 0.005;
    }
    if (controls[ControlAction.DOWN]) {
      this.state.weaponVelocity.y += 0.005;
    }
    if (controls[ControlAction.LEFT]) {
      this.state.weaponVelocity.x += 0.005;
    }
    if (controls[ControlAction.RIGHT]) {
      this.state.weaponVelocity.x -= 0.005;
    }

    if (this.modules.weapon.isAutoAimActive()) return;
    if (controls[ControlAction.FIRE_PRIMARY]) {
      this.modules.weapon.shoot();
    } else {
      this.modules.weapon.abortShoot();
    }
  }

  private updateObjects() {
    const { barrels } = this.objects;
    const [barrelObjX, barrelObjY] = barrels[0]!;

    if (barrelObjY) {
      barrelObjX.rotation.x += this.state.weaponVelocity.y;
      barrelObjY.rotation.y += this.state.weaponVelocity.x;
      // weaponObj.rotation.y += this.state.weaponVelocity.x;
      // barrelObj.rotation.x += this.state.weaponVelocity.y;

      barrelObjX.rotation.x = Math.max(
        this.options.minWeaponAngle.y,
        Math.min(this.options.maxWeaponAngle.y, barrelObjX.rotation.x)
      );
      barrelObjY.rotation.y = Math.max(
        this.options.minWeaponAngle.x,
        Math.min(this.options.maxWeaponAngle.x, barrelObjY.rotation.y)
      );

      this.state.weaponVelocity.multiplyScalar(0.9);

      if (this.state.weaponVelocity.length() < 0.001) {
        this.state.weaponVelocity.set(0, 0);
      } else {
        this.modules.weapon.updateSourcePosition(0);
      }
    }
  }
}
