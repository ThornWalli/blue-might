import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';

import { Vector2, Vector3, Mesh, SkinnedMesh, Object3D } from 'three';
import baseGlb from './assets/stationary_gun_1.glb?url';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';

import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';

import type { AnimationLoopValue } from '@blue-might/app/lib/classes/Renderer';
import { weapons } from '@blue-might/weapon';
import GunUnitModule, {
  type GunUnitModuleOptions
} from '@blue-might/app/lib/classes/unitModule/Gun';
import { playSound } from '@blue-might/debug/utils';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import { createBarrelTargetShoot } from './utils';
import { getSfx } from '@blue-might/weapon/projectile';
import { replaceColors } from '@blue-might/app/lib/utils/object';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import { lerp } from 'three/src/math/MathUtils.js';

interface State {
  active: boolean;
  velocity: Vector2;
  minMaxBarrelAngle: [number, number];
  // maxBarrelAngleX: number;
  // minBarrelAngleX: number;
  targetRotation: Vector2;
  // targetRotationY: number;
  // targetRotationX: number;
  rotationSpeed: number;
  sourcePositions: [Vector3];
}

export type Options = BuildingUnitOptions;

export interface Modules extends BuildingUnitModules {
  attack: AttackUnitModule;
  gun: GunUnitModule;
  player: PlayerUnitModule;
  movable: MovableUnitModule;
}

export type ModuleList = BuildingUnitModuleList &
  [
    | typeof AttackUnitModule
    | typeof GunUnitModule
    | typeof PlayerUnitModule
    | typeof MovableUnitModule
  ];

export default class StationaryGun_1 extends BuildingUnit<
  BuildingUnitOptions,
  Modules,
  ModuleList
> {
  static override KEY = 'stationary_gun_1';

  state: State = {
    active: false,
    velocity: new Vector2(0, 0),
    minMaxBarrelAngle: [-0.6, 0.2],
    targetRotation: new Vector2(0, -0.6),
    rotationSpeed: 0.05, //0.05,
    sourcePositions: [new Vector3()]
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
    moduleList.push(
      AttackUnitModule,
      GunUnitModule,
      PlayerUnitModule,
      MovableUnitModule
    );
    super(
      {
        ...options,
        name: 'Stationary Gun 1',
        moduleOptions: {
          ...options.moduleOptions,
          gun: {
            autoAimFn: ({ target, sourcePosition, index }) => {
              if (target && this.objects.head && this.objects.barrels[index]) {
                // Richtung von sourcePosition zum Target berechnen
                const direction = new Vector3();
                direction
                  .subVectors(target.getPosition(), sourcePosition)
                  .normalize();
                // Ziel-Rotation berechnen
                const horizontalDirection = new Vector3(
                  direction.x,
                  0,
                  direction.z
                ).normalize();
                this.state.targetRotation.setY(
                  Math.atan2(horizontalDirection.x, horizontalDirection.z)
                );
                const distanceXZ = Math.sqrt(
                  direction.x ** 2 + direction.z ** 2
                );
                this.state.targetRotation.setX(
                  Math.max(
                    this.state.minMaxBarrelAngle[0],
                    Math.min(
                      this.state.minMaxBarrelAngle[1],
                      -Math.atan2(direction.y, distanceXZ)
                    )
                  )
                );
                // Interpolation zur Ziel-Rotation
                this.objects.head.rotation.y = lerp(
                  this.objects.head.rotation.y,
                  this.state.targetRotation.y,
                  this.state.rotationSpeed
                );
                this.objects.barrels[index].rotation.x = lerp(
                  this.objects.barrels[index].rotation.x,
                  this.state.targetRotation.x,
                  this.state.rotationSpeed
                );

                return distanceXZ >= 0.96;
              }
              return false;
            },
            weapons: (options.moduleOptions?.gun as GunUnitModuleOptions)
              ?.weapons ?? [new weapons.default()],
            ...options.moduleOptions?.gun
          },
          collision: {
            ...options.moduleOptions?.collision,
            targetName: 'head',
            targetChildIndex: 1
          }
        }
      },
      moduleList as ModuleList
    );
  }

  override setup(context: SetupContext): Promise<void> {
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

  private getControls() {
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
    if (controls.up) {
      this.state.velocity.y -= 0.005;
    }
    if (controls.down) {
      this.state.velocity.y += 0.005;
    }
    if (controls.left) {
      this.state.velocity.x += 0.005;
    }
    if (controls.right) {
      this.state.velocity.x -= 0.005;
    }
    if (this.modules.gun.state.autoAimActive) return;
    this.modules.gun.setActive(controls.space ?? false);
  }

  private updateObjects() {
    const {
      head: headObj,
      barrels: [barrelObj]
    } = this.objects;

    if (headObj && barrelObj) {
      headObj.rotation.y += this.state.velocity.x;
      barrelObj.rotation.x += this.state.velocity.y;

      barrelObj.rotation.x = Math.max(
        this.state.minMaxBarrelAngle[0],
        Math.min(this.state.minMaxBarrelAngle[1], barrelObj.rotation.x)
      );

      this.state.velocity.multiplyScalar(0.9);

      if (this.state.velocity.length() < 0.001) {
        this.state.velocity.set(0, 0);
      } else {
        this.modules.gun.updateSourcePosition(0);
      }
    }
  }
}
