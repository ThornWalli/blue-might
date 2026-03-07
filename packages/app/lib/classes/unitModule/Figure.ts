import type { Subscription } from 'rxjs';
import {
  combineLatest,
  concatMap,
  distinctUntilChanged,
  EMPTY,
  filter,
  from,
  map,
  ReplaySubject,
  switchMap
} from 'rxjs';
import { Mesh, MeshLambertMaterial, SphereGeometry } from 'three';
import type { Units } from '@blue-might/units';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import type { AnimationLoopValue } from '../Renderer';
import { canRescue, isRescue, isUnitDestroyed } from '../../utils/unit';
import type FigureUnit from '../unit/Figure';

declare module '../Unit' {
  interface ModuleStates {
    figure: Partial<FigureUnitModuleState>;
  }
  interface ModuleOptions {
    figure: Partial<FigureUnitModuleOptions>;
  }
  interface ModuleDebug {
    figure: boolean;
  }
}

interface Observables extends UnitModuleObservables {
  targetUnits$: ReplaySubject<Units[]>;
  targetUnit$: ReplaySubject<Units | null>;
  needRescue$: ReplaySubject<boolean>;
  rescueUnit$: ReplaySubject<Units | null>;
  rescueComplete$: ReplaySubject<boolean>;
}

export interface FigureUnitModuleOptions extends UnitModuleOptions {
  /**
   * Wenn gesetzt, benötigt die Figur Rettung (z.B. bei Wasser- oder Luftfahrzeugen).
   */
  needRescue: boolean;
}
export interface FigureUnitModuleState extends UnitModuleState {
  targetUnits: Units[];
  targetUnit: Units | null;
  rescueUnit: Units | null;
}
export default class FigureUnitModule extends UnitModule<
  FigureUnitModuleOptions,
  FigureUnitModuleState,
  Observables
