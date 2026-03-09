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
import { isUnitDestroyed } from '../../utils/unit';

import type { UnitModules } from './../Unit';
import type AttackUnitModule from './Attack';
import type PlayerUnitModule from './Player';

export interface WeaponAutopilotOptions {
  aim: boolean;
  shoot: boolean;
}
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
  slots$: ReplaySubject<WeaponSlot[]>;
  shoot$: Subject<{
    index: number;
    slot: WeaponSlot;
    shoot: ShootDescription;
  }>;
  cooldown$: Subject<{ index: number }>;
  autopilot$: ReplaySubject<WeaponAutopilotOptions>;
  autopilotActive$: ReplaySubject<boolean>;
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
  autopilot: WeaponAutopilotOptions;
  slots: Exclude<WeaponSlotDescription, 'index'>[];
}

export interface WeaponUnitModuleState extends UnitModuleState {
  active: boolean;
  lastShootTime: number[];
  sourcePositions: Vector3[];
  sourceDirections: Vector3[];
  barrelTargets: Object3D[];
  autopilotActive: boolean;
  autoAimTarget: Unit | null;
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
  hasAutopilotShoot() {
    return this.options.autopilot.shoot;
  }
  static override TYPE = 'weapon';

  slots: WeaponSlot[];
  constructor(unit: U, options: Options, state: State, debug?: boolean) {
    super(
      unit,
      {
        ...options,
        slots: options.slots ?? [],
        autopilot: options.autopilot ?? {
          aim: false,
          shoot: false
        }
      },
      {
        ...state,
        active: false,
        lastShootTime: state.lastShootTime ?? [],
        sourcePositions: state.sourcePositions ?? [],
        sourceDirections: state.sourceDirections ?? [],
        barrelTargets: state.barrelTargets ?? [],
        autopilotActive: options.autopilot?.aim || options.autopilot?.shoot,
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

    this.observables.slots$ = new ReplaySubject<WeaponSlot[]>(1);
    this.observables.slots$.next(this.getSlots());

    this.observables.shoot$ = new Subject<{
      index: number;
      slot: WeaponSlot;
      shoot: ShootDescription;
    }>();
    this.observables.cooldown$ = new Subject<{ index: number }>();
    this.observables.autopilot$ = new ReplaySubject<WeaponAutopilotOptions>();
    this.observables.autopilot$.next(this.options.autopilot);
    this.observables.autopilotActive$ = new ReplaySubject<boolean>();
    this.observables.autopilotActive$.next(this.state.autopilotActive);
    this.observables.autoAimTarget$ = new ReplaySubject<Unit | null>();
    //#endregion
  }

  override async setup() {
    await super.setup();

    const unit = this.getUnit();

    const attackModule = unit.modules.attack;

    if (attackModule) {
      this.subscription.add(
        attackModule.observables.targetUnit$.subscribe(target => {
          this.setAutoAimTarget(target ?? null);
        })
      );
    }

    this.subscription.add(
      unit.modules.damage.observables.destroyed$.subscribe(() => {
        this.abortShoot();
        this.subscription.unsubscribe();
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
          this.getUnit().modules.weapon.setAutopilot({
            aim: true,
            shoot: !player
          });
        })
      );
    }
  }

  setSlotByIndex(index: number) {
    const slot = this.getSlot(index);
    if (slot) {
      this.setSlot(slot);
    }
  }

  switchSlot() {
    this.setSlotByIndex((this.state.currentSlot + 1) % this.getSlots().length);
  }

  setSlot(slot: WeaponSlot) {
    const lastSlot = this.state.currentSlot;
    const slots = this.getSlots();
    if (slots[lastSlot]) {
      slots[lastSlot].active = false;
    }

    // Move to the next slot
    this.state.currentSlot = slot.index;

    // Activate the new current slot
    if (slots[this.state.currentSlot]) {
      slots[this.state.currentSlot]!.active = true;
    }

    this.observables.slots$.next(slots);
  }

  override destroy() {
    const map = this.getUnit().getMap();
    const app = map?.app;

    Object.values(this.debugWeaponLines).forEach(line => {
      if (line) {
        app?.renderer.scene.remove(line);
        disposeObject3D(line);
      }
    });

    super.destroy();
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
    if (
      this.getUnit().preview ||
      this.destroyed ||
      isUnitDestroyed(this.getUnit())
    )
      return;

    this.state.barrelTargets.forEach((_, index) => {
      this.updateSourcePosition(index);
    });

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

    const target = this.getUnit().modules.attack.getTarget()!;

    const slots = this.getSlots()
      .filter(
        slot =>
          slot &&
          slot.active &&
          !this.ignoredSlots.has(slot) &&
          slot.ammunition > 0
      )
      .filter(({ parallel }, index) => index === 0 || parallel);

    slots.forEach(weaponSlot => {
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
        currentTime - (this.state.lastShootTime[index] ?? 0) >
        shootCooldown
      ) {
        this.state.lastShootTime[index] = currentTime;
        shootModule
          .createShoot(
            this.state.sourcePositions[index]!,
            this.state.sourceDirections[index]!,
            target,
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

        if (
          !this.state.autopilotActive &&
          weaponSlot.weapon.shootType === WEAPON_SHOOT_TYPE.SINGLE
        ) {
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
    if (this.state.autopilotActive) {
      const target = this.state.autoAimTarget;
      if (target) {
        this.getSlots().forEach(weaponSlot => {
          const index = weaponSlot.index;

          const sourcePosition = this.state.sourcePositions[index]!;

          const shoot = this.options.autopilot?.aim
            ? this.options.autoAimFn({
                target,
                sourcePosition,
                weapon: weaponSlot.weapon,
                index
              })
            : true;

          if (this.options.autopilot?.shoot) {
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

  public hasSlots() {
    return this.slots.length > 0;
  }

  isAutoAimActive() {
    return this.state.autopilotActive;
  }

  setAutopilot(value: Partial<WeaponAutopilotOptions>) {
    this.options.autopilot = {
      aim: value.aim ?? false,
      shoot: value.shoot ?? false
    };
    this.observables.autopilot$.next(this.options.autopilot);
    this.setAutopilotActive(
      this.options.autopilot.aim || this.options.autopilot.shoot
    );
  }

  private setAutopilotActive(value: boolean) {
    if (this.state.autopilotActive === value) return;
    this.state.autopilotActive = value;
    this.observables.autopilotActive$.next(value);
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
