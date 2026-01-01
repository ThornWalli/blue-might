/* eslint-disable complexity */
import { ReplaySubject, Subscription } from 'rxjs';
import {
  Mesh,
  MeshLambertMaterial,
  Sphere,
  SphereGeometry,
  Vector3
} from 'three';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type AirVehicleUnit from '../unit/AirVehicle';
import type { AnimationLoopValue } from '../Renderer';
import type VehicleUnit from '../unit/Vehicle';
import type Unit from '../Unit';
import { disposeObject3D } from '../../utils/object';

import WeaponUnitModule from './Weapon';

declare module '../Unit' {
  interface ModuleStates {
    supply: Partial<SupplyUnitModuleState>;
  }
  interface ModuleOptions {
    supply: Partial<SupplyUnitModuleOptions>;
  }
  interface ModuleDebug {
    supply: boolean;
  }
}
export interface SupplyUnitModuleObservables extends UnitModuleObservables {
  unit$: ReplaySubject<VehicleUnit | null>;
  target$: ReplaySubject<Unit | null>;
}
export interface SupplyUnitModuleOptions extends UnitModuleOptions {
  changeByDistance: boolean;
  radius: number;
}
export interface SupplyUnitModuleState extends UnitModuleState {
  /**
   * The unit that is currently using the landing port.
   */
  unit: VehicleUnit | null;
  target: Unit | null;
}

export default class SupplyUnitModule extends UnitModule<
  SupplyUnitModuleOptions,
  SupplyUnitModuleState,
  SupplyUnitModuleObservables,
  VehicleUnit
> {
  static override TYPE = 'supply';
  private sphere: Sphere;
  private debugSphere: Mesh | null = null;

  constructor(
    unit: VehicleUnit,
    options: SupplyUnitModuleOptions,
    state: SupplyUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      { ...options, radius: options.radius ?? 1 },
      {
        ...state,

        unit: null
      },
      debug
    );

    //#region observables
    this.observables.unit$ = new ReplaySubject<VehicleUnit | null>(1);
    this.observables.unit$.next(null);
    this.observables.target$ = new ReplaySubject<Unit | null>(1);
    this.observables.target$.next(null);
    //#endregion

    this.sphere = new Sphere(new Vector3(), this.options.radius);
  }

  override destroy() {
    if (this.debugSphere) {
      this.debugSphere.removeFromParent();
      disposeObject3D(this.debugSphere);
      this.debugSphere = null;
    }

    super.destroy();
  }

  override async setup() {
    await super.setup();
    this.subscription.add(
      this.getUnit().observables.position$.subscribe(position => {
        this.sphere.center.copy(position);
        this.debugSphere?.position.copy(position);
      })
    );

    if (this.debug) {
      this.setupDebug();
    }
  }

  private supply = {
    speed: 0.1,
    progress: 0,
    fuelValue: 0.1,
    weaponSpeed: 1
  };

  lastUpdateTime = 0;

  override update({ time }: AnimationLoopValue): void {
    //#region  supply
    if (this.state.unit) {
      const unit = this.state.unit;
      const weaponModule = unit.getModuleByType(WeaponUnitModule);
      if (this.supply.progress >= 1) {
        weaponModule.getSlots().forEach(slot => {
          if (slot.ammunition < slot.maxAmmunition) {
            slot.ammunition += Math.ceil(this.supply.weaponSpeed);
          }
        });
        if (
          unit.modules.movable.getFuel() < unit.modules.movable.getMaxFuel()
        ) {
          unit.modules.movable.setFuel(
            unit.modules.movable.getFuel() + this.supply.fuelValue
          );
        }
        this.supply.progress = 0;
      } else this.supply.progress += this.supply.speed;
    }
    //#endregion

    if ((time - this.lastUpdateTime) / 1000 < 2 / 3) {
      return;
    }
    this.lastUpdateTime = time;

    // Wenn bereits ein Ziel vorhanden und die Option "changeByDistance" deaktiviert ist wird nicht automatisch ein neues Ziel gesucht.
    if (!this.options.changeByDistance && this.state.target) {
      return;
    }
    const unit = this.getUnit();
    const unitsInRadius =
      unit
        .getMap()
        ?.modules.units.chunkManager.getUnitsInRadius(
          unit.getPosition(),
          this.options.radius
        ) ?? [];

    const intersectingUnits: Unit[] = [];
    for (const targetUnit of unitsInRadius) {
      if (targetUnit === unit) continue;
      const intersected = this.intersect(targetUnit);
      if (intersected) {
        intersectingUnits.push(intersected);
      }
    }

    //#region debug
    (this.debugSphere?.material as MeshLambertMaterial)?.color.set(0x00ff00);
    if (intersectingUnits.length) {
      (this.debugSphere?.material as MeshLambertMaterial)?.color.set(0xff0000);
    }
    //#endregion
  }

  hasSupplyUnit(unit: AirVehicleUnit | null) {
    return this.state.unit === unit;
  }

  getSupplyUnit(): VehicleUnit | null {
    return this.state.unit;
  }

  setSupplyUnit(unit: VehicleUnit | null) {
    this.state.unit = unit;
    this.observables.unit$.next(unit);
  }

  private setupDebug() {
    const debugSphere = new Mesh(
      new SphereGeometry(this.sphere.radius, 16, 16),
      new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
    );
    this.debugSphere = debugSphere;
    this.getUnit().getMap()?.app.getScene().add(this.debugSphere);
  }

  private intersect(unit: Unit) {
    const collisionModule = unit.modules.collision;
    if (collisionModule) {
      // Hole die Welt-Bounding Box der Ziel-Unit
      const targetBox = collisionModule.getWorldOBB();
      if (targetBox.intersectsSphere(this.sphere)) {
        return unit;
      }
    } else {
      // Fallback: Prüfe Distanz zur Position, wenn kein Kollisionsmodul vorhanden
      const distance = this.getUnit()
        .getPosition()
        .distanceTo(unit.getPosition());
      if (distance <= this.options.radius) {
        return unit;
      }
    }
  }

  private setTarget(target?: Unit | null) {
    this.state.target = target ?? null;
    if (target) {
      const unitSubscription = new Subscription();
      unitSubscription.add(
        target.observables.position$.subscribe(() => {
          if (!this.intersect(target)) {
            this.setTarget(undefined);
            unitSubscription?.unsubscribe();
          }
        })
      );
      unitSubscription.add(
        target.modules.damage.observables.destroyed$.subscribe(() => {
          this.setTarget(undefined);
          unitSubscription?.unsubscribe();
        })
      );
      this.subscription.add(unitSubscription);
    }
    this.observables.target$.next(this.state.target);
    console.log('New attack target:', target);
  }
}