> {
  static override TYPE = 'figure';

  debugSphere: Mesh | null = null;

  constructor(
    unit: FigureUnit,
    options: FigureUnitModuleOptions,
    state: FigureUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        needRescue: options?.needRescue ?? false
      },
      { ...state, targetUnits: [] },
      debug
    );
    //#region observables
    this.observables.targetUnits$ = new ReplaySubject<Units[]>(1);
    this.observables.targetUnits$.next([]);
    this.observables.targetUnit$ = new ReplaySubject<Units | null>(1);
    this.observables.needRescue$ = new ReplaySubject<boolean>(1);
    this.observables.needRescue$.next(this.options.needRescue);
    this.observables.rescueUnit$ = new ReplaySubject<Units | null>(1);
    this.observables.rescueUnit$.next(this.state.rescueUnit);
    this.observables.rescueComplete$ = new ReplaySubject<boolean>(1);
    //#endregion
  }
  override destroy() {
    this.destroyDebug();

    super.destroy();
  }

  override async setup() {
    await super.setup();

    const unit = this.getUnit();

    /**
     * Wenn die Rettungseinheit zerstört wird, wird auch die Figur zerstört.
     */
    this.subscription.add(
      this.observables.rescueUnit$
        .pipe(
          switchMap(rescueUnit => rescueUnit?.observables.destroyed$ ?? EMPTY)
        )
        .subscribe(() => this.getUnit().destroy())
    );

    let subscription: Subscription | null = null;
    this.subscription.add(
      this.observables.targetUnit$
        .pipe(
          concatMap(async u => {
            const unit = this.getUnit();
            if (!unit || !u) {
              if (this.getUnit().modules.pathfinding.isMoving()) {
                await this.getUnit().modules.pathfinding.abortMovement();
              }
            }
            return u;
          })
        )
        .subscribe(u => {
          subscription?.unsubscribe();
          subscription = null;
          if (u) {
            subscription = from(this.moveToUnit())
              .pipe(
                map(() => u),
                switchMap(() => {
                  const targetUnit = this.state.targetUnit;
                  const unit = this.getUnit();
                  if (targetUnit && 'rescue' in targetUnit.modules) {
                    console.log('Target unit is a rescue unit');
                    targetUnit.modules.rescue.rescueUnit(unit);
                    return EMPTY;
                  } else if (targetUnit && 'transport' in targetUnit.modules) {
                    console.log('Target unit is a transport unit');
                    if (targetUnit.modules.transport.load(unit)) {
                      return targetUnit.modules.transport.observables.unload$.pipe(
                        filter(u => unit === u)
                      );
                    } else {
                      this.setTargetUnit(null);
                    }
                  }
                  return EMPTY;
                })
              )
              .subscribe(() => {
                console.log('Unit has been unloaded from transport');
                this.setTargetUnit(null);
              });
            this.subscription.add(subscription);
          }
        })
    );

    if ('radar' in unit.modules) {
      this.subscription.add(
        unit.modules.radar.observables.units$
          .pipe(
            map(units =>
              units
                .filter(
                  ({ unit }) => filterTransport(unit) || filterRescue(unit)
                )
                .map(({ unit }) => unit)
            ),
            distinctUntilChanged(
              (a, b) => a.map(u => u.id).join() === b.map(u => u.id).join()
            )
          )
          .subscribe(units => {
            this.state.targetUnits = units;
            this.observables.targetUnits$.next(units);
          })
      );
    } else {
      console.error('No radar module found');
    }
  }

  private async moveToUnit() {
    const unit = this.getUnit();
    const targetUnit = this.state.targetUnit;
    if (!targetUnit) return;

    if ('patrol' in unit.modules) {
      await unit.modules.patrol.stopPatrol();
    }
    if ('transport' in targetUnit.modules) {
      await unit.modules.pathfinding.move(
        targetUnit.modules.transport.getWorldEntryPosition()
      );
    }
  }

  override async afterSetup() {
    await super.afterSetup();

    if (this.debug) {
      this.subscription.add(
        this.getUnit()
          .observables.active$.pipe(
            switchMap(active => {
              if (active) {
                this.setupDebug();
                return this.getUnit().observables.position$;
              } else {
                this.destroyDebug();
                return EMPTY;
              }
            })
          )
          .subscribe(position => {
            this.debugSphere?.position.copy(position);
          })
      );
    }
  }

  private lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue) {
    if (!this.options.needRescue || this.isRescueComplete()) return;

    if ((time - this.lastUpdateTime) / 1000 < 1) {
      return;
    }

    this.lastUpdateTime = time;

    const rescueUnit = this.state.targetUnits.filter(filterRescue)[0];
    const availableTransportUnits =
      this.state.targetUnits.filter(filterTransport);

    const filteredUnits = new Set(
      [rescueUnit, ...availableTransportUnits].filter(u => u !== undefined)
    );

    const intersectingUnits: Units[] = [];
    for (const targetUnit of filteredUnits) {
      if (targetUnit && !isUnitDestroyed(targetUnit)) {
        intersectingUnits.push(targetUnit);
        break;
      }
    }

    if (
      this.state.targetUnit &&
      !intersectingUnits.includes(this.state.targetUnit)
    ) {
      this.setTargetUnit(null);
    } else {
      const unit =
        intersectingUnits.find(u => canRescue(u)) ??
        (intersectingUnits[0] as Units);

      if (unit && 'transport' in unit.modules) {
        const subscription = combineLatest([
          unit.modules.transport.observables.canProcess$,
          this.observables.targetUnit$
        ]).subscribe(([canProcess, targetUnit]) => {
          if (!canProcess && targetUnit) {
            this.setTargetUnit(null);
            subscription.unsubscribe();
          }
        });
        this.subscription.add(subscription);
        this.setTargetUnit(unit);
      }
    }

    this.updateDebug(intersectingUnits);
  }

  private setTargetUnit(unit: Units | null) {
    if (this.state.targetUnit === unit) return;
    this.state.targetUnit = unit;
    this.observables.targetUnit$.next(unit);
  }

  private getRadius() {
    const unit = this.getUnit();
    if ('radar' in unit.modules) {
      const radarModule = unit.modules.radar;
      return radarModule.getRadius();
    }
    return 0;
  }

  getNeedRescue() {
    return this.options.needRescue;
  }

  setNeedRescue(needRescue: boolean) {
    this.options.needRescue = needRescue;
    this.observables.needRescue$.next(needRescue);
  }

  setRescueUnit(unit: Units) {
    this.state.rescueUnit = unit;
    this.observables.rescueComplete$.next(true);
  }
  isRescueComplete() {
    return !!this.state.rescueUnit;
  }

  override getOptions() {
    return {
      ...super.getOptions(),
      needRescue: this.getNeedRescue()
    };
  }

  //#region debug

  private setupDebug() {
    const debugSphere = new Mesh(
      new SphereGeometry(this.getRadius(), 16, 16),
      new MeshLambertMaterial({
        opacity: 0.2,
        transparent: true,
        color: 0x00ff00,
        wireframe: true
      })
    );
    this.debugSphere = debugSphere;
    debugSphere.userData[OBJECT_USER_DATA.IGNORE_RAYCASTER] = true;
    this.getUnit().map?.root.add(this.debugSphere);
  }

  private destroyDebug() {
    if (this.debugSphere) {
      disposeObject3D(this.debugSphere);
      this.debugSphere = null;
    }
  }

  private updateDebug(units: Units[]) {
    if (this.debugSphere) {
      (this.debugSphere.material as MeshLambertMaterial)?.color.set(0x00ff00);
      if (units.length) {
        (this.debugSphere.material as MeshLambertMaterial)?.color.set(0xff0000);
      }
    }
  }

  //#endregion
}

function filterRescue(u: Units): boolean {
  return isRescue(u);
}

function filterTransport(u: Units): boolean {
  return (
    'transport' in u.modules &&
    u.modules.transport.getCanProcess() &&
    u.modules.transport.hasFreeSlots()
  );
}
