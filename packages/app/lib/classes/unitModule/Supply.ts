/* eslint-disable complexity */
import { distinctUntilChanged, map, ReplaySubject, Subscription } from 'rxjs';
import { Sphere, type Object3D } from 'three';
import { Mesh, MeshLambertMaterial, SphereGeometry, Vector3 } from 'three';
import type { Units } from '@blue-might/units';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type AirVehicleUnit from '../unit/vehicle/AirVehicle';
import type { AnimationLoopValue } from '../Renderer';
import type VehicleUnit from '../unit/Vehicle';
import type { VehicleUnitModules } from '../unit/Vehicle';
import { disposeObject3D } from '../../utils/object';
import { intersect } from '../../utils/intersect';
import { isVehicle } from '../../utils/unit';

import type WeaponUnitModule from './Weapon';

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
  targetUnits$: ReplaySubject<VehicleUnit[]>;
  unit$: ReplaySubject<VehicleUnit | null>;
  target$: ReplaySubject<Units | null>;
}
export interface SupplyUnitModuleOptions extends UnitModuleOptions {
  changeByDistance: boolean;
  supplyRadius: number;
  sphereTarget: {
    name: string;
  };
  allowedType: {
    sea?: boolean;
    air?: boolean;
    ground?: boolean;
  };
}
export interface SupplyUnitModuleState extends UnitModuleState {
  targetUnits: VehicleUnit[];
  /**
   * The unit that is currently using the landing port.
   */
  unit: VehicleUnit<
    {
      weapon: WeaponUnitModule;
    } & VehicleUnitModules
  > | null;
  target: Units | null;
}

export default class SupplyUnitModule extends UnitModule<
  SupplyUnitModuleOptions,
  SupplyUnitModuleState,
  SupplyUnitModuleObservables,
  VehicleUnit<
    {
      weapon: WeaponUnitModule;
    } & VehicleUnitModules
  >
