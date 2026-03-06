import { Subject, EMPTY, filter, switchMap } from 'rxjs';
import AirHomingMissile_1 from '@blue-might/weapon/projectile/air_homing_missile_1/AirHomingMissile_1';
import { BaseMissileLauncher } from '@blue-might/weapon/weapon';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { ShootDescription } from '../mapModule/Shoot';

declare module '../Unit' {
  interface ModuleStates {
    building: Partial<RadarUnitModuleState>;
  }
  interface ModuleOptions {
    building: Partial<RadarUnitModuleOptions>;
  }
  interface ModuleDebug {
    building: boolean;
  }
}

export interface RadarUnitObservables extends UnitModuleObservables {
  warning$: Subject<WARNING_TYPE[]>;
}

export interface RadarUnitModuleOptions extends UnitModuleOptions {
  radius: number;
}
export interface RadarUnitModuleState extends UnitModuleState {
  shoots: Set<ShootDescription>;
  warnings: {
    missile: number;
  };
}

export enum WARNING_TYPE {
  MISSILE = 'missile'
}

export default class RadarUnitModule extends UnitModule<
  RadarUnitModuleOptions,
  RadarUnitModuleState,
  RadarUnitObservables
> {
  static override TYPE = 'radar';

  constructor(
    unit: Unit,
    options: RadarUnitModuleOptions,
    state: RadarUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      { ...options, radius: options.radius ?? 2 },
      {
        ...state,
        warnings: { missile: 0 },
        shoots: new Set<ShootDescription>()
      },
      debug
    );

    //#region observables
    this.observables.warning$ = new Subject<WARNING_TYPE[]>();
    //#endregion
  }

  override async setup() {
    await super.setup();
    const unit = this.getUnit();
    const map$ = unit.observables.map$;
    this.subscription.add(
      map$
        .pipe(
          switchMap(map => map?.modules.shoot.observables.addShoot$ ?? EMPTY),
          filter(shoot => shoot.targetUnit?.equal(unit) ?? false),
          filter(
            shoot =>
              shoot.projectileInstance.projectile instanceof
                AirHomingMissile_1 ||
              shoot.projectileInstance.projectile instanceof BaseMissileLauncher
          )
        )
        .subscribe(shoot => {
          this.state.warnings.missile++;
          this.state.shoots.add(shoot);
          this.observables.warning$.next(this.getWarningTypes());
        })
    );

    this.subscription.add(
      map$
        .pipe(
          switchMap(
            map => map?.modules.shoot.observables.removeShoot$ ?? EMPTY
          ),
          filter(shoot => shoot.targetUnit?.equal(unit) ?? false)
        )
        .subscribe(shoot => {
          this.state.warnings.missile--;
          this.state.shoots.delete(shoot);
          this.observables.warning$.next(this.getWarningTypes());
        })
    );
  }

  getWarningTypes() {
    const warnings: WARNING_TYPE[] = [];
    if (this.state.warnings.missile > 0) {
      warnings.push(WARNING_TYPE.MISSILE);
    }
    return warnings;
  }

  getRadius() {
    return this.options.radius;
  }
}
