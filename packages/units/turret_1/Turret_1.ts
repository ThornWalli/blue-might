/* eslint-disable complexity */
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Vector2, Vector3, Mesh, SkinnedMesh, Object3D } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { weapons } from '@blue-might/weapon';
import GunUnitModule, {
  type AutoAimFnOptions
} from '@blue-might/app/lib/classes/unitModule/Gun';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import { replaceColors } from '@blue-might/app/lib/utils/object';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import { lerp } from 'three/src/math/MathUtils.js';
import {
  ControlAction,
  type ControlState
} from '@blue-might/app/lib/classes/playerModule/Controls';
import { playSound } from '@blue-might/weapon/utils';
import { getSfx } from '@blue-might/weapon/projectile';

import { createBarrelTargetShoot } from './utils';
import baseGlb from './assets/turret_1.glb?url';

interface State {
  weaponActive: boolean;
  weaponVelocity: Vector2;
  weaponTargetRotation: Vector2;
}

export interface TurretOptions extends BuildingUnitOptions {
  minMaxBarrelAngle: [number, number];
  minMaxHeadAngle?: [number, number];

  rotationSpeed: number;
}

export interface TurretModules extends BuildingUnitModules {
  attack: AttackUnitModule;
  gun: GunUnitModule;
  player: PlayerUnitModule;
  movable: MovableUnitModule;
}

export type TurretModuleList = BuildingUnitModuleList &
  [
    | typeof AttackUnitModule
    | typeof GunUnitModule
    | typeof PlayerUnitModule
    | typeof MovableUnitModule
  ];

export default class Turret_1 extends BuildingUnit<
  TurretOptions,
  TurretModules,
  TurretModuleList
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
      GunUnitModule,
      PlayerUnitModule,
      MovableUnitModule
    );
    super(
      {
        ...options,
        name: 'Turret 1',
        options: {
          ...options.options,
          minMaxBarrelAngle: options.options?.minMaxBarrelAngle ?? [-0.6, 0.2],
          minMaxHeadAngle: options.options?.minMaxHeadAngle ?? [
            -Math.PI,
            Math.PI
          ],
          rotationSpeed: options.options?.rotationSpeed ?? 0.05
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
          collision: {
            ...options.moduleOptions?.collision,
            targetName: 'head',
            targetChildIndex: 1
          }
        }
      },
      moduleList
    );
  }

  autoAimFn(options: AutoAimFnOptions) {
    const { target, sourcePosition, index } = options;
    if (target && this.objects.head && this.objects.barrels[index]) {
      // Richtung von sourcePosition zum Target berechnen
      const direction = new Vector3();
      direction.subVectors(target.getPosition(), sourcePosition).normalize();

      // Horizontale Richtung (für Y-Rotation)
      const horizontalDirection = new Vector3(
        direction.x,
        0,
        direction.z
      ).normalize();
      const targetYaw = Math.atan2(
        horizontalDirection.x,
        horizontalDirection.z
      );

      // Vertikale Richtung (für X-Rotation)
      const distanceXZ = Math.sqrt(direction.x ** 2 + direction.z ** 2);
      const targetPitch = -Math.atan2(direction.y, distanceXZ);

      // NEU: Prüfe, ob das Ziel innerhalb der erlaubten Winkel liegt
      const isYawInRange =
        targetYaw >= this.options.minMaxHeadAngle![0] &&
        targetYaw <= this.options.minMaxHeadAngle![1];
      const isPitchInRange =
        targetPitch >= this.options.minMaxBarrelAngle[0] &&
        targetPitch <= this.options.minMaxBarrelAngle[1];

      if (isYawInRange && isPitchInRange && distanceXZ >= 0.96) {
        // Setze Ziel-Rotation nur, wenn das Ziel erreichbar ist
        this.state.weaponTargetRotation.set(targetYaw, targetPitch);

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

        return true; // Ziel ist zielbar
      } else {
        // Ziel ist außerhalb des Bereichs – Auto-Aim deaktivieren
        return false;
      }
    }
    return false;
  }

  // autoAimFn(options: AutoAimFnOptions) {
  //   const { target, sourcePosition, index } = options;
  //   if (target && this.objects.head && this.objects.barrels[index]) {
  //     // Richtung von sourcePosition zum Target berechnen
  //     const direction = new Vector3();
  //     direction.subVectors(target.getPosition(), sourcePosition).normalize();
  //     // Ziel-Rotation berechnen
  //     const horizontalDirection = new Vector3(
  //       direction.x,
  //       0,
  //       direction.z
  //     ).normalize();
  //     this.state.weaponTargetRotation.setY(
  //       Math.atan2(horizontalDirection.x, horizontalDirection.z)
  //     );
  //     const distanceXZ = Math.sqrt(direction.x ** 2 + direction.z ** 2);
  //     this.state.weaponTargetRotation.setX(
  //       Math.max(
  //         this.options.minMaxBarrelAngle[0],
  //         Math.min(
  //           this.options.minMaxBarrelAngle[1],
  //           -Math.atan2(direction.y, distanceXZ)
  //         )
  //       )
  //     );
  //     // Interpolation zur Ziel-Rotation
  //     this.objects.head.rotation.y = lerp(
  //       this.objects.head.rotation.y,
  //       this.state.weaponTargetRotation.y,
  //       this.options.rotationSpeed
  //     );
  //     this.objects.barrels[index].rotation.x = lerp(
  //       this.objects.barrels[index].rotation.x,
  //       this.state.weaponTargetRotation.x,
  //       this.options.rotationSpeed
  //     );

  //     return distanceXZ >= 0.96;
  //   }
  //   return false;
  // }

  override setup(context: SetupContext) {
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
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

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

    this.modules.gun.registerBarrelTarget(barrelTargetObj);

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

    // const box = new Mesh(
    //   new BoxGeometry(0.1, 0.1, 0.1),
    //   new MeshLambertMaterial({ color: 0xff0000 })
    // );
    // barrelWrapper.add(box);

    return object;
  }

  private getControls(): Partial<ControlState> {
    if (!this.modules.player) return {};

    return (
      this.modules.player?.getPlayer()?.modules.controls.getControls() ?? {}
    );
  }

  override update(_v: AnimationLoopValue): void {
    super.update(_v);
    this.updateControls();
    this.updateObjects();
  }

  updateControls() {
    const controls = this.getControls();
    if (controls[ControlAction.MOVE_FORWARD]) {
      this.state.weaponVelocity.y -= 0.005;
    }
    if (controls[ControlAction.MOVE_BACKWARD]) {
      this.state.weaponVelocity.y += 0.005;
    }
    if (controls[ControlAction.MOVE_LEFT]) {
      this.state.weaponVelocity.x += 0.005;
    }
    if (controls[ControlAction.MOVE_RIGHT]) {
      this.state.weaponVelocity.x -= 0.005;
    }
    if (this.modules.gun.isAutoAimActive()) return;
    this.modules.gun.setActive(controls[ControlAction.FIRE_PRIMARY] ?? false);
  }

  private updateObjects() {
    const {
      head: headObj,
      barrels: [barrelObj]
    } = this.objects;

    if (headObj && barrelObj) {
      // NEU: Manuelle Bewegung nur, wenn Auto-Aim nicht aktiv ist
      if (!this.modules.gun.isAutoAimActive()) {
        headObj.rotation.y += this.state.weaponVelocity.x;
        barrelObj.rotation.x += this.state.weaponVelocity.y;
      }

      barrelObj.rotation.x = Math.max(
        this.options.minMaxBarrelAngle[0],
        Math.min(this.options.minMaxBarrelAngle[1], barrelObj.rotation.x)
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
