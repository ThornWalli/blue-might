import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';

import type { MeshStandardMaterial } from 'three';
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

interface State {
  active: boolean;
  velocity: Vector2;
  maxBarrelAngleX: number;
  minBarrelAngleX: number;
  targetRotationY: number;
  targetRotationX: number;
  rotationSpeed: number;
  sourcePositions: [Vector3];
}

export type Options = BuildingUnitOptions;

export interface Modules extends BuildingUnitModules {
  movable: MovableUnitModule;
  gun: GunUnitModule;
  player: PlayerUnitModule;
}

export type ModuleList = BuildingUnitModuleList &
  [typeof MovableUnitModule | typeof GunUnitModule | typeof PlayerUnitModule];

export default class StationaryGun_1 extends BuildingUnit<
  BuildingUnitOptions,
  Modules,
  ModuleList
> {
  static override KEY = 'stationary_gun_1';

  state: State = {
    active: false,
    velocity: new Vector2(0, 0),
    maxBarrelAngleX: 0.2,
    minBarrelAngleX: -0.6,
    targetRotationY: -0.6,
    targetRotationX: 0,
    rotationSpeed: 0.05,
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
    moduleList.push(MovableUnitModule, GunUnitModule, PlayerUnitModule);
    super(
      {
        ...options,
        name: 'StationaryGun 1',
        moduleOptions: {
          ...options.moduleOptions,
          gun: {
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

        if ((child.material as MeshStandardMaterial).name === 'primary') {
          child.material.color.set(
            this.modules.faction.getFaction()?.colors[0] ?? 0xf2f2f2
          );
          child.material.needsUpdate = true;
        }
        if ((child.material as MeshStandardMaterial).name === 'secondary') {
          child.material.color.set(
            this.modules.faction.getFaction()?.colors[1] ?? 0xf2f2f2
          );
          child.material.needsUpdate = true;
        }
        // (child.material as MeshLambertMaterial).wireframe = true;
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
    if (!this.hasModuleType(PlayerUnitModule)) return {};

    return (
      this.getModuleByType(PlayerUnitModule)
        ?.getPlayer()
        ?.modules.controls.getControls() ?? {}
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
        this.state.minBarrelAngleX,
        Math.min(this.state.maxBarrelAngleX, barrelObj.rotation.x)
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
