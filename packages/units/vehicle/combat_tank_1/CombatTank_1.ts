/* eslint-disable complexity */
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import TankUnit, {
  type TankUnitModuleList,
  type TankUnitModules,
  type TankUnitOptions
} from '@blue-might/app/lib/classes/unit/vehicle/Tank';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Object3D, Vector2, Mesh, SkinnedMesh, Vector3 } from 'three';
import { replaceColors } from '@blue-might/app/lib/utils/object';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import type { AutoAimFnOptions } from '@blue-might/app/lib/classes/unitModule/Weapon';
import { weapons } from '@blue-might/weapon';
import { lerp } from 'three/src/math/MathUtils.js';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import {
  ControlAction,
  type ControlState
} from '@blue-might/app/lib/classes/playerModule/Controls';
import { playSound } from '@blue-might/weapon/utils';

import {
  createBarrelTargetShoot,
  normalizeAngle
} from '../../../app/lib/utils/turret';

import baseGlb from './assets/combat_tank_1.glb?url';

interface State {
  weaponActive: boolean;
  weaponVelocity: Vector2;
  weaponTargetRotation: Vector2;
}

export interface CombatTankOptions extends TankUnitOptions {
  minAngle: Vector2;
  maxAngle: Vector2;
  rotationSpeed: number;
}
export interface CombatTankModules extends TankUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
}
export type CombatTankModuleList = TankUnitModuleList &
  [typeof AttackUnitModule | typeof WeaponUnitModule | typeof PlayerUnitModule];

export default class CombatTank_1<
  Options extends CombatTankOptions = CombatTankOptions,
  Modules extends CombatTankModules = CombatTankModules,
  ModuleList extends CombatTankModuleList = CombatTankModuleList
> extends TankUnit<CombatTankOptions, Modules, ModuleList> {
  static override KEY = 'combat_tank_1';

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
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    moduleList.push(AttackUnitModule, WeaponUnitModule, PlayerUnitModule);
    super(
      {
        ...options,
        name: 'Combat Tank 1',
        options: {
          ...options.options,
          minAngle: options.options?.minAngle ?? new Vector2(-0.6, -Math.PI),
          maxAngle: options.options?.maxAngle ?? new Vector2(0.2, Math.PI),
          rotationSpeed: options.options?.rotationSpeed ?? 0.05
        },
        moduleOptions: {
          ...options.moduleOptions,
          weapon: {
            autoAimFn: (options: AutoAimFnOptions) => this.autoAimFn(options),
            slots: options.moduleOptions?.weapon?.slots ?? [
              {
                slot: 0,
                weapon: new weapons.default('heavy_projectile'),
                maxAmmunition: 100,
                ammunition: 100
              }
            ],
            ...options.moduleOptions?.weapon
          },
          collision: {
            ...options.moduleOptions?.collision,
            targetName: 'base'
          }
        }
      },
      moduleList as ModuleList
    );
  }

  override setup(context: SetupContext) {
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ index, shoot }) => {
          this.objects.barrelTargetShoots[index]!.visible = true;
          playSound(await shoot.projectile.getSfx(), 0.3);
        }
      )
    );
    this.subscription.add(
      this.modules.weapon.observables.cooldown$.subscribe(({ index }) => {
        this.objects.barrelTargetShoots[index]!.visible = false;
      })
    );
    this.subscription.add(
      this.modules.weapon.observables.active$.subscribe(v => {
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
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object } = await loadGltf(baseGlb);

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
    this.modules.weapon.setActive(
      controls[ControlAction.FIRE_PRIMARY] ?? false
    );
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

  autoAimFn(options: AutoAimFnOptions) {
    const { target, sourcePosition, index, weapon } = options;
    const shootModule = this.getMap()?.modules.shoot;

    if (
      shootModule &&
      target &&
      this.objects.head &&
      this.objects.barrels[index]
    ) {
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
          !this.options.minAngle ||
          (targetYaw >= this.options.minAngle.y &&
            targetYaw <= this.options.maxAngle.y);
        const isPitchInRange =
          targetPitch >= this.options.minAngle.x &&
          targetPitch <= this.options.maxAngle.x;

        if (isYawInRange && isPitchInRange && horizontalDistance >= 0.96) {
          this.state.weaponTargetRotation.set(targetYaw, targetPitch);
          this.objects.head.rotation.y = lerp(
            this.objects.head.rotation.y,
            this.state.weaponTargetRotation.x,
            this.options.rotationSpeed
          );
          this.objects.barrels[index].rotation.x = lerp(
            this.objects.barrels[index].rotation.x,
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
      elevation = -elevation; // Minus für Turret-System

      // Horizontale Richtung (Yaw)
      const horizontalDirection = new Vector3(delta.x, 0, delta.z).normalize();
      const targetYaw = normalizeAngle(
        Math.atan2(horizontalDirection.x, horizontalDirection.z) - rotation.y // NEU: Normalisiere die Differenz
      );
      // Prüfe Winkel-Bereiche
      const isYawInRange =
        !this.options.minAngle ||
        (targetYaw >= this.options.minAngle.y &&
          targetYaw <= this.options.maxAngle.y);
      const isPitchInRange =
        elevation >= this.options.minAngle.x &&
        elevation <= this.options.maxAngle.x;

      if (isYawInRange && isPitchInRange && horizontalDistance >= 0.96) {
        this.state.weaponTargetRotation.set(targetYaw, elevation);

        // Interpolation zur Ziel-Rotation
        this.objects.head.rotation.y = lerp(
          this.objects.head.rotation.y,
          this.state.weaponTargetRotation.x,
          this.options.rotationSpeed
        );
        this.objects.barrels[index].rotation.x = lerp(
          this.objects.barrels[index].rotation.x,
          this.state.weaponTargetRotation.y,
          this.options.rotationSpeed
        );

        return true;
      }
    }
    return false;
  }
}
