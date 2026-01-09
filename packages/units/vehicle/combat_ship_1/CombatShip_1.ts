/* eslint-disable complexity */
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { AxesHelper, Mesh, Object3D, SkinnedMesh, Vector2 } from 'three';
import { replaceColors } from '@blue-might/app/lib/utils/object';
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

import baseGlb from './assets/combat_ship_1.glb?url';

interface State {
  weaponActive: boolean;
  weaponVelocity: Vector2;
  weaponTargetRotation: Vector2;
}

export interface CombatShipOptions extends SeaVehicleUnitOptions {
  minWeaponAngle: Vector2;
  maxWeaponAngle: Vector2;
  rotationSpeed: number;
}

export interface CombatShipModules extends SeaVehicleUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
}
export type CombatShipModuleList = SeaVehicleUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule | typeof PlayerUnitModule];

export default class CombatShip_1<
  Options extends CombatShipOptions = CombatShipOptions,
  Modules extends CombatShipModules = CombatShipModules,
  ModuleList extends CombatShipModuleList = CombatShipModuleList
> extends SeaVehicleUnit<CombatShipOptions, Modules, ModuleList> {
  static override KEY = 'boat_1';

  state: State = {
    weaponActive: false,
    weaponVelocity: new Vector2(0, 0),
    weaponTargetRotation: new Vector2(0, -0.6)
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
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    moduleList.push(AttackUnitModule, WeaponUnitModule, PlayerUnitModule);
    super(
      {
        ...options,
        name: 'Boat 1',
        options: {
          ...options.options,
          minWeaponAngle:
            options.options?.minWeaponAngle ??
            new Vector2((-Math.PI * 1) / 4, -Math.PI * (3 / 5)),
          maxWeaponAngle:
            options.options?.maxWeaponAngle ??
            new Vector2(0, Math.PI * (3 / 5)),
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },
        moduleOptions: {
          ...options.moduleOptions,
          weapon: {
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
      moduleList as ModuleList
    );
  }
  private barrelTargetShootTimeouts: number[] = [];

  override async afterSetup(context: SetupContext) {
    await super.afterSetup(context);
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

      const barrelTargetShoot = createBarrelTargetShoot({
        object: barrelTargetObj
      });
      barrelTargetObj.add(barrelTargetShoot);

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
        this.options.minWeaponAngle.x,
        Math.min(this.options.maxWeaponAngle.x, barrelObjX.rotation.x)
      );
      barrelObjY.rotation.y = Math.max(
        this.options.minWeaponAngle.y,
        Math.min(this.options.maxWeaponAngle.y, barrelObjY.rotation.y)
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
