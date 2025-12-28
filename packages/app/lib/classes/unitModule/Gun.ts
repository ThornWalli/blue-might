import type { Line, Object3D } from 'three';
import { Vector2, Vector3 } from 'three';
import { ReplaySubject, Subject } from 'rxjs';

import type Unit from '../Unit';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { AnimationLoopValue } from '../Renderer';
import type Weapon from '../Weapon';
import { disposeObject3D } from '../../utils/object';

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
  autoAimActive$: ReplaySubject<boolean>;
  autoAimTarget$: ReplaySubject<Unit | null>;
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
  sourceDirections: Vector3[];
  barrelTargets: Object3D[];
  autoAimActive: boolean;
  autoAimTarget: Unit | null;
  autoAimFollowTarget: boolean;
  autoAimAutoShoot: boolean;
}

const DEFAULT_DIRECTION: [number, number, number] = [0, 0, 1];

export default class GunUnitModule<
  Options extends GunUnitModuleOptions = GunUnitModuleOptions,
  State extends GunUnitModuleState = GunUnitModuleState,
  Obervables extends GunUnitModuleObservables = GunUnitModuleObservables
> extends UnitModule<Options, State, Obervables> {
  getSourcePositions() {
    return this.state.sourcePositions;
  }
  getSourceDirections() {
    return this.state.sourceDirections;
  }
  getBarrelTargets() {
    return this.state.barrelTargets;
  }
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
        sourceDirections: state.sourceDirections ?? [],
        barrelTargets: state.barrelTargets ?? [],
        targetRotation: new Vector2(),
        autoAimActive: state.autoAimActive ?? false,
        autoAimFollowTarget: state.autoAimFollowTarget ?? false,
        autoAimAutoShoot: state.autoAimAutoShoot ?? true,
        autoAimTarget: state.autoAimTarget ?? null
      },
      debug
    );

    //#region observables
    this.observables.active$ = new Subject<boolean>();
    this.observables.active$.next(this.state.active);
    this.observables.shoot$ = new Subject<{ index: number }>();
    this.observables.cooldown$ = new Subject<{ index: number }>();
    this.observables.autoAimActive$ = new ReplaySubject<boolean>();
    this.observables.autoAimActive$.next(this.state.autoAimActive);
    this.observables.autoAimTarget$ = new ReplaySubject<Unit | null>();
    //#endregion
  }

  override async setup() {
    await super.setup();
    const attackModule = this.getUnit().getModuleByType(AttackUnitModule);
    if (attackModule) {
      this.subscription.add(
        attackModule.observables.target$.subscribe(target => {
          this.setAutoAimTarget(target ?? null);
        })
      );
    }

    this.subscription.add(
      this.getUnit().observables.rotation$.subscribe(() => {
        this.state.barrelTargets.forEach((barrel, index) => {
          this.updateSourcePosition(index);
        });
      })
    );
  }

  override destroy(): void {
    const map = this.getUnit().getMap();
    const app = map?.app;

    Object.values(this.debugWeaponLines).forEach(line => {
      if (line) {
        app?.renderer.scene.remove(line);
        disposeObject3D(line);
      }
    });
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
    if (this.debug) {
      this.updateDebug();
    }
  }

  private updateShoot({ time }: { time: number }) {
    const weapons = this.getWeapons();

    weapons.forEach((weapon, index) => {
      if (!weapon) return;

      const currentTime = time / 1000;
      const shootCooldown = 1 / weapon.perSeconds;

      if (this.state.active) {
        if (
          currentTime - (this.state.lastShootTime[index] ?? 0) >
          shootCooldown
        ) {
          this.updateSourcePosition(index);

          this.shoot(
            this.state.sourcePositions[index]!,
            this.state.sourceDirections[index]!,
            weapon
          );

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
    const sourceDirection = this.state.sourceDirections[index]!;
    const object = this.getBarrelTargetbyIndex(index);
    if (object) {
      object.getWorldPosition(sourcePosition);
      object.getWorldDirection(sourceDirection);
    } else {
      sourcePosition.set(0, 0.5, 0);
      sourceDirection.set(...DEFAULT_DIRECTION);
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
          if (this.state.autoAimAutoShoot) {
            this.setActive(shoot);
          }
        });
      } else {
        this.setActive(false);
      }
    }
  }

  registerBarrelTarget(object: Object3D) {
    this.state.barrelTargets.push(object);
    this.state.sourcePositions.push(new Vector3());
    this.state.sourceDirections.push(new Vector3(...DEFAULT_DIRECTION));
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

  setAutoAimActive(value: boolean) {
    this.state.autoAimActive = value;
    this.observables.autoAimActive$.next(value);
  }

  isAutoAimFollowTarget() {
    return this.state.autoAimFollowTarget;
  }

  isAutoAimAutoShoot() {
    return this.state.autoAimAutoShoot;
  }

  getAutoAimTarget() {
    return this.state.autoAimTarget;
  }

  setAutoAimTarget(target: Unit | null) {
    if (this.state.autoAimTarget === target) return;
    this.state.autoAimTarget = target;
    this.observables.autoAimTarget$.next(target);
  }

  //#region debug

  debugWeaponLines: Record<number, Line | null> = {};

  updateDebug() {
    const shootModule = this.getUnit().getMap()?.modules.shoot;
    this.getWeapons().forEach((weapon, index) => {
      if (this.debugWeaponLines[index]) {
        shootModule?.removeFromScene(this.debugWeaponLines[index]);
        disposeObject3D(this.debugWeaponLines[index]);
        this.debugWeaponLines[index] = null;
      }

      const line = shootModule?.createDebugVisualizePath(
        this.state.sourcePositions[index]!,
        this.state.sourceDirections[index]!,
        weapon.projectile
      );
      if (line) {
        this.debugWeaponLines[index] = line;
        shootModule?.addToScene(line);
      }
    });
  }

  //#endregion
}
