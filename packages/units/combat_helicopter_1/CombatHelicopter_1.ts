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
import { replaceColors } from '@blue-might/app/lib/utils/object';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import GunUnitModule from '@blue-might/app/lib/classes/unitModule/Gun';
import { weapons } from '@blue-might/weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';

import { createBarrelTargetShoot } from '../stationary_gun_1/utils';

import baseGlb from './assets/combat_helicopter_1.glb?url';

interface State {
  weaponActive: boolean;
  weaponVelocity: Vector2;
  weaponTargetRotation: Vector2;
}

export interface CombatHelicopterOptions extends HelicopterUnitOptions {
  minMaxBarrelAngle: [number, number];
  rotationSpeed: number;
}

export interface CombatHelicopterModules extends HelicopterUnitModules {
  attack: AttackUnitModule;
  gun: GunUnitModule;
}
export type CombatHelicopterModuleList = HelicopterUnitModuleList &
  [typeof AttackUnitModule | typeof GunUnitModule];

export default class CombatHelicopter_1 extends HelicopterUnit<
  CombatHelicopterOptions,
  CombatHelicopterModules,
  CombatHelicopterModuleList
> {
  static override KEY = 'combat_helicopter_1';

  state: State = {
    weaponActive: false,
    weaponVelocity: new Vector2(0, 0),
    weaponTargetRotation: new Vector2(0, -0.6)
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

  objects: {
    barrels: Object3D[];
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
    moduleList.push(AttackUnitModule, GunUnitModule);
    super(
      {
        ...options,
        name: 'Combat Helicopter 1',

        options: {
          ...options.options,
          minMaxBarrelAngle: options.options?.minMaxBarrelAngle ?? [-0.6, 0.2],
          rotationSpeed: options.options?.rotationSpeed ?? 0.05
        },

        moduleOptions: {
          ...options.moduleOptions,
          gun: {
            weapons: options.moduleOptions?.gun?.weapons ?? [
              new weapons.default()
            ],
            ...options.moduleOptions?.gun
          },
          helicopter: {
            ...options.moduleOptions?.helicopter,
            gearsHeight: 0.15
          },
          collision: {
            ...options.moduleOptions?.collision,
            targetName: 'base',
            targetChildIndex: 1
          }
        }
      },
      moduleList
    );
  }

  override async setup(context: SetupContext) {
    await super.setup(context);
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

    const parent = barrelObj.parent!;
    const barrelWrapper = new Object3D();

    const barrelTargetShoot = createBarrelTargetShoot();
    barrelTargetObj.add(barrelTargetShoot);

    barrelObj.position.set(0, 0.35, -2.8);
    barrelWrapper.position.set(0, -0.35, 2.8);
    barrelWrapper.add(barrelObj);

    if (this.debug) {
      const axesHelper = new AxesHelper(1);
      barrelWrapper.add(axesHelper);
    }

    parent.add(barrelWrapper);
    // (window as any).barrelWrapper = barrelWrapper;

    this.objects = {
      barrels: [barrelWrapper],
      barrelTargets: [barrelTargetObj],
      barrelTargetShoots: [barrelTargetShoot]
    };

    // this.modules.gun.registerBarrelTarget(barrelTargetObj);

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
  private getControls() {
    if (!this.modules.player) return {};

    return (
      this.modules.player?.getPlayer()?.modules.controls.getControls() ?? {}
    );
  }

  override update(_v: AnimationLoopValue): void {
    super.update(_v);
    this.updateControls();
  }

  updateControls() {
    const _controls = this.getControls();
    // if (controls.up) {
    //   this.state.velocity.y -= 0.005;
    // }
    // if (controls.down) {
    //   this.state.velocity.y += 0.005;
    // }
    // if (controls.left) {
    //   this.state.velocity.x += 0.005;
    // }
    // if (controls.right) {
    //   this.state.velocity.x -= 0.005;
    // }
    // if (this.modules.gun.state.autoAimActive) return;
    // this.modules.gun.setActive(controls.space ?? false);
  }
}
