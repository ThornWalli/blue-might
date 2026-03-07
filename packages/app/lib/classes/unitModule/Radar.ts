import { EMPTY, filter, switchMap, ReplaySubject } from 'rxjs';
import AirHomingMissile_1 from '@blue-might/weapon/projectile/air_homing_missile_1/AirHomingMissile_1';
import { BaseMissileLauncher } from '@blue-might/weapon/weapon';
import type { Vector3 } from 'three';
import { Mesh, MeshLambertMaterial, SphereGeometry } from 'three';
import type { Units } from '@blue-might/units';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type { ShootDescription } from '../mapModule/Shoot';
import type { AnimationLoopValue } from '../Renderer';
import { isUnitDestroyed } from '../../utils/unit';

declare module '../Unit' {
  interface ModuleStates {
    radar: Partial<RadarUnitModuleState>;
  }
  interface ModuleOptions {
    radar: Partial<RadarUnitModuleOptions>;
  }
  interface ModuleDebug {
    radar: boolean;
  }
}

export interface RadarUnitObservables extends UnitModuleObservables {
  warning$: ReplaySubject<WARNING_TYPE[]>;
  units$: ReplaySubject<{ unit: Units; distance: number }[]>;
}

export interface RadarUnitModuleOptions extends UnitModuleOptions {
  /**
   * Radius
   * @default 6
   */
  radius: number;
}
export interface RadarUnitModuleState extends UnitModuleState {
  shoots: Set<ShootDescription>;
  warnings: WARNING_TYPE[];
  units: { unit: Units; distance: number }[];
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
    unit: Units,
    options: RadarUnitModuleOptions,
    state: RadarUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      { ...options, radius: options.radius ?? 10 },
      {
        ...state,
        warnings: [],
        shoots: new Set<ShootDescription>()
      },
      debug
    );

    //#region observables
    this.observables.warning$ = new ReplaySubject<WARNING_TYPE[]>(1);
    this.observables.units$ = new ReplaySubject<
      { unit: Units; distance: number }[]
    >(1);
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
          this.state.warnings.push(WARNING_TYPE.MISSILE);
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
          this.state.warnings.splice(
            this.state.warnings.findIndex(w => w === WARNING_TYPE.MISSILE),
            1
          );
          this.state.shoots.delete(shoot);
          this.observables.warning$.next(this.getWarningTypes());
        })
    );
  }

  override async afterSetup() {
    await super.afterSetup();
    if (this.debug) {
      this.setupDebug();
    }
  }

  private lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue): void {
    if ((time - this.lastUpdateTime) / 1000 < 1) {
      return;
    }
    this.lastUpdateTime = time;

    const unit = this.getUnit();
    const position = unit.getPosition();
    const units = (
      unit
        .getMap()
        ?.modules.units.getUnitsInRadius(position, this.options.radius) ?? []
    ).filter(({ unit: u }) => u !== unit && !isUnitDestroyed(u));

    this.state.units = units;
    this.observables.units$.next(units);
    this.updateRadiusDebug(position, units);
  }

  getWarningTypes() {
    const warnings: WARNING_TYPE[] = [];
    if (this.state.warnings.includes(WARNING_TYPE.MISSILE)) {
      warnings.push(WARNING_TYPE.MISSILE);
    }
    return warnings;
  }

  getRadius() {
    return this.options.radius;
  }

  //#region debug

  private debugSphere: Mesh | null = null;
  private setupDebug() {
    this.debugSphere = new Mesh(
      new SphereGeometry(this.options.radius, 16, 16),
      new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
    );
    this.getUnit().getMap()?.app.getScene().add(this.debugSphere);
  }

  updateRadiusDebug(position: Vector3, units: { unit: Units }[]) {
    this.debugSphere?.position.copy(position);
    if (this.debugSphere) {
      const color = (this.debugSphere.material as MeshLambertMaterial)?.color;
      color.set(0x00ff00);
      if (units.length) {
        color.set(0xff0000);
      }
    }
  }

  //#endregion
}
