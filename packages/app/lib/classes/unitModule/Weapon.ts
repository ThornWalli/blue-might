import type { Line, Object3D } from 'three';
import { Vector3 } from 'three';
import { EMPTY, ReplaySubject, Subject, switchMap } from 'rxjs';

import type Unit from '../Unit';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { AnimationLoopValue } from '../Renderer';
import type Weapon from '../Weapon';
import { disposeObject3D } from '../../utils/object';
import { WeaponSlot } from '../WeaponSlot';
import type { ShootDescription } from '../mapModule/Shoot';
import { ControlAction } from '../playerModule/Controls';

import AttackUnitModule from './Attack';
import PlayerUnitModule from './Player';

declare module '../Unit' {
  interface ModuleStates {
    weapon: Partial<WeaponUnitModuleState>;
  }
  interface ModuleOptions {
    weapon: Partial<WeaponUnitModuleOptions>;
  }
  interface ModuleDebug {
    weapon: boolean;
  }
}

export interface WeaponUnitModuleObservables extends UnitModuleObservables {
  active$: Subject<boolean>;
  shoot$: Subject<{
    index: number;
    slot: WeaponSlot;
    shoot: ShootDescription;
  }>;
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

export interface WeaponUnitModuleOptions extends UnitModuleOptions {
  autoAimFn: AutoAimFn;
  slots: WeaponSlot[];
}
export interface WeaponUnitModuleState extends UnitModuleState {
  active: boolean;
  lastShootTime: number[];
  sourcePositions: Vector3[];
  sourceDirections: Vector3[];
  barrelTargets: Object3D[];
  autoAimActive: boolean;
  autoAimTarget: Unit | null;
  autoAimFollowTarget: boolean;
  autoAimAutoShoot: boolean;
  currentSlot: number;
}

const DEFAULT_DIRECTION: [number, number, number] = [0, 0, 1];

export default class WeaponUnitModule<
  Options extends WeaponUnitModuleOptions = WeaponUnitModuleOptions,
  State extends WeaponUnitModuleState = WeaponUnitModuleState,
  Obervables extends WeaponUnitModuleObservables = WeaponUnitModuleObservables
> extends UnitModule<Options, State, Obervables> {
  static override TYPE = 'weapon';
  constructor(unit: Unit, options: Options, state: State, debug?: boolean) {
    super(
      unit,
      {
        ...options,
        slots: (options.slots ?? []).map(slot => new WeaponSlot(slot))
      },
      {
        ...state,
        active: state.active ?? false,
        lastShootTime: state.lastShootTime ?? [],
        sourcePositions: state.sourcePositions ?? [],
        sourceDirections: state.sourceDirections ?? [],
        barrelTargets: state.barrelTargets ?? [],
        autoAimActive: state.autoAimActive ?? false,
        autoAimFollowTarget: state.autoAimFollowTarget ?? false,
        autoAimAutoShoot: state.autoAimAutoShoot ?? true,
        autoAimTarget: state.autoAimTarget ?? null,
        currentSlot: state.currentSlot ?? 0
      },
      debug
    );

    // deaktivere alle slots die schon verwendet werden
    this.getSlots().reduce<{ [key: number]: boolean }>((result, slot) => {
      if (result[slot.slot]) {
        slot.active = false;
      } else {
        result[slot.slot] = true;
      }
      return result;
    }, {});

    //#region observables
    this.observables.active$ = new Subject<boolean>();
    this.observables.active$.next(this.state.active);
    this.observables.shoot$ = new Subject<{
      index: number;
      slot: WeaponSlot;
      shoot: ShootDescription;
    }>();
    this.observables.cooldown$ = new Subject<{ index: number }>();
    this.observables.autoAimActive$ = new ReplaySubject<boolean>();
    this.observables.autoAimActive$.next(this.state.autoAimActive);
    this.observables.autoAimTarget$ = new ReplaySubject<Unit | null>();
    //#endregion
  }

  override async setup() {
    await super.setup();

    const unit = this.getUnit();

    const attackModule = unit.getModuleByType(AttackUnitModule);
    if (attackModule) {
      this.subscription.add(
        attackModule.observables.target$.subscribe(target => {
          this.setAutoAimTarget(target ?? null);
        })
      );
    }

    this.subscription.add(
      unit.observables.rotation$.subscribe(() => {
        this.state.barrelTargets.forEach((barrel, index) => {
          this.updateSourcePosition(index);
        });
      })
    );

    const playerUnitModule = unit.getModuleByType(PlayerUnitModule);
    if (playerUnitModule) {
      this.subscription.add(
        playerUnitModule.observables.player$
          .pipe(
            switchMap(
              player => player?.modules.controls.observables.controls$ ?? EMPTY
            )
          )
          .subscribe(controls => {
            if (controls[ControlAction.SWITCH_WEAPON]) {
              this.switchSlot();
            }
          })
      );
    }
  }

  switchSlot() {
    const currentSlot = this.state.currentSlot;
    const slots = this.getSlots();

    // Deactivate the current slot
    if (slots[currentSlot]) {
      slots[currentSlot].active = false;
    }

    // Move to the next slot
    this.state.currentSlot = (currentSlot + 1) % slots.length;

    // Activate the new current slot
    if (slots[this.state.currentSlot]) {
      slots[this.state.currentSlot]!.active = true;
    }
  }

  override async addToScene() {
    this.state.barrelTargets.forEach((barrel, index) => {
      this.updateSourcePosition(index);
    });
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

    return shootModule.createShoot(position, direction, weapon, {
      enableSpread: weapon.spreadAmount > 0,
      spreadAmount: weapon.spreadAmount,
      ignoredObjects: [this.getUnit().getRoot()]
    });
  }

  override async update(_v: AnimationLoopValue) {
    this.updateShoot(_v);
    this.updateAutoAIM();
    if (this.debug) {
      this.updateDebug();
    }
  }

  private updateShoot({ time }: { time: number }) {
    const weapons = this.getSlots();

    weapons
      .filter(slot => slot.active)
      .forEach((weaponSlot, index) => {
        index = weaponSlot.slot ?? index;

        if (!weaponSlot) return;

        const weapon = weaponSlot.weapon;

        const currentTime = time / 1000;
        const shootCooldown = 1 / weapon.perSeconds;

        if (this.state.active) {
          if (weaponSlot.ammunition <= 0) {
            return;
          }

          if (
            currentTime - (this.state.lastShootTime[index] ?? 0) >
            shootCooldown
          ) {
            this.updateSourcePosition(index);

            this.shoot(
              this.state.sourcePositions[index]!,
              this.state.sourceDirections[index]!,
              weapon
            )?.then(shoot => {
              weaponSlot.ammunition--;
              if (shoot) {
                this.observables.shoot$.next({
                  index,
                  slot: weaponSlot,
                  shoot
                });
              }
            });

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
        this.getSlots()
          .filter(({ active }) => active)
          .forEach((weaponSlot, index) => {
            index = weaponSlot.slot;
            this.updateSourcePosition(index);
            const sourcePosition = this.state.sourcePositions[index]!;
            const shoot = this.options.autoAimFn({
              target,
              sourcePosition,
              weapon: weaponSlot.weapon,
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
  public getSlot(index: number) {
    return this.options.slots.at(index) ?? null;
  }
  public getSlots() {
    return Object.values(this.options.slots);
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

  getSourcePositions() {
    return this.state.sourcePositions;
  }
  getSourceDirections() {
    return this.state.sourceDirections;
  }
  getBarrelTargets() {
    return this.state.barrelTargets;
  }

  //#region debug

  debugWeaponLines: Record<number, Line | null> = {};

  updateDebug() {
    const shootModule = this.getUnit().getMap()?.modules.shoot;
    this.getSlots().forEach((weaponSlot, index) => {
      if (this.debugWeaponLines[index]) {
        shootModule?.removeFromScene(this.debugWeaponLines[index]);
        disposeObject3D(this.debugWeaponLines[index]);
        this.debugWeaponLines[index] = null;
      }

      const line = shootModule?.createDebugVisualizePath(
        this.state.sourcePositions[index]!,
        this.state.sourceDirections[index]!,
        weaponSlot.weapon.projectile
      );
      if (line) {
        this.debugWeaponLines[index] = line;
        shootModule?.addToScene(line);
      }
    });
  }

  //#endregion
}
