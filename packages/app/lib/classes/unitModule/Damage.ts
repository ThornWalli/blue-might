import { ReplaySubject } from 'rxjs';

import type Projectile from '../Projectile';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';

export enum SMOKE_TYPE {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy'
}

declare module '../Unit' {
  interface ModuleStates {
    damage: Partial<DamageUnitModuleState>;
  }
  interface ModuleOptions {
    damage: Partial<DamageUnitModuleOptions>;
  }
  interface ModuleDebug {
    damage: boolean;
  }
}

interface Observables extends UnitModuleObservables {
  destroyed$: ReplaySubject<void>;
  damage$: ReplaySubject<number>;
}
export interface DamageUnitModuleOptions extends UnitModuleOptions {
  maxDamage: number;
  initialDamage: number;
  fire: boolean;
  fireTime: number;
  enabled: boolean;
}
export interface DamageUnitModuleState extends UnitModuleState {
  /**
   * Aktueller Schaden normalisiert.
   */
  damage: number;
  /**
   * Brenndauer in Sekunden
   */
  burnTimeLeft: number;
}

export enum DAMAGE_LEVEL {
  INTACT = 0,
  DAMAGED = 0.5,
  DESTROYED = 1
}

export default class DamageUnitModule extends UnitModule<
  DamageUnitModuleOptions,
  DamageUnitModuleState,
  Observables
> {
  static override TYPE = 'damage';

  constructor(
    unit: Unit,
    options: DamageUnitModuleOptions,
    state: DamageUnitModuleState,
    debug?: boolean
  ) {
    super(
      unit,
      {
        ...options,
        maxDamage: options.maxDamage ?? 1,
        initialDamage: options.initialDamage ?? 0,
        fire: options.fire ?? true,
        fireTime: options.fireTime ?? 5, // 60 Sekunden
        enabled: options.enabled ?? true // Standard: aktiviert
      },
      {
        ...state,
        damage: state.damage ?? options.initialDamage ?? 0,
        burnTimeLeft: state.burnTimeLeft ?? 0
      },
      debug
    );
    //#region observables
    this.observables.damage$ = new ReplaySubject<number>(1);
    this.observables.damage$.next(this.state.damage);
    this.observables.destroyed$ = new ReplaySubject<void>(1);
    if (this.isDestroyed()) {
      this.observables.destroyed$.next();
    }
    //#endregion
  }

  lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue): void {
    const dt = 0.016;

    if (!this.options.enabled) return; // Wenn deaktiviert, keine Updates

    const active = this.state.burnTimeLeft > 0;

    if (!active && (time - this.lastUpdateTime) / 1000 < 1 / 8) {
      return;
    }
    this.lastUpdateTime = time;

    if (this.options.fire) {
      if (this.state.burnTimeLeft > 0) {
        this.state.burnTimeLeft -= dt;
        if (
          this.getDamageLevel() >= DAMAGE_LEVEL.DESTROYED &&
          Math.random() < 0.4
        ) {
          this.spawnFire();
          this.spawnSmoke(SMOKE_TYPE.HEAVY);
        } else if (
          this.getDamageLevel() >= DAMAGE_LEVEL.DAMAGED &&
          Math.random() < 0.12
        ) {
          this.spawnSmoke(SMOKE_TYPE.MEDIUM);
        }
      } else if (this.isDestroyed()) {
        if (Math.random() < 0.05) {
          this.spawnSmoke(SMOKE_TYPE.HEAVY);
        }
      }
    }
  }

  public hit(projectile: Projectile) {
    if (!this.options.enabled || this.isDestroyed()) {
      return;
    }
    this.takeDamage(projectile.strength);
    if (this.options.fire) {
      this.spawnSmoke(SMOKE_TYPE.MEDIUM);
    }
  }

  takeDamage(amount: number) {
    if (!this.options.enabled) return;
    console.log('takeDamage', amount, this.state.damage, this.canDamage());
    this.setDamage(this.state.damage + amount);
  }

  takeMaxDamage() {
    this.setDamage(this.options.maxDamage);
  }

  setDamage(value: number, force?: boolean) {
    if (!force && !this.canDamage()) return;
    this.state.damage = Math.min(this.options.maxDamage, Math.max(0, value));
    console.log('setDamage', this.state.damage, value);
    this.observables.damage$.next(this.state.damage);
    if (this.isDestroyed()) {
      this.state.burnTimeLeft = this.options.fireTime;
      this.observables.destroyed$.next();
    }
  }

  setInitialDamage(damage: number) {
    this.state.damage = damage;
    this.setDamage(this.state.damage, true);
  }

  getDamageValue() {
    return this.state.damage / this.options.maxDamage;
  }

  getMaxDamage() {
    return this.options.maxDamage;
  }

  public getDamageLevel() {
    let value = 0;
    if (this.state.damage >= DAMAGE_LEVEL.DESTROYED) {
      value = DAMAGE_LEVEL.DESTROYED;
    } else if (this.state.damage >= DAMAGE_LEVEL.DAMAGED) {
      value = DAMAGE_LEVEL.DAMAGED;
    } else {
      value = DAMAGE_LEVEL.INTACT;
    }
    return value * this.options.maxDamage;
  }

  public canDamage() {
    console.log(this.state.damage);
    return (
      this.options.enabled && this.getDamageValue() < DAMAGE_LEVEL.DESTROYED
    );
  }

  public isDestroyed() {
    return this.getDamageValue() >= DAMAGE_LEVEL.DESTROYED;
  }

  private spawnSmoke(type: SMOKE_TYPE = SMOKE_TYPE.MEDIUM) {
    this.getUnit()
      .getMap()
      ?.modules.effect.addSmoke(this.getUnit().getPosition(), {
        type,
        life: 0.8
      });
  }

  private spawnFire() {
    this.getUnit()
      .getMap()
      ?.modules.effect.addFire(this.getUnit().getPosition(), {
        life: 0.5 + Math.random() * 0.3
      });
  }

  override getState() {
    return {
      damage: this.state.damage
    };
  }

  override getOptions() {
    return {
      ...super.getOptions(),
      initialDamage: this.options.initialDamage
    };
  }
}
