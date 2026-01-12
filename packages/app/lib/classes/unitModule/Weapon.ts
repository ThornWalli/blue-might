import type { Line, Object3D } from 'three';
import { Vector3 } from 'three';
import { EMPTY, ReplaySubject, Subject, switchMap } from 'rxjs';
import { WEAPON_SHOOT_TYPE } from '@blue-might/app/lib/types/weapon';

import type Unit from '../Unit';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { AnimationLoopValue } from '../Renderer';
import type Weapon from '../Weapon';
import { disposeObject3D } from '../../utils/object';
import { WeaponSlot, type WeaponSlotDescription } from '../WeaponSlot';
import type { ShootDescription } from '../mapModule/Shoot';
import { ControlAction } from '../playerModule/Controls';

import type { UnitModules } from './../Unit';
import type AttackUnitModule from './Attack';
import type PlayerUnitModule from './Player';

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
  slots: Exclude<WeaponSlotDescription, 'index'>[];
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

const DEFAULT_DIRECTION: [number, number, number] = [0, 0, -1];

export default class WeaponUnitModule<
  Options extends WeaponUnitModuleOptions = WeaponUnitModuleOptions,
  State extends WeaponUnitModuleState = WeaponUnitModuleState,
  Obervables extends WeaponUnitModuleObservables = WeaponUnitModuleObservables,
  U extends Unit<
    {
      weapon: WeaponUnitModule;
      player: PlayerUnitModule;
      attack: AttackUnitModule;
    } & UnitModules
  > = Unit<
    {
      weapon: WeaponUnitModule;
      player: PlayerUnitModule;
      attack: AttackUnitModule;
    } & UnitModules
  >
> extends UnitModule<Options, State, Obervables, U> {
  static override TYPE = 'weapon';

  slots: WeaponSlot[];
  constructor(unit: U, options: Options, state: State, debug?: boolean) {
    super(
      unit,
      {
        ...options,
        slots: options.slots ?? []
      },
      {
        ...state,
        active: false,
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

    this.slots = this.options.slots.map(
      (slot, index) => new WeaponSlot({ ...slot, index })
    );

    // deaktivere alle slots die schon verwendet werden
    this.getSlots().forEach((slot, index) => {
      slot.active = index === 0;
    });

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

    const attackModule = unit.modules.attack;
    if (attackModule) {
      this.subscription.add(
        attackModule.observables.target$.subscribe(target => {
          this.setAutoAimTarget(target ?? null);
        })
      );
    }

    this.subscription.add(
      unit.modules.damage.observables.destroyed$.subscribe(() => {
        this.abortShoot();
        this.destroy();
      })
    );

    this.subscription.add(
      unit.observables.rotation$.subscribe(() => {
        this.state.barrelTargets.forEach((barrel, index) => {
          this.updateSourcePosition(index);
        });
      })
    );

    const playerUnitModule = unit.modules.player;
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

      this.subscription.add(
        playerUnitModule.observables.player$.subscribe(player => {
          this.getUnit().modules.weapon.setAutoAimActive(!player);
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

  public shoot() {
    this.setActive(true);
  }
  public abortShoot() {
    this.setActive(false);
  }

  private setActive(active: boolean) {
    if (active === this.state.active) return;
    if (active) {
      this.ignoredSlots.clear();
    }
    this.state.active = active;
    this.observables.active$.next(active);
  }

  override async update(_v: AnimationLoopValue) {
    if (this.getUnit().preview) return;
    this.updateShoot(_v);
    this.updateAutoAIM();
    if (this.debug) {
      this.updateDebug();
    }
  }

  /**
   * Gibt zurück, ob es einen verbraucht gibt.
   * Beispiel: Im Autopilot gibt es kein Verbrauch.
   */
  hasConsumption() {
    return !!this.getUnit().modules.player.getPlayer();
  }

  ignoredSlots = new Set<WeaponSlot>();
  private updateShoot({ time }: { time: number }) {
    if (!this.state.active) {
      return;
    }
    const slots = this.getSlots();
    slots
      .filter(
        slot =>
          slot &&
          (this.state.autoAimActive || slot.active) &&
          !this.ignoredSlots.has(slot)
      )
      .forEach(weaponSlot => {
        const index = weaponSlot.index;
        const weapon = weaponSlot.weapon;

        const currentTime = time / 1000;
        const shootCooldown = 1 / weapon.perSeconds;

        if (weaponSlot.ammunition <= 0) {
          return;
        }

        const shootModule = this.getUnit().getMap()?.modules.shoot;
        if (!shootModule) return;

        if (
          weaponSlot.weapon.shootType === WEAPON_SHOOT_TYPE.SINGLE ||
          currentTime - (this.state.lastShootTime[index] ?? 0) > shootCooldown
        ) {
          this.updateSourcePosition(index);
          // debugger;
          shootModule
            .createShoot(
              this.state.sourcePositions[index]!,
              this.state.sourceDirections[index]!,
              weaponSlot,
              {
                enableSpread: weapon.spreadAmount > 0,
                spreadAmount: weapon.spreadAmount,
                ignoredObjects: [this.getUnit().getRoot()]
              }
            )
            .then(shoot => {
              if (this.hasConsumption()) {
                weaponSlot.ammunition--;
              }
              if (shoot) {
                this.observables.shoot$.next({
                  index,
                  slot: weaponSlot,
                  shoot
                });
              }
            });

          this.state.lastShootTime[index] = currentTime;

          if (weaponSlot.weapon.shootType === WEAPON_SHOOT_TYPE.SINGLE) {
            this.ignoredSlots.add(weaponSlot);
          }
        } else {
          this.observables.cooldown$.next({ index });
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
    if (this.state.active && this.state.autoAimActive) {
      const target = this.state.autoAimTarget;
      if (target) {
        this.getSlots().forEach(weaponSlot => {
          const index = weaponSlot.index;
          this.updateSourcePosition(index);
          const sourcePosition = this.state.sourcePositions[index]!;
          const shoot = this.options.autoAimFn({
            target,
            sourcePosition,
            weapon: weaponSlot.weapon,
            index
          });
          if (this.state.autoAimAutoShoot) {
            if (shoot) {
              this.shoot();
            } else {
              this.abortShoot();
            }
          }
        });
      } else {
        this.abortShoot();
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

  public getSlotIndex() {
    return this.state.currentSlot;
  }

  public getSlot(index: number) {
    return this.slots.at(index) ?? null;
  }
  public getSlots() {
    return this.slots;
  }

  isAutoAimActive() {
    return this.state.autoAimActive;
  }

  setAutoAimActive(value: boolean) {
    if (this.state.autoAimActive === value) return;
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
