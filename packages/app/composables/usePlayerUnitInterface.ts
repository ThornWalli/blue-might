import {
  combineLatest,
  concatMap,
  distinctUntilChanged,
  EMPTY,
  filter,
  forkJoin,
  from,
  map,
  merge,
  of,
  Subscription,
  switchMap,
  throttleTime,
  timer,
  toArray
} from 'rxjs';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type { Vector3 } from 'three';
import { Euler } from 'three';
import type { VehicleUnits } from '@blue-might/units';

import WeaponUnitModule, {
  type WeaponAutopilotOptions
} from '../lib/classes/unitModule/Weapon';
import type AirVehicleUnit from '../lib/classes/unit/vehicle/AirVehicle';
import type { FLIGHT_STATUS } from '../lib/classes/unitModule/movable/airVehicle/Helicopter';
import type { PowerInfo } from '../lib/classes/unitModule/Movable';
import type { WeaponSlotThumb } from '../lib/classes/WeaponSlot';
import type Unit from '../lib/classes/Unit';
import type { UnitModules } from '../lib/classes/Unit';
import {
  isAirVehicle,
  isGroundVehicle,
  isSeaVehicle,
  isVehicle
} from '../lib/utils/unit';
import type { App } from '../lib/types';
import { getCompassDisplayValue } from '../lib/utils/compass';
import type TransportUnitModule from '../lib/classes/unitModule/Transport';
import thumbGenerator from '../services/thumbGenerator';
import type { WARNING_TYPE } from '../lib/classes/unitModule/Radar';

export interface TransportSlotInfoSlot {
  key: string;
  id: string;
  name: string;
  thumb?: string;
}
export interface TransportSlotInfo {
  slots: TransportSlotInfoSlot[];
  maxSlots: number;
}

const appMap = new Map<App, ReturnType<typeof create>>();

export default function usePlayerUnitInterface(app: App) {
  if (!appMap.has(app)) {
    appMap.set(app, create(app));
  }
  return appMap.get(app) as ReturnType<typeof create>;
}

