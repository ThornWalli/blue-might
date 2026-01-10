/* eslint-disable complexity */
import {
  GROUND_ADJUSTMENT_MODE,
  type SetupContext,
  type UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Vector2, Mesh, SkinnedMesh, Object3D } from 'three';
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
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import { replaceColors } from '@blue-might/app/lib/utils/material';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import {
  ControlAction,
  type ControlState
} from '@blue-might/app/lib/classes/playerModule/Controls';
import { playSound } from '@blue-might/weapon/utils';
import {
  autoAimFunction,
  createBarrelTargetShoot
} from '@blue-might/app/lib/utils/turret';

import baseGlb from './assets/turret_1.glb?url';

interface State {
  weaponActive: boolean;
  weaponVelocity: Vector2;
  weaponTargetRotation: Vector2;
}

export interface TurretOptions extends BuildingUnitOptions {
  minAngle: Vector2;
  maxAngle: Vector2;
  rotationSpeed: number;
}

export interface TurretModules extends BuildingUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
  movable: MovableUnitModule;
}

export type TurretModuleList = BuildingUnitModuleList &
  [
    | typeof AttackUnitModule
    | typeof WeaponUnitModule
    | typeof PlayerUnitModule
    | typeof MovableUnitModule
  ];

export default class Turret_1 extends BuildingUnit<
  TurretModules,
  TurretModuleList,
  TurretOptions
> {
  static override KEY = 'turret_1';

  state: State = {
    weaponActive: false,
    weaponVelocity: new Vector2(0, 0),
    weaponTargetRotation: new Vector2(0, -0.6)
  };

  objects: {
    head?: Object3D;
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  } = {
    barrels: [],
    barrelTargets: [],
    barrelTargetShoots: []
  };

  constructor(
    options: Omit<UnitConstructorOptions<TurretOptions>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    moduleList.push(
      AttackUnitModule,
      WeaponUnitModule,
      PlayerUnitModule,
      MovableUnitModule
    );
    super(
      {
        ...options,
        name: 'Turret 1',
        options: {
          ...options.options,
          minAngle:
            options.options?.minAngle ??
            new Vector2((-Math.PI * 1) / 4, -Infinity),
          maxAngle:
            options.options?.maxAngle ??
            new Vector2((Math.PI * 1) / 15, Infinity),
          rotationSpeed: options.options?.rotationSpeed ?? 0.05
        },
        moduleOptions: {
          ...options.moduleOptions,
          weapon: {
            autoAimFn: (options: AutoAimFnOptions) =>
              autoAimFunction(
                this.getMap()!.modules.shoot,
                options,
                this.options.minAngle,
                this.options.maxAngle,
                this.options.rotationSpeed,
                {
                  head: this.objects.head,
                  barrels: this.objects.barrels as unknown as Object3D[]
                },
                this.state,
                () => this.getRotation()
              ),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                slot: 0,
                weapon: new weapons.default('light_projectile'),
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
                name: 'head',
                childIndex: 1
              }
            ]
          }
        }
      },
      moduleList
    );
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.MIN_HEIGHT);
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

    const barrelWrapper = new Object3D();

    barrelObj.position.set(0, -0.55, 0);
    barrelWrapper.position.set(0, 0.55, 0.1);
    barrelWrapper.add(barrelObj);
    headObj.add(barrelWrapper);

    const barrelTargetShoot = createBarrelTargetShoot();
    barrelTargetObj.add(barrelTargetShoot);

    this.objects = {
      head: headObj,
      barrels: [barrelWrapper],
      barrelTargets: [barrelTargetObj],
      barrelTargetShoots: [barrelTargetShoot]
    };

    this.modules.weapon.registerBarrelTarget(barrelTargetObj);

    //#endregion

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;

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

    return object;
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
    const {
      head: headObj,
      barrels: [barrelObj]
    } = this.objects;

    if (headObj && barrelObj) {
      // NEU: Manuelle Bewegung nur, wenn Auto-Aim nicht aktiv ist
      if (!this.modules.weapon.isAutoAimActive()) {
        headObj.rotation.y += this.state.weaponVelocity.x;
        barrelObj.rotation.x += this.state.weaponVelocity.y;
      }

      headObj.rotation.y = Math.max(
        this.options.minAngle.y,
        Math.min(this.options.maxAngle.y, headObj.rotation.y)
      );

      barrelObj.rotation.x = Math.max(
        this.options.minAngle.x,
        Math.min(this.options.maxAngle.x, barrelObj.rotation.x)
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
