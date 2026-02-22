import type { Subscription } from 'rxjs';
import {
  combineLatest,
  concatMap,
  EMPTY,
  filter,
  from,
  map,
  ReplaySubject,
  switchMap
} from 'rxjs';
import {
  Mesh,
  MeshLambertMaterial,
  Sphere,
  SphereGeometry,
  Vector3
} from 'three';
import type { Units } from '@blue-might/units';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import type { AnimationLoopValue } from '../Renderer';
import { intersect } from '../../utils/intersect';
import { isRescue } from '../../utils/unit';
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
  targetUnit$: ReplaySubject<Units | null>;
  needRescue$: ReplaySubject<boolean>;
  rescueUnit$: ReplaySubject<Units | null>;
  rescueComplete$: ReplaySubject<boolean>;
}

export interface FigureUnitModuleOptions extends UnitModuleOptions {
  targetRadius: number;
  /**
   * Wenn gesetzt, benötigt die Figur Rettung (z.B. bei Wasser- oder Luftfahrzeugen).
   */
  needRescue: boolean;
}
export interface FigureUnitModuleState extends UnitModuleState {
  targetUnit: Units | null;
  rescueUnit: Units | null;
}
export default class FigureUnitModule extends UnitModule<
  FigureUnitModuleOptions,
  FigureUnitModuleState,
  Observables
> {
  static override TYPE = 'figure';

  sphere: Sphere;
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
        targetRadius: options.targetRadius ?? 3,
        needRescue: options?.needRescue ?? false
      },
      { ...state },
      debug
    );
    //#region observables
    this.observables.targetUnit$ = new ReplaySubject<Units | null>(1);
    this.observables.needRescue$ = new ReplaySubject<boolean>(1);
    this.observables.needRescue$.next(this.options.needRescue);
    this.observables.rescueUnit$ = new ReplaySubject<Units | null>(1);
    this.observables.rescueUnit$.next(this.state.rescueUnit);
    this.observables.rescueComplete$ = new ReplaySubject<boolean>(1);
    //#endregion

    this.sphere = new Sphere(new Vector3(), this.options.targetRadius);
  }
  override destroy() {
    this.destroyDebug();

    super.destroy();
  }

  override async setup() {
    await super.setup();

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

    this.subscription.add(
      this.getUnit().observables.position$.subscribe(position => {
        this.sphere.center.copy(position);
      })
    );
  }

  private lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue) {
    if (!this.options.needRescue || this.isRescueComplete()) return;

    if ((time - this.lastUpdateTime) / 1000 < 1) {
      return;
    }
    this.lastUpdateTime = time;

    const unit = this.getUnit();
    const unitsInRadius = (unit
      .getMap()
      ?.modules.units.chunkManager.getUnitsInRadius(
        this.sphere.center,
        this.options.targetRadius
      ) ?? []) as Units[];

    const rescueUnit = unitsInRadius.find(u => isRescue(u));
    const availableTransportUnits = unitsInRadius.filter(
      u =>
        'transport' in u.modules &&
        u.modules.transport.getCanProcess() &&
        u.modules.transport.hasFreeSlots()
    );
    const filteredUnits = new Set(
      [rescueUnit, ...availableTransportUnits].filter(u => u !== undefined)
    );

    const intersectingUnits: Units[] = [];
    for (const targetUnit of filteredUnits) {
      const intersected = intersect({
        unit: targetUnit,
        sphere: this.sphere,
        radius: this.options.targetRadius
      });
      if (intersected) {
        intersectingUnits.push(intersected);
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
        intersectingUnits.find(u => isRescue(u)) ??
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

  private setupDebug() {
    const debugSphere = new Mesh(
      new SphereGeometry(this.sphere.radius, 16, 16),
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
}