> {
  static override TYPE = 'supply';
  private supplySphere: Sphere;
  private debugSphere: Mesh | null = null;
  private supply = {
    speed: 0.1,
    progress: 0,
    fuelConsumptionRatio: 0.1,
    weaponSpeed: 1,
    repairSpeed: 0.1
  };
  private lastUpdateTime = 0;

  constructor(
    unit: VehicleUnit<
      {
        weapon: WeaponUnitModule;
      } & VehicleUnitModules
    >,
    options: SupplyUnitModuleOptions,
    state: SupplyUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        supplyRadius: options.supplyRadius ?? 1,
        allowedType: {
          air: options.allowedType?.air ?? true,
          sea: options.allowedType?.sea ?? true,
          ground: options.allowedType?.ground ?? true
        }
      },
      {
        ...state,
        targetUnits: [],
        unit: null
      },
      debug
    );

    //#region observables
    this.observables.targetUnits$ = new ReplaySubject<VehicleUnit[]>(1);
    this.observables.targetUnits$.next([]);
    this.observables.unit$ = new ReplaySubject<VehicleUnit | null>(1);
    this.observables.unit$.next(null);
    this.observables.target$ = new ReplaySubject<Units | null>(1);
    this.observables.target$.next(null);
    //#endregion

    this.supplySphere = new Sphere(new Vector3(), this.options.supplyRadius);
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

    const unit = this.getUnit();

    if ('radar' in unit.modules) {
      this.subscription.add(
        unit.modules.radar.observables.units$
          .pipe(
            map(
              units =>
                units
                  .filter(({ unit }) => isVehicle(unit))
                  .map(({ unit }) => unit) as VehicleUnit[]
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

  override async afterSetup() {
    await super.afterSetup();
    let sphereTargetObj: Object3D | undefined;

    const unit = this.getUnit();

    if (this.debug) {
      this.setupDebug();
    }

    if (this.options.sphereTarget) {
      unit.root.updateMatrixWorld(true);
      sphereTargetObj = unit.root.getObjectByName(
        this.options.sphereTarget.name
      );
    }

    this.subscription.add(
      unit.observables.position$.subscribe(position => {
        sphereTargetObj?.updateMatrixWorld(true);

        const worldPos =
          sphereTargetObj?.getWorldPosition(new Vector3()) ?? position;
        this.supplySphere.center.copy(worldPos);
        this.debugSphere?.position.copy(worldPos);
      })
    );
  }

  override update({ time }: AnimationLoopValue): void {
    //#region  supply
    if (this.state.unit) {
      const unit = this.state.unit;
      const damageModule = unit.modules.damage;
      const weaponModule =
        'weapon' in unit.modules ? unit.modules.weapon : null;
      const movableModule =
        'movable' in unit.modules ? unit.modules.movable : null;
      if (this.supply.progress >= 1) {
        // Supply ammunition
        if (weaponModule) {
          weaponModule.getSlots().forEach(slot => {
            if (slot.ammunition < slot.maxAmmunition) {
              slot.ammunition += Math.ceil(this.supply.weaponSpeed);
            }
          });
        }

        // Supply fuel
        if (
          movableModule &&
          movableModule.getFuel() < movableModule.getMaxFuel()
        ) {
          movableModule.setFuel(
            movableModule.getFuel() +
              movableModule.getMaxFuel() * this.supply.fuelConsumptionRatio
          );
        }

        // Supply repair
        if (
          damageModule &&
          damageModule.getDamageValue() < damageModule.getMaxDamage()
        ) {
          damageModule.setDamage(
            damageModule.getDamageValue() -
              damageModule.getMaxDamage() * this.supply.repairSpeed
          );
        }
        this.supply.progress = 0;
      } else this.supply.progress += this.supply.speed;
    }
    //#endregion

    if ((time - this.lastUpdateTime) / 1000 < 1) {
      return;
    }
    this.lastUpdateTime = time;

    // Wenn bereits ein Ziel vorhanden und die Option "changeByDistance" deaktiviert ist wird nicht automatisch ein neues Ziel gesucht.
    if (!this.options.changeByDistance && this.state.target) {
      return;
    }

    const intersectingUnits: VehicleUnit[] = [];
    for (const targetUnit of this.state.targetUnits) {
      const intersected = intersect({
        unit: targetUnit,
        sphere: this.supplySphere,
        radius: this.options.supplyRadius
      });
      if (intersected) {
        intersectingUnits.push(intersected);
        break;
      }
    }

    if (this.state.unit && !intersectingUnits.includes(this.state.unit)) {
      this.setSupplyUnit(null);
    } else if (intersectingUnits[0]) {
      this.setSupplyUnit(intersectingUnits[0]);
    }

    this.updateDebug(intersectingUnits);
  }

  hasSupplyUnit(unit: AirVehicleUnit | null) {
    return this.state.unit === unit;
  }

  getSupplyUnit(): VehicleUnit | null {
    return this.state.unit;
  }

  setSupplyUnit(unit: VehicleUnit | null) {
    if (unit === this.state.unit) return;

    if (this.state.unit && this.state.unit.modules.customize) {
      this.state.unit.modules.customize.setSupplyUnit(null);
    }

    this.state.unit = unit as VehicleUnit<
      {
        weapon: WeaponUnitModule;
      } & VehicleUnitModules
    >;

    unit?.modules.customize?.setSupplyUnit(unit);
    this.observables.unit$.next(unit);
  }

  private setTarget(target?: VehicleUnit | null) {
    this.state.target = target ?? null;
    if (target) {
      const unitSubscription = new Subscription();
      unitSubscription.add(
        target.observables.position$.subscribe(() => {
          if (
            !intersect({
              unit: target,
              sphere: this.supplySphere,
              radius: this.options.supplyRadius
            })
          ) {
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

  //#region debug

  private setupDebug() {
    const debugSphere = new Mesh(
      new SphereGeometry(this.supplySphere.radius, 16, 16),
      new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
    );
    this.debugSphere = debugSphere;
    this.getUnit().getMap()?.app.getScene().add(this.debugSphere);
  }

  private updateDebug(units: Units[]) {
    if (!this.debugSphere) return;
    const material = this.debugSphere.material as MeshLambertMaterial;
    material.color.set(0x00ff00);
    if (units.length) {
      material.color.set(0xff0000);
    }
  }

  //#endregion
}
