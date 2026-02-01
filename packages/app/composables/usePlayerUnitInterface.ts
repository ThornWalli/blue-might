import {
  combineLatest,
  concatMap,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  of,
  Subscription,
  switchMap,
  throttleTime,
  timer
} from 'rxjs';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type { Vector3 } from 'three';
import { Euler } from 'three';
import type { VehicleUnits } from '@blue-might/units';

import WeaponUnitModule from '../lib/classes/unitModule/Weapon';
import type AirVehicleUnit from '../lib/classes/unit/vehicle/AirVehicle';
import type { FLIGHT_STATUS } from '../lib/classes/unitModule/movable/airVehicle/Helicopter';
import type { PowerInfo } from '../lib/classes/unitModule/Movable';
import { DAMAGE_LEVEL } from '../lib/classes/unitModule/Damage';
import type { WeaponSlot } from '../lib/classes/WeaponSlot';
import type Unit from '../lib/classes/Unit';
import type { UnitModules } from '../lib/classes/Unit';
import {
  isAirVehicle,
  isGroundVehicle,
  isSeaVehicle,
  isVehicle
} from '../lib/utils/unit';
import type { App } from '../lib/types';
import { getCompassDisplayValue } from '../lib/utils/compas';
import type TransportUnitModule from '../lib/classes/unitModule/Transport';

