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
  Vector2,
  Vector3
} from 'three';
import HelicopterUnit, {
  type HelicopterUnitModuleList,
  type HelicopterUnitModules,
  type HelicopterUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Helicopter';
import { replaceColors } from '@blue-might/app/lib/utils/object';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import GunUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Gun';
import { weapons } from '@blue-might/weapon';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import {
  ControlAction,
  type ControlState
} from '@blue-might/app/lib/classes/playerModule/Controls';
import { lerp } from 'three/src/math/MathUtils.js';
import { playSound } from '@blue-might/weapon/utils';
import { getSfx } from '@blue-might/weapon/projectile';
import {
  createBarrelTargetShoot,
  normalizeAngle
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

  objects: {
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
    moduleList.push(AttackUnitModule, GunUnitModule);
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
          gun: {
            autoAimFn: (options: AutoAimFnOptions) => this.autoAimFn(options),
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
    this.subscription.add(
      this.modules.gun.observables.shoot$.subscribe(async ({ index }) => {
        this.objects.barrelTargetShoots[index]!.visible = true;
        playSound(
          await getSfx(this.modules.gun.getWeapon(index)!.projectile.id),
          0.3
        );
      })
    );
    this.subscription.add(
      this.modules.gun.observables.cooldown$.subscribe(({ index }) => {
        this.objects.barrelTargetShoots[index]!.visible = false;
      })
    );
    this.subscription.add(
      this.modules.gun.observables.active$.subscribe(v => {
        if (!v) {
          Object.values(this.objects.barrelTargetShoots).forEach(shoot => {
            shoot.visible = false;
          });
        }
      })
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

  autoAimFn(options: AutoAimFnOptions) {
    const { target, sourcePosition, index, weapon } = options;
    const shootModule = this.getMap()?.modules.shoot;

    if (shootModule && target && this.objects.barrels[index]) {
      const [barrelObjX, barrelObjY] = this.objects.barrels[index]!;
      const targetPosition = target.getPosition();
      const delta = targetPosition.clone().sub(sourcePosition);
      const horizontalDistance = Math.sqrt(delta.x ** 2 + delta.z ** 2);
      const verticalDistance = delta.y;

      // Gravitation und Geschwindigkeit
      const g = Math.abs(shootModule.gravity.y);
      const v = weapon.projectile.speed * (1 - shootModule.airResistance);
      const rotation = this.getRotation();

      // Prüfe, ob Schuss möglich
      const discriminant =
        v ** 4 -
        g * (g * horizontalDistance ** 2 + 2 * verticalDistance * v ** 2);
      if (discriminant < 0) {
        const targetYaw = normalizeAngle(
          Math.atan2(delta.x, delta.z) - rotation.y
        );
        const targetPitch = -Math.atan2(delta.y, horizontalDistance);
        const isYawInRange =
          targetYaw >= this.options.minWeaponAngle.x &&
          targetYaw <= this.options.maxWeaponAngle.x;
        const isPitchInRange =
          targetPitch >= this.options.minWeaponAngle.y &&
          targetPitch <= this.options.maxWeaponAngle.y;
        if (isYawInRange && isPitchInRange) {
          this.state.weaponTargetRotation.set(targetYaw, targetPitch);
          barrelObjY.rotation.y = lerp(
            barrelObjY.rotation.y,
            this.state.weaponTargetRotation.x,
            this.options.rotationSpeed
          );
          barrelObjX.rotation.x = lerp(
            barrelObjX.rotation.x,
            this.state.weaponTargetRotation.y,
            this.options.rotationSpeed
          );
          return true;
        }
        return false;
      }

      // Berechne Elevation (hoher Schuss für bessere Reichweite, wenn Ziel höher)
      const sqrtDisc = Math.sqrt(discriminant);
      let elevation = Math.atan((v ** 2 - sqrtDisc) / (g * horizontalDistance)); // - für niedrigen Schuss
      elevation = -elevation; // Minus für Helicopter-System

      // Horizontale Richtung (Yaw)
      const horizontalDirection = new Vector3(delta.x, 0, delta.z).normalize();
      const targetYaw = normalizeAngle(
        Math.atan2(horizontalDirection.x, horizontalDirection.z) - rotation.y // NEU: Normalisiere die Differenz
      );

      // Prüfe Winkel-Bereiche
      const isYawInRange =
        targetYaw >= this.options.minWeaponAngle.x &&
        targetYaw <= this.options.maxWeaponAngle.x;
      const isPitchInRange =
        elevation >= this.options.minWeaponAngle.y &&
        elevation <= this.options.maxWeaponAngle.y;

      if (isYawInRange && isPitchInRange) {
        this.state.weaponTargetRotation.set(targetYaw, elevation);

        // Interpolation zur Ziel-Rotation
        barrelObjY.rotation.y = lerp(
          barrelObjY.rotation.y,
          this.state.weaponTargetRotation.x,
          this.options.rotationSpeed
        );
        barrelObjX.rotation.x = lerp(
          barrelObjX.rotation.x,
          this.state.weaponTargetRotation.y,
          this.options.rotationSpeed
        );

        return true;
      }
    }
    return false;
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

      barrelObj.position.set(0, 0.35, -2.8);
      barrelWrapperX.position.set(0, -0.35, 2.8);
      barrelWrapperX.add(barrelObj);

      if (this.debug) {
        let axesHelper = new AxesHelper(1);
        barrelWrapperX.add(axesHelper);
        axesHelper = new AxesHelper(1);
        barrelWrapperY.add(axesHelper);
        axesHelper = new AxesHelper(1);
        parent.add(axesHelper);
      }
      barrelWrapperX.position.set(0, 0, 0);
      barrelWrapperY.position.set(0, -0.35, 2.8);

      barrelWrapperY.add(barrelWrapperX);

      parent.add(barrelWrapperY);

      // (window as any).barrelWrapper = barrelWrapper;

      this.objects = {
        barrels: [[barrelWrapperX, barrelWrapperY]],
        barrelTargets: [barrelTargetObj],
        barrelTargetShoots: [barrelTargetShoot]
      };

      this.modules.gun.registerBarrelTarget(barrelTargetObj);
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
    // if (this.modules.gun.state.autoAimActive) return;
    this.modules.gun.setActive(controls[ControlAction.FIRE_PRIMARY] ?? false);
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
        this.modules.gun.updateSourcePosition(0);
      }
    }
  }
}
