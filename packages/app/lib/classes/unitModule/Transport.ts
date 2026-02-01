import {
  Subject,
  combineLatest,
  of,
  ReplaySubject,
  switchMap,
  EMPTY
} from 'rxjs';
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector2 } from 'three';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';

import { FLIGHT_STATUS } from './movable/airVehicle/Helicopter';

declare module '../Unit' {
  interface ModuleStates {
    transport: Partial<TransportUnitModuleState>;
  }
  interface ModuleOptions {
    transport: Partial<TransportUnitModuleOptions>;
  }
  interface ModuleDebug {
    transport: boolean;
  }
}

export interface TransportUnitModuleObservables extends UnitModuleObservables {
  slots$: ReplaySubject<Unit[]>;
  canProcess$: ReplaySubject<boolean>;
  load$: Subject<Unit>;
  unload$: Subject<Unit>;
  unloadAll$: Subject<Unit[]>;
}

export interface TransportUnitModuleOptions extends UnitModuleOptions {
  maxSlots: number;
  /**
   * Offset der Position, an der Einheiten aus dem Transport ein-/entladen werden.
   */
  entryPosition: Vector2;
}

export interface TransportUnitModuleState extends UnitModuleState {
  slots: Unit[];
  canProcess: boolean;
}

export default class TransportUnitModule<
  Options extends TransportUnitModuleOptions = TransportUnitModuleOptions,
  State extends TransportUnitModuleState = TransportUnitModuleState,
  Observables extends TransportUnitModuleObservables =
    TransportUnitModuleObservables