export default function usePlayerUnitInterface(app: App) {
  const subscription = new Subscription();

  if (!('player' in app.modules)) {
    throw new Error('Module "player" is not available in the app.');
  }

  const playerModule = app.modules.player;

  const unit = ref<Raw<VehicleUnits> | null>(null);

  const unitDamage = ref<{
    max: number;
    value: number;
    level: number;
  }>({
    max: 0,
    value: 0,
    level: 0
  });
  const isDestroyed = computed(
    () => unitDamage.value.value >= DAMAGE_LEVEL.DESTROYED / 2
  );

  const unitGears = ref<{
    has: boolean;
    active: boolean;
    opened: boolean;
    canUse: boolean;
  }>({
    has: false,
    active: false,
    opened: false,
    canUse: false
  });
  const unitSpeed = ref<string>('0');
  const unitRotation = ref<Euler>(new Euler(0, 0, 0));
  const position = ref<Vector3 | null>(null);
  const status = ref<FLIGHT_STATUS | null>(null);
  const powerInfo = ref<PowerInfo>({
    flightPower: 0,
    currentPower: 0,
    maxPower: 0,
    minPower: 0,
    idlePower: 0
  });
  const autoAimActive = ref<boolean>(false);
  const unitActive = ref<boolean>(false);
  const weaponSlots = ref<WeaponSlot[]>([]);
  const fuelWarningMinValue = ref<number>(0.4);
  const fuelInfo = ref<{
    fuel: number;
    fuelMax: number;
  }>({
    fuel: 0,
    fuelMax: 0
  });
  const playerLifes = ref<number>(3);
  const transportSlotInfo = ref<{
    used: number;
    max: number;
  }>({
    used: 0,
    max: 0
  });

  const seaHeight = computed(
    () => app.modules.map.getMap()?.modules.surface.getSeaLevel() ?? 0
  );
  const currentHeight = computed(() => {
    return seaHeight.value + ((position.value?.y ?? 0) - seaHeight.value);
  });

  const groundHeight = computed(() => {
    return position.value
      ? (app.modules.map
          .getMap()
          ?.modules.surface.getSurfaceHeightAt(
            position.value.x,
            position.value.z
          ) ?? 0)
      : 0;
  });

  const hasFuelWarning = computed(() => {
    if (!fuelInfo.value) return false;
    return (
      fuelInfo.value.fuel / fuelInfo.value.fuelMax <= fuelWarningMinValue.value
    );
  });

  const compassValue = computed(() => {
    return getCompassDisplayValue(unitRotation.value.y);
  });

  onMounted(() => {
    const unit$ = playerModule.observables.currentPlayer$.pipe(
      switchMap(player => player.modules.vehicle.observables.unit$)
    );
    const vehicle$ = unit$.pipe(map(unit => unit as VehicleUnits | null));

    const vehicleModule$ = vehicle$.pipe(
      filter(vehicle => !!vehicle?.modules.movable),
      switchMap(vehicle => of(vehicle?.modules.movable) ?? EMPTY),
      filter(Boolean)
    );
    const transportModule$ = unit$.pipe(
      filter(unit => !!unit && 'transport' in unit.modules),
      switchMap(
        unit =>
          of(
            (
              unit as Unit<
                UnitModules & {
                  transport: TransportUnitModule;
                }
              >
            ).modules.transport
          ) ?? EMPTY
      )
    );
    const weaponModule$ = vehicle$.pipe(
      filter(vehicle => vehicle?.hasModuleType(WeaponUnitModule) ?? false),
      switchMap(
        vehicle => of(vehicle?.getModuleByType(WeaponUnitModule)) ?? EMPTY
      ),
      filter(Boolean)
    );

    const helicopterModule$ = vehicle$.pipe(
      map(vehicle => (vehicle as AirVehicleUnit)?.modules.airVehicle)
    );

    subscription.add(
      playerModule.observables.currentPlayer$
        .pipe(
          switchMap(player => player?.modules.life.observables.lifes$ ?? EMPTY)
        )
        .subscribe(lifes => (playerLifes.value = lifes))
    );

    //#region vehicle

    subscription.add(
      vehicle$
        .pipe(
          switchMap(
            vehicle =>
              vehicle?.getModuleByType(WeaponUnitModule)?.observables.slots$ ??
              EMPTY
          )
        )
        .subscribe(slots => (weaponSlots.value = markRaw([...slots])))
    );

    subscription.add(
      vehicle$
        .pipe(
          switchMap(vehicle => {
            const movableModule = vehicle?.modules.movable;
            return (
              movableModule?.observables.fuel$.pipe(
                throttleTime(500),
                distinctUntilChanged(),
                map(fuel => ({
                  fuel: fuel ?? 0,
                  fuelMax: movableModule?.getMaxFuel() ?? 0
                }))
              ) ?? EMPTY
            );
          })
        )
        .subscribe(info => (fuelInfo.value = info))
    );

    subscription.add(
      vehicle$.subscribe(
        vehicle => (unit.value = vehicle ? markRaw(vehicle) : null)
      )
    );

    subscription.add(
      vehicle$
        .pipe(switchMap(vehicle => vehicle?.observables.position$ ?? EMPTY))
        .subscribe(p => (position.value = p.clone()))
    );

    subscription.add(
      vehicleModule$
        .pipe(switchMap(({ observables }) => observables.active$))
        .subscribe(v => (unitActive.value = v))
    );

    //#endregion

    //#region transport
    subscription.add(
      transportModule$
        .pipe(
          switchMap(v => {
            return v
              ? of(v).pipe(
                  switchMap(v => v.observables.slots$),
                  map(slots => ({ used: slots.length, max: v.getMaxSlots() }))
                )
              : EMPTY;
          })
        )
        .subscribe(({ used, max }) => {
          transportSlotInfo.value = {
            used,
            max
          };
        })
    );

    //#endregion

    //#region weapon

    subscription.add(
      weaponModule$
        .pipe(
          switchMap(weaponModule =>
            weaponModule.observables.shoot$.pipe(
              map(() => weaponModule.getSlots())
            )
          )
        )
        .subscribe(slots => (weaponSlots.value = markRaw([...slots])))
    );

    subscription.add(
      weaponModule$
        .pipe(switchMap(({ observables }) => observables.autoAimActive$))
        .subscribe(v => (autoAimActive.value = v))
    );

    subscription.add(
      vehicleModule$
        .pipe(switchMap(({ observables }) => observables.powerInfo$))
        .subscribe(v => (powerInfo.value = v))
    );

    subscription.add(
      vehicleModule$
        .pipe(
          switchMap(vehicleModule =>
            timer(0, 100).pipe(map(() => vehicleModule))
          )
        )
        .subscribe(
          vehicleModule =>
            (unitSpeed.value = Math.min(
              vehicleModule.state.velocity.length(),
              1
            ).toFixed(2))
        )
    );
    subscription.add(
      vehicle$
        .pipe(
          switchMap(vehicle =>
            vehicle
              ? timer(0, 100).pipe(
                  concatMap(() => vehicle.observables.rotation$)
                )
              : EMPTY
          )
        )
        .subscribe(rotation => (unitRotation.value = rotation))
    );

    subscription.add(
      vehicle$
        .pipe(
          switchMap(
            vehicle =>
              vehicle?.modules.damage.observables.damage$.pipe(
                map(() => ({
                  max: vehicle?.modules.damage.getMaxDamage(),
                  value: vehicle?.modules.damage.getDamageValue(),
                  level: vehicle?.modules.damage.getDamageLevel()
                }))
              ) ?? EMPTY
          )
        )
        .subscribe(value => (unitDamage.value = value))
    );

    //#endregion

    //#region helicopter

    subscription.add(
      helicopterModule$
        .pipe(
          filter(Boolean),
          switchMap(({ observables }) => observables.flightStatus$ ?? EMPTY)
        )
        .subscribe(s => (status.value = s))
    );
    subscription.add(
      helicopterModule$
        .pipe(
          switchMap(module => {
            if (!module) {
              unitGears.value = {
                has: false,
                active: false,
                opened: false,
                canUse: false
              };
              return EMPTY;
            }
            return combineLatest([
              of(module),
              module.observables.gearsActive$,
              module.observables.gearsOpened$
            ]);
          })
        )
        .subscribe(
          ([module, active, opened]) =>
            (unitGears.value = {
              has: true,
              active,
              opened,
              canUse: module.canToggleGears()
            })
        )
    );

    //#endregion
  });

  onUnmounted(() => {
    subscription.unsubscribe();
  });

  return {
    unit,
    unitDamage,
    isDestroyed,
    unitGears,
    unitSpeed,
    unitRotation,
    position,
    status,
    powerInfo,
    autoAimActive,
    unitActive,
    weaponSlots,
    fuelInfo,
    seaHeight,
    hasFuelWarning,
    compassValue,
    groundHeight,
    currentHeight,
    playerLifes,
    transportSlotInfo,
    isVehicle: computed(() => isVehicle(unit.value)),
    isAirVehicle: computed(() => isAirVehicle(unit.value)),
    isSeaVehicle: computed(() => isSeaVehicle(unit.value)),
    isGroundVehicle: computed(() => isGroundVehicle(unit.value))
  };
}
