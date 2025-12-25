import type Unit from '../Unit';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import { Vector3 } from 'three';
import type { AnimationLoopValue } from '../Renderer';
import type { Object3D } from 'three';
import { Subject } from 'rxjs';
import type Weapon from '../Weapon';

declare module '../Unit' {
  interface ModuleStates {
    gun: Partial<GunUnitModuleState>;
  }
  interface ModuleOptions {
    gun: Partial<GunUnitModuleOptions>;
  }
  interface ModuleDebug {
    gun: boolean;
  }
}

export interface GunUnitModuleObservables extends UnitModuleObservables {
  active$: Subject<boolean>;
  shoot$: Subject<{ index: number }>;
  cooldown$: Subject<{ index: number }>;
}
export interface GunUnitModuleOptions extends UnitModuleOptions {
  enableAutoAim: boolean;
  enableShootInterval: boolean;
  shootInterval: number;
  weapons: Weapon[];
}
export interface GunUnitModuleState extends UnitModuleState {
  active: boolean;
  lastShootTime: number[];
  sourcePositions: Vector3[];
  barrelTargets: Object3D[];
}

export default class GunUnitModule<
  Options extends GunUnitModuleOptions = GunUnitModuleOptions,
  State extends GunUnitModuleState = GunUnitModuleState,
  Obervables extends GunUnitModuleObservables = GunUnitModuleObservables
> extends UnitModule<Options, State, Obervables> {
  static override TYPE = 'gun';
  constructor(unit: Unit, options: Options, state: State, debug?: boolean) {
    super(
      unit,
      {
        ...options,
        weapons: options.weapons ?? {},
        enableAutoAim: options.enableAutoAim ?? true,
        enableShootInterval: options.enableShootInterval ?? false,
        shootInterval: options.shootInterval ?? 200
      },
      {
        ...state,
        active: state.active ?? false,
        lastShootTime: state.lastShootTime ?? [],
        sourcePositions: state.sourcePositions ?? [],
        barrelTargets: state.barrelTargets ?? []
      },
      debug
    );

    //#region observables
    this.observables.active$ = new Subject<boolean>();
    this.observables.shoot$ = new Subject<{ index: number }>();
    this.observables.cooldown$ = new Subject<{ index: number }>();
    //#endregion
  }

  public shoot(position: Vector3, direction: Vector3, weapon: Weapon) {
    const shootModule = this.getShootModule();
    if (!shootModule) return;

    shootModule.createShoot(position, direction, weapon.projectile, {
      enableSpread: weapon.spreadAmount > 0,
      spreadAmount: weapon.spreadAmount,
      ignoredObjects: [this.getUnit().getRoot()]
    });
  }

  override update(_v: AnimationLoopValue) {
    this.updateShoot(_v);
  }

  registerBarrelTarget(object: Object3D) {
    this.state.barrelTargets.push(object);
    this.state.sourcePositions.push(new Vector3());
  }
  private getBarrelTargetbyIndex(index: number) {
    return this.state.barrelTargets.at(index) ?? null;
  }
  public getWeapon(index: number) {
    return this.options.weapons.at(index) ?? null;
  }
  public getWeapons() {
    return Object.values(this.options.weapons);
  }

  public setActive(active: boolean) {
    if (this.state.active === active) return;
    this.state.active = active;
    this.observables.active$.next(active);
  }

  private updateShoot({ time }: { time: number }) {
    const weapons = this.getWeapons();

    weapons.forEach((weapon, index) => {
      const barrelTarget = this.getBarrelTargetbyIndex(index);
      if (!weapon) return;

      const currentTime = time / 1000;
      const shootCooldown = 1 / weapon.perSeconds;

      if (this.state.active) {
        if (
          currentTime - (this.state.lastShootTime[index] ?? 0) >
          shootCooldown
        ) {
          this.updateSourcePosition(index);

          const direction = new Vector3(0, 0, 1);
          if (barrelTarget) {
            barrelTarget.getWorldDirection(direction);
          }

          this.shoot(this.state.sourcePositions[index]!, direction, weapon);

          this.observables.shoot$.next({ index });
          this.state.lastShootTime[index] = currentTime;
        } else {
          this.observables.cooldown$.next({ index });
        }
      }
    });
  }

  public updateSourcePosition(index: number) {
    const sourcePosition = this.state.sourcePositions[index]!;
    const object = this.getBarrelTargetbyIndex(index);
    if (object) {
      object.getWorldPosition(sourcePosition);
    } else {
      sourcePosition.set(0, 0.5, 0);
    }
  }

  private autoAIM() {
    // if (this.options.enableAutoAim) {
    //   const currentTarget = targetObjs[currentTargetIndex];
    //   if (currentTarget && gunState.headObj && gunState.barrelObj) {
    //     // Richtung von sourcePosition zum Target berechnen
    //     const direction = new Vector3();
    //     direction
    //       .subVectors(currentTarget.position, sourcePosition)
    //       .normalize();
    //     // Ziel-Rotation berechnen
    //     const horizontalDirection = new Vector3(
    //       direction.x,
    //       0,
    //       direction.z
    //     ).normalize();
    //     gunState.targetRotationY = Math.atan2(
    //       horizontalDirection.x,
    //       horizontalDirection.z
    //     );
    //     const distanceXZ = Math.sqrt(direction.x ** 2 + direction.z ** 2);
    //     gunState.targetRotationX = Math.max(
    //       gunState.minBarrelAngleX,
    //       Math.min(
    //         gunState.maxBarrelAngleX,
    //         -Math.atan2(direction.y, distanceXZ)
    //       )
    //     );
    //     // Interpolation zur Ziel-Rotation
    //     gunState.headObj.rotation.y = lerp(
    //       gunState.headObj.rotation.y,
    //       gunState.targetRotationY,
    //       gunState.rotationSpeed
    //     );
    //     gunState.barrelObj.rotation.x = lerp(
    //       gunState.barrelObj.rotation.x,
    //       gunState.targetRotationX,
    //       gunState.rotationSpeed
    //     );
    //   }
    //   updateSourcePosition();
    // }
  }

  private getShootModule() {
    const map = this.getUnit().getMap();
    if (!map) return null;
    return map.modules.shoot;
  }
}
