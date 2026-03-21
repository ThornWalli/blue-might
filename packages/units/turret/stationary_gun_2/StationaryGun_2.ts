import type {
  UnitConstructorOptions,
  UnitObservables,
  UnitState
} from '@blue-might/app/lib/classes/Unit';
import type { SetupContext } from '@blue-might/app/lib/types/unit';
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
import WeaponUnitModule, {
  type WeaponUnitModuleOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import AttackUnitModule from '@blue-might/app/lib/classes/unitModule/Attack';
import type { ControlState } from '@blue-might/app/lib/classes/playerModule/Controls';
import { playSound } from '@blue-might/weapon/utils';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/stationary_gun_2.glb?url';

interface State extends UnitState {
  active: boolean;
  velocity: Vector2;
  maxBarrelAngleX: number;
  minBarrelAngleX: number;
  targetRotationY: number;
  targetRotationX: number;
  rotationSpeed: number;
  sourcePositions: [Vector3];
  lastShootTime: number;
}

export type Options = BuildingUnitOptions;

export interface Modules extends BuildingUnitModules {
  attack: AttackUnitModule;
  weapon: WeaponUnitModule;
  player: PlayerUnitModule;
  movable: MovableUnitModule;
}

export type ModuleList = BuildingUnitModuleList &
  [
    | typeof AttackUnitModule
    | typeof WeaponUnitModule
    | typeof PlayerUnitModule
    | typeof MovableUnitModule
  ];

export default class StationaryGun_2 extends BuildingUnit<
  Modules,
  ModuleList,
  Options,
  UnitObservables,
  State
> {
  static override KEY = 'stationary_gun_2';

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
    options: Omit<UnitConstructorOptions<Options, State>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    moduleList = addModules(moduleList, [
      AttackUnitModule,
      WeaponUnitModule,
      PlayerUnitModule,
      MovableUnitModule
    ]);
    super(
      {
        ...options,
        name: 'StationaryGun 1',
        state: {
          active: false,
          velocity: new Vector2(0, 0),
          maxBarrelAngleX: 0.2,
          minBarrelAngleX: -0.6,
          targetRotationY: -0.6,
          targetRotationX: 0,
          rotationSpeed: 0.05,
          sourcePositions: [new Vector3()],
          lastShootTime: 0
        },
        moduleOptions: {
          ...options.moduleOptions,
          weapon: {
            slots: (options.moduleOptions?.weapon as WeaponUnitModuleOptions)
              ?.slots ?? [new weapons.default(), new weapons.default()],
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
  }

  override setup(context: SetupContext): Promise<void> {
    this.subscription.add(
      this.modules.weapon.observables.shoot$.subscribe(
        async ({ index, shoot }) => {
          this.objects.barrelTargetShoots[index]!.visible = true;
          playSound(await shoot.projectileInstance.projectile.getSfx(), 0.3);
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
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    const headObj = object.getObjectByName('head')!;
    const barrelPrimaryObj = object.getObjectByName('barrel_primary')!;
    const barrelSecondaryObj = object.getObjectByName('barrel_secondary')!;
    const barrelPrimaryTargetObj = object.getObjectByName(
      'barrel_primary_target'
    )!;
    const barrelSecondaryTargetObj = object.getObjectByName(
      'barrel_secondary_target'
    )!;

    const barrelWrapperPrimary = new Object3D();
    barrelPrimaryObj.position.set(
      barrelPrimaryObj.position.x,
      -0.55,
      barrelPrimaryObj.position.z
    );
    barrelWrapperPrimary.add(barrelPrimaryObj);
    barrelWrapperPrimary.position.set(0, 0.55, 0.1);
    headObj.add(barrelWrapperPrimary);

    const barrelWrapperSecondary = new Object3D();
    barrelSecondaryObj.position.set(
      barrelSecondaryObj.position.x,
      -0.55,
      barrelSecondaryObj.position.z
    );
    barrelWrapperSecondary.add(barrelSecondaryObj);
    barrelWrapperSecondary.position.set(0, 0.55, 0.1);
    headObj.add(barrelWrapperSecondary);

    this.objects = {
      head: headObj,
      barrels: [barrelWrapperPrimary, barrelWrapperSecondary],
      barrelTargets: [barrelPrimaryTargetObj, barrelSecondaryTargetObj],
      barrelTargetShoots: [barrelPrimaryTargetObj, barrelSecondaryTargetObj]
    };

    this.modules.weapon.registerBarrelTarget(barrelPrimaryTargetObj);
    this.modules.weapon.registerBarrelTarget(barrelSecondaryTargetObj);

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    // const box = new Mesh(
    //   new BoxGeometry(0.1, 0.1, 0.1),
    //   new MeshLambertMaterial({ color: 0xff0000 })
    // );
    // barrelWrapperPrimary.add(box);

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
    if (controls.moveForward) {
      this.state.velocity.y -= 0.005;
    }
    if (controls.moveBackward) {
      this.state.velocity.y += 0.005;
    }
    if (controls.moveLeft) {
      this.state.velocity.x += 0.005;
    }
    if (controls.moveRight) {
      this.state.velocity.x -= 0.005;
    }
    if (controls.space) {
      this.modules.weapon.shoot();
    } else {
      this.modules.weapon.abortShoot();
    }
  }

  private updateObjects() {
    const {
      head: headObj,
      barrels: [barrelPrimary, barrelSecondary]
    } = this.objects;

    if (headObj && barrelPrimary && barrelSecondary) {
      headObj.rotation.y += this.state.velocity.x;
      barrelPrimary.rotation.x += this.state.velocity.y;
      barrelSecondary.rotation.x += this.state.velocity.y;

      barrelPrimary.rotation.x = Math.max(
        this.state.minBarrelAngleX,
        Math.min(this.state.maxBarrelAngleX, barrelPrimary.rotation.x)
      );
      barrelSecondary.rotation.x = Math.max(
        this.state.minBarrelAngleX,
        Math.min(this.state.maxBarrelAngleX, barrelSecondary.rotation.x)
      );

      this.state.velocity.multiplyScalar(0.9);

      if (this.state.velocity.length() < 0.001) {
        this.state.velocity.set(0, 0);
      } else {
        this.modules.weapon.updateSourcePosition(0);
        this.modules.weapon.updateSourcePosition(1);
      }
    }
  }
}