> extends UnitModule<Options, State, Observables> {
  static override TYPE = 'transport';

  private debugEntry: Mesh | null = null;

  constructor(unit: Unit, options: Options, state: State, debug: boolean) {
    super(
      unit,
      {
        ...options,
        entryPosition: options?.entryPosition ?? new Vector2(0, 1),
        maxSlots: options?.maxSlots ?? 3
      },
      { ...state, canProcess: true, slots: state?.slots ?? [] },
      debug
    );
    //#region observables
    this.observables.slots$ = new ReplaySubject<Unit[]>(1);
    this.observables.slots$.next(this.state.slots);
    this.observables.canProcess$ = new ReplaySubject<boolean>(1);
    this.observables.canProcess$.next(this.state.canProcess);
    this.observables.load$ = new Subject<Unit>();
    this.observables.unload$ = new Subject<Unit>();
    this.observables.unloadAll$ = new Subject<Unit[]>();
    //#endregion
  }

  /**
   * Gibt die Position zurück, an der Einheiten aus dem Transport ein-/entladen werden.
   * Die Rotation wird dabei berücksichtigt.
   * @returns Die Weltposition für das Ein-/Ausstiegsgebiet.
   */
  getWorldEntryPosition() {
    const unit = this.getUnit();
    const position = unit.getPosition().clone();
    const rotation = -unit.getRotation().y;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    // Rotiere den Offset korrekt: x' = x*cos - y*sin, z' = x*sin + y*cos
    position.x +=
      this.options.entryPosition.x * cos - this.options.entryPosition.y * sin;
    position.z +=
      this.options.entryPosition.x * sin + this.options.entryPosition.y * cos;
    return position;
  }

  override async setup() {
    await super.setup();

    const unit = this.getUnit();

    if ('airVehicle' in unit.modules) {
      this.subscription.add(
        combineLatest([
          this.observables.slots$,
          unit.modules.airVehicle.observables.flightStatus$ ?? of(true)
        ]).subscribe(([slots, flightStatus]) => {
          let canProcess = flightStatus === FLIGHT_STATUS.LANDED;
          if (slots.length >= this.options.maxSlots) {
            canProcess = false;
          }
          console.log(
            `Flight status: ${flightStatus}, Slots: ${slots.length}/${this.options.maxSlots}, CanProcess: ${canProcess}`
          );
          this.setCanProcess(canProcess);
        })
      );
    }

    // this.subscription.add(
    //   this.observables.targetUnit$.subscribe(async targetUnit => {
    //     if (!targetUnit) {
    //       if (this.getUnit().modules.pathfinding.isMoving()) {
    //         this.getUnit().modules.pathfinding.abortMovement();
    //       }
    //       return;
    //     }

    //     await this.moveToUnit();

    //     if (isRescue(targetUnit)) {
    //       console.log('Target unit is a rescue unit');
    //     } else if (isTransport(targetUnit)) {
    //       console.log('Target unit is a transport unit');
    //     }
    //   })
    // );

    if (this.debug) {
      this.subscription.add(
        this.getUnit()
          .observables.active$.pipe(
            switchMap(active => {
              if (active) {
                this.setupDebug();
                return combineLatest([
                  this.getUnit().observables.position$,
                  this.getUnit().observables.rotation$
                ]);
              } else {
                this.destroyDebug();
                return EMPTY;
              }
            })
          )
          .subscribe(() => {
            this.debugEntry?.position.copy(this.getWorldEntryPosition());
          })
      );
    }
    if (this.debug) {
      this.setupDebug();
      this.subscription.add(
        combineLatest([
          this.getUnit().observables.position$,
          this.getUnit().observables.rotation$
        ]).subscribe(() => {
          this.debugEntry?.position.copy(this.getWorldEntryPosition());
        })
      );
    }
  }

  override destroy() {
    this.destroyDebug();
    super.destroy();
  }

  setSlots(units: Unit[]) {
    this.state.slots = units;
    this.observables.slots$.next(units);
  }

  /**
   * Fügt eine Einheit dem Transport hinzu.
   */
  load(unit: Unit) {
    const slots = this.state.slots;
    if (slots.length < this.options.maxSlots) {
      slots.push(unit);
      this.getUnit().map?.modules.units.remove(unit);
      this.setSlots(slots);
      this.observables.load$.next(unit);
      return true;
    }
    return false;
  }

  async unload(unit: Unit) {
    const slots = this.state.slots;
    if (slots.includes(unit)) {
      this.setSlots(slots.filter(u => u !== unit));
      unit.setPosition(this.getWorldEntryPosition(), { force: true });
      console.log(
        'Unloading unit at',
        unit.getPosition().toArray(),
        this.getWorldEntryPosition().toArray()
      );
      unit = (await this.getUnit().map?.modules.units.add(unit))!;
      this.observables.unload$.next(unit);
    } else {
      throw new Error('TransportUnitModule: Unit not found in slots');
    }
  }

  /**
   * Lädt alle Einheiten aus dem Transport aus.
   */
  async unloadAll() {
    const slots = this.state.slots;
    await slots.reduce(
      (result, unit) => result.then(() => this.unload(unit)),
      Promise.resolve()
    );
    this.observables.unloadAll$.next(slots);
  }

  getCanProcess() {
    return this.state.canProcess;
  }

  private setCanProcess(value: boolean) {
    this.state.canProcess = value;
    this.observables.canProcess$.next(value);
  }

  getSlotCount() {
    return this.state.slots.length;
  }
  getMaxSlots() {
    return this.options.maxSlots;
  }

  hasFreeSlots() {
    return this.state.slots.length < this.options.maxSlots;
  }

  private setupDebug() {
    const debugEntry = new Mesh(
      new BoxGeometry(0.125, 0.25, 0.125),
      new MeshBasicMaterial({
        color: 0xff0000
      })
    );
    this.debugEntry = debugEntry;
    this.debugEntry.userData[OBJECT_USER_DATA.IGNORE_RAYCASTER] = true;
    this.getUnit().map?.root.add(this.debugEntry);
  }

  private destroyDebug() {
    if (this.debugEntry) {
      disposeObject3D(this.debugEntry);
      this.debugEntry = null;
    }
  }
}
