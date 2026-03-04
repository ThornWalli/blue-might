import { combineLatest, filter } from 'rxjs';
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
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import WeaponUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import { weapons } from '@blue-might/weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { playSound } from '@blue-might/weapon/utils';
import {
  autoAimFunction,
  updateControls
} from '@blue-might/app/lib/utils/unit/weapon';
import type { AnimationSetting } from '@blue-might/app/lib/classes/unitModule/Animation';
import type { WeaponUnitInterface } from '@blue-might/app/lib/utils/unit/weapon';
import { addModules } from '@blue-might/app/lib/classes/Module';
import TransportUnitModule from '@blue-might/app/lib/classes/unitModule/Transport';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

import baseGlb from './assets/combat_helicopter_1.glb?url';

function getVectors() {
  const vector = new Vector2(0, 0);
  return [vector, vector] as Vector2[];
}

interface CombatHelicopterState extends UnitState, WeaponSupportState {}

export interface CombatHelicopterOptions
  extends HelicopterUnitOptions, WeaponSupportOptions {
  rotationSpeed: number;
}

export interface CombatHelicopterModules extends HelicopterUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  transport: TransportUnitModule;
}
export type CombatHelicopterModuleList = HelicopterUnitModuleList &
  [
    | typeof AttackUnitModule
    | typeof WeaponUnitModule
    | typeof TransportUnitModule
  ];

export interface RawUnitDescription_CombatHelicopter_1<
  O extends UnitOptions = CombatHelicopterOptions
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'combat_helicopter_1';
}

export default class CombatHelicopter_1
  extends HelicopterUnit<
    CombatHelicopterModules,
    CombatHelicopterModuleList,
    CombatHelicopterOptions,
    UnitObservables,
    CombatHelicopterState
  >
  implements WeaponUnitInterface<CombatHelicopterState>
{
  static override KEY = 'combat_helicopter_1';

  animationSettings: Record<string, AnimationSetting> = {
    land_gears: { clampWhenFinished: true, loop: LoopOnce, duration: 2 },
    rotor_idle: { clampWhenFinished: false, loop: LoopRepeat, duration: 8 },
    rotor_run: { clampWhenFinished: false, loop: LoopRepeat, duration: 0.25 },
    rotor_off: { clampWhenFinished: false, loop: LoopRepeat, duration: 0 }
  };

  private objects: {
    barrels: Object3D[];
    barrelTargets: Object3D[];
    barrelTargetShoots: Object3D[];
  }[] = [];

  constructor(
    options: Omit<
      UnitConstructorOptions<CombatHelicopterState, CombatHelicopterOptions>,
      'name'
    > = {},
    moduleList?: CombatHelicopterModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      TransportUnitModule
    ]);
    super(
      {
        ...options,
        name: 'Combat Helicopter',
        state: {
          weaponActive: false,
          weaponVelocity: getVectors(),
          weaponTargetRotation: getVectors()
        },
        options: {
          ...options.options,
          weaponAngles: options.options?.weaponAngles ?? [
            {
              min: new Vector2(-Math.PI / 2, -0.15),
              max: new Vector2(Math.PI / 2, Math.PI / 2)
            },
            {
              min: new Vector2(-Math.PI / 2, -0.15),
              max: new Vector2(Math.PI / 2, Math.PI / 2)
            }
          ],
          rotationSpeed: options.options?.rotationSpeed ?? 0.25
        },

        moduleOptions: {
          ...options.moduleOptions,
          movable: {
            ...options.moduleOptions?.movable,
            maxFuel: 200
          },
          transport: {
            entryPosition: new Vector2(0.25, 0.25)
          },
          weapon: {
            ...options.moduleOptions?.weapon,
            autoAimFn: (options: AutoAimFnOptions) =>
              autoAimFunction(
                this.getMap()!.modules.shoot,
                options,
                this.options.weaponAngles,
                this.options.rotationSpeed,
                this.objects.map(obj => ({
                  barrels: obj.barrels
                })),
                this.state,
                () => this.getRotation()
              ),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                weapon: new weapons.default(PROJECTILE_TYPE.MEDIUM_PROJECTILE),
                maxAmmunition: 100,
                ammunition: 100
              },
              {
                weapon: new weapons.air_surface_missile_1({
                  perSeconds: 1
                }),
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
          ...options.moduleStates
        }
      },
      moduleList
    );
  }

  override setup(context: SetupContext) {
    //#region barrel target shoot
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ shoot: { projectile } }) => {
          playSound(await projectile.getSfx(), 0.3);
        }
      )
    );
    return super.setup(context);
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);

    this.modules.animation.applySettings(this.animationSettings);

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

    if (!this.preview) {
      const barrelObj = object.getObjectByName(`weapon`)!;
      const barrelTargetObj = object.getObjectByName(`weapon_barrel_target`)!;

      const parent = barrelObj.parent!;
      const barrelWrapperY = new Object3D();
      const barrelWrapperX = new Object3D();

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

      this.objects.push(
        {
          barrels: [barrelWrapperX, barrelWrapperY],
          barrelTargets: [barrelTargetObj],
          barrelTargetShoots: [barrelTargetObj]
        },
        {
          barrels: [barrelWrapperX, barrelWrapperY],
          barrelTargets: [barrelTargetObj],
          barrelTargetShoots: [barrelTargetObj]
        }
      );

      this.modules.weapon.registerBarrelTarget(barrelTargetObj);
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

        barrelObjX.rotation.x = Math.max(
          this.options.weaponAngles[index]!.min.y,
          Math.min(
            this.options.weaponAngles[index]!.max.y,
            barrelObjX.rotation.x
          )
        );
        barrelObjY.rotation.y = Math.max(
          this.options.weaponAngles[index]!.min.x,
          Math.min(
            this.options.weaponAngles[index]!.max.x,
            barrelObjY.rotation.y
          )
        );

        velocity.multiplyScalar(0.9);
      }
    });
  }
}
