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
import type App from '@blue-might/app/lib/classes/App';
import type { Vector3 } from 'three';
import { Euler, MathUtils } from 'three';

import type VehicleUnit from '../lib/classes/unit/Vehicle';
import WeaponUnitModule from '../lib/classes/unitModule/Weapon';
import type AirVehicleUnit from '../lib/classes/unit/AirVehicle';
import type { FLIGHT_STATUS } from '../lib/classes/unitModule/movable/airVehicle/Helicopter';
import type { PowerInfo } from '../lib/classes/unitModule/Movable';
import { DAMAGE_LEVEL } from '../lib/classes/unitModule/Damage';
import type { WeaponSlot } from '../lib/classes/WeaponSlot';
import type Unit from '../lib/classes/Unit';
import type { UnitModules } from '../lib/classes/Unit';
import type PlayerUnitModule from '../lib/classes/unitModule/Player';
import {
  isAirVehicle,
  isGroundVehicle,
  isSeaVehicle,
  isVehicle
} from '../lib/utils/unit';
export default function usePlayerUnitInterface(app: App) {
  const subscription = new Subscription();

  const unit = ref<Raw<
    Unit<
      UnitModules & {
        player: PlayerUnitModule;
      }
    >
  > | null>(null);

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

  const seaHeight = computed(
    () => app.modules.map.getMap()?.modules.ground.getSeaLevel() ?? 0
  );
  const currentHeight = computed(() => {
    return seaHeight.value + ((position.value?.y ?? 0) - seaHeight.value);
  });

  const groundHeight = computed(() => {
    return position.value
      ? (app.modules.map
          .getMap()
          ?.modules.ground.getSurfaceHeightAt(
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
    const deg =
      (-MathUtils.radToDeg(-Math.PI / 2 + unitRotation.value.y) + 360) % 360;
    if (deg >= 337.5 || deg < 22.5) return 'E'; // return 'N';
    if (deg < 67.5) return 'SE'; // return 'NE';
    if (deg < 112.5) return 'S'; // return 'E';
    if (deg < 157.5) return 'SW'; // return 'SE';
    if (deg < 202.5) return 'W'; // return 'S';
    if (deg < 247.5) return 'NW'; // return 'SW';
    if (deg < 292.5) return 'N'; // return 'W';
    return 'NE';
  });

  onMounted(() => {
    const vehicle$ = app.modules.player.observables.currentPlayer$.pipe(
      switchMap(player => player.modules.vehicle.observables.unit$),
      map(unit => unit as VehicleUnit | null)
    );

    const vehicleModule$ = vehicle$.pipe(
      filter(vehicle => !!vehicle?.modules.movable),
      switchMap(vehicle => of(vehicle?.modules.movable) ?? EMPTY),
      filter(Boolean)
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
      app.modules.player.observables.currentPlayer$
        .pipe(
          switchMap(player => player?.modules.life.observables.lifes$ ?? EMPTY)
        )
        .subscribe(lifes => (playerLifes.value = lifes))
    );

    //#region vehicle

    subscription.add(
      vehicle$
        .pipe(
          map(
            vehicle =>
              vehicle?.getModuleByType(WeaponUnitModule)?.getSlots() ?? []
          )
        )
        .subscribe(slots => (weaponSlots.value = slots))
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
        .subscribe(slots => (weaponSlots.value = slots))
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
    isVehicle: computed(() => isVehicle(unit.value)),
    isAirVehicle: computed(() => isAirVehicle(unit.value)),
    isSeaVehicle: computed(() => isSeaVehicle(unit.value)),
    isGroundVehicle: computed(() => isGroundVehicle(unit.value))
  };
}