function create(app: App) {
  const subscription = new Subscription();

  if (!('player' in app.modules)) {
    throw new Error('Module "player" is not available in the app.');
  }

  const playerModule = app.modules.player;

  const unit = ref<Raw<VehicleUnits> | null>(null);

  const unitDamage = ref<{
    destroyed: boolean;
    value: number;
    level: number;
  }>({
    destroyed: false,
    value: 0,
    level: 0
  });

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
  const flightStatus = ref<FLIGHT_STATUS | null>(null);
  const warnings = ref<WARNING_TYPE[]>([]);
  const hasAimTarget = ref<boolean>(false);
  const powerInfo = ref<PowerInfo>({
    flightPower: 0,
    currentPower: 0,
    maxPower: 0,
    minPower: 0,
    idlePower: 0
  });
  const weaponAutopilot = ref<WeaponAutopilotOptions>({
    aim: false,
    shoot: false
  });
  const unitActive = ref<boolean>(false);
  const weaponSlots = ref<WeaponSlotThumb[]>([]);
  const fuelWarningMinValue = ref<number>(0.4);
  const fuelInfo = ref<{
    fuel: number;
    fuelMax: number;
  }>({
    fuel: 0,
    fuelMax: 0
  });
  const playerLifes = ref<number>(3);
  const transportSlotInfo = ref<TransportSlotInfo>({
    slots: [],
    maxSlots: 0
  });

  const projectileHelper = ref(false);

  const canCustomize = ref(false);

  const seaHeight = computed(
    () => app.modules.map.getMap()?.modules.surface.getWaterLevel() ?? 0
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
      switchMap(player => player.modules.vehicle.observables.currentUnit$)
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

    subscription.add(
      playerModule.observables.currentPlayer$
        .pipe(
          switchMap(p => p?.modules.vehicle.observables.currentUnit$ ?? EMPTY),
          switchMap(unit =>
            'radar' in unit.modules
              ? unit.modules.radar.observables.warnings$
              : EMPTY
          )
        )
        .subscribe(types => {
          warnings.value = types;
        })
    );

    //#region vehicle

    subscription.add(
      merge(
        vehicle$.pipe(
          switchMap(
            vehicle =>
              vehicle?.getModuleByType(WeaponUnitModule)?.observables.slots$ ??
              EMPTY
          )
        ),
        weaponModule$.pipe(
          switchMap(weaponModule =>
            weaponModule.observables.shoot$.pipe(
              map(() => weaponModule.getSlots())
            )
          )
        )
      )
        .pipe(
          switchMap(slots => {
            return from(slots).pipe(
              concatMap(async slot => {
                return {
                  ...slot,
                  thumb: await thumbGenerator.getFromProjectile(
                    slot.weapon.projectile.id,
                    {
                      size: 32,
                      view: 'isometric'
                    }
                  )
                } as WeaponSlotThumb;
              }),
              toArray()
            );
          })
        )
        .subscribe(slots => {
          weaponSlots.value = markRaw([...slots]);
        })
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
      vehicle$
        .pipe(
          switchMap(vehicle =>
            vehicle &&
            'customize' in vehicle.modules &&
            vehicle.modules.customize
              ? vehicle.modules.customize.observables.supplyUnit$.pipe(
                  map(supplyUnit => !!supplyUnit)
                )
              : of(false)
          )
        )
        .subscribe(hasSupplyUnit => {
          console.log('Supply Unit Available:', hasSupplyUnit);
          canCustomize.value = !!hasSupplyUnit;
        })
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
          switchMap(v =>
            v
              ? of(v).pipe(
                  switchMap(v => v.observables.slots$),
                  switchMap(slots =>
                    forkJoin({
                      slots: from(slots).pipe(
                        concatMap(async slot => {
                          const thumb = slot.key
                            ? await thumbGenerator.getFromUnit(slot.key, {
                                size: 16,
                                view: 'front',
                                faction: slot.modules.faction.getFaction()
                              })
                            : undefined;

                          return {
                            key: slot.key,
                            id: slot.id,
                            name: slot.name,
                            thumb
                          };
                        }),
                        toArray()
                      ),
                      maxSlots: of(v.getMaxSlots())
                    })
                  )
                )
              : EMPTY
          )
        )
        .subscribe(v => {
          transportSlotInfo.value = v;
        })
    );

    //#endregion

    //#region weapon

    subscription.add(
      weaponModule$
        .pipe(
          switchMap(weaponModule => weaponModule.observables.autoAimTarget$)
        )
        .subscribe(v => {
          hasAimTarget.value = !!v;
        })
    );
    subscription.add(
      weaponModule$
        .pipe(
          switchMap(weaponModule => weaponModule.observables.projectileHelper$)
        )
        .subscribe(v => {
          projectileHelper.value = !!v;
        })
    );

    subscription.add(
      weaponModule$
        .pipe(switchMap(({ observables }) => observables.autopilot$))
        .subscribe(v => (weaponAutopilot.value = v))
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
                  destroyed: vehicle.modules.damage.isDestroyed(),
                  value: vehicle.modules.damage.getDamageValue(),
                  level: vehicle.modules.damage.getDamageLevel()
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
        .pipe(switchMap(v => v?.observables.flightStatus$ ?? of(null)))
        .subscribe(s => (flightStatus.value = s))
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
    unitGears,
    unitSpeed,
    unitRotation,
    position,
    flightStatus,
    warnings,
    hasAimTarget,
    powerInfo,
    weaponAutopilot,
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
    projectileHelper,
    canCustomize,
    isVehicle: computed(() => isVehicle(unit.value)),
    isAirVehicle: computed(() => isAirVehicle(unit.value)),
    isSeaVehicle: computed(() => isSeaVehicle(unit.value)),
    isGroundVehicle: computed(() => isGroundVehicle(unit.value))
  };
}
