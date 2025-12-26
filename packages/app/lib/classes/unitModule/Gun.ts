import type { Object3D } from 'three';
import { Vector2, Vector3 } from 'three';
import { Subject } from 'rxjs';

import type Unit from '../Unit';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { AnimationLoopValue } from '../Renderer';
import type Weapon from '../Weapon';

import AttackUnitModule from './Attack';

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

export type AutoAimFnOptions = {
  target: Unit;
  sourcePosition: Vector3;
  weapon: Weapon;
  index: number;
};
export type AutoAimFn = (options: AutoAimFnOptions) => boolean;

export interface GunUnitModuleOptions extends UnitModuleOptions {
  autoAimFn: AutoAimFn;
  weapons: Weapon[];
}
export interface GunUnitModuleState extends UnitModuleState {
  active: boolean;
  lastShootTime: number[];
  sourcePositions: Vector3[];
  barrelTargets: Object3D[];
  autoAimActive: boolean;
  autoAimTarget?: Unit;
  autoAimAutoShoot: boolean;
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
        weapons: options.weapons ?? {}
      },
      {
        ...state,
        active: state.active ?? false,
        lastShootTime: state.lastShootTime ?? [],
        sourcePositions: state.sourcePositions ?? [],
        barrelTargets: state.barrelTargets ?? [],
        targetRotation: new Vector2(),
        autoAimActive: state.autoAimActive ?? false,
        autoAimAutoShoot: state.autoAimAutoShoot ?? true,
        autoAimTarget: state.autoAimTarget ?? null
      },
      debug
    );

    //#region observables
    this.observables.active$ = new Subject<boolean>();
    this.observables.shoot$ = new Subject<{ index: number }>();
    this.observables.cooldown$ = new Subject<{ index: number }>();
    //#endregion
  }
  override async setup() {
    await super.setup();
    const attackModule = this.getUnit().getModuleByType(AttackUnitModule);
    if (attackModule) {
      this.subscription.add(
        attackModule.observables.target$.subscribe(target => {
          this.state.autoAimTarget = target;
        })
      );
    }
  }

  public shoot(position: Vector3, direction: Vector3, weapon: Weapon) {
    const shootModule = this.getUnit().getMap()?.modules.shoot;
    if (!shootModule) return;

    shootModule.createShoot(position, direction, weapon.projectile, {
      enableSpread: weapon.spreadAmount > 0,
      spreadAmount: weapon.spreadAmount,
      ignoredObjects: [this.getUnit().getRoot()]
    });
  }

  override update(_v: AnimationLoopValue) {
    this.updateShoot(_v);
    this.updateAutoAIM();
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

  private updateAutoAIM() {
    if (this.state.autoAimActive) {
      const target = this.state.autoAimTarget;
      if (target) {
        this.getWeapons().forEach((weapon, index) => {
          this.updateSourcePosition(index);
          const sourcePosition = this.state.sourcePositions[index]!;
          const shoot = this.options.autoAimFn({
            target,
            sourcePosition,
            weapon,
            index
          });
          this.setActive(this.state.autoAimAutoShoot && shoot);
        });
      } else {
        this.setActive(false);
      }
    }
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

  isAutoAimActive() {
    return this.state.autoAimActive;
  }
}
