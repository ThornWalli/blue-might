<template>
  <bm-app-layout class="bm-app-playground">
    <template #[PANEL.BOTTOM_LEFT]>
      <div class="panel-column">
        <bm-panel-general
          ref="generalEl"
          key="general"
          show-import
          :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_LEFT]>
      <div class="panel-row">
        <bm-panel-map key="map" :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_RIGHT]>
      <div class="panel-row">
        <bm-panel-player-unit key="player-unit" :app="app" />
      </div>
    </template>
    <template #[PANEL.BOTTOM]>
      <bm-panel-gun-screen
        key="gun-screen"
        :app="app"
        @fullscreen="onFullscreenGunScreen" />
    </template>
    <template #[PANEL.BOTTOM_RIGHT]>
      <bm-panel-unit-preview key="unit-preview" :app="app" />
    </template>
    <template #background>
      <bm-head-up-indicator v-if="!hideIndicators" :app="app" />
    </template>
    <template #foreground>
      <bm-head-up-display-warning :app="app" />
      <bm-message
        v-if="messageType"
        :key="messageType"
        :type="messageType"
        :payload="messagePayload" />
    </template>
  </bm-app-layout>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import {
  EMPTY,
  filter,
  fromEvent,
  map as rxjsMap,
  merge,
  Subscription,
  switchMap,
  debounceTime,
  combineLatest,
  map
} from 'rxjs';
import { ControlAction } from '@blue-might/app/lib/classes/playerModule/Controls';

import type AppPlayground from '../../lib/classes/app/AppPlayground';
import BmAppLayout, { PANEL } from '../AppLayout.vue';
// import BmPanelDebug from '../panel/Debug.vue';
import BmPanelGeneral from '../panel/General.vue';
import BmPanelUnitPreview from '../panel/UnitPreview.vue';
import BmPanelPlayerUnit from '../panel/PlayerUnit.vue';
import BmPanelGunScreen from '../panel/GunScreen.vue';
import BmPanelMap from '../panel/NavigatorMap.vue';
import BmMessage, { MESSAGE_TYPE, type MESSAGE_PAYLOADS } from '../Message.vue';
import BmHeadUpDisplayWarning from '../HeadUpDisplayMessage.vue';
import BmHeadUpIndicator from '../HeadUpIndicator.vue';

const messageType = ref<MESSAGE_TYPE | null>(null);
const messagePayload = ref<MESSAGE_PAYLOADS | undefined>(undefined);
const generalEl = ref<InstanceType<typeof BmPanelGeneral> | null>(null);

const $props = defineProps<{
  app: AppPlayground;
}>();

//#region auto destroy
let autoDestroyInterval: NodeJS.Timeout | undefined = undefined;
let autoDestroySeconds = 0;
const MAX_DESTROY_SECONDS = 5;
//#endregion;

const subscription = new Subscription();

onMounted(() => {
  const app = $props.app;
  setupMessages(app);
});

onUnmounted(() => {
  subscription.unsubscribe();
});

const hideIndicators = ref(false);
function onFullscreenGunScreen(value: boolean) {
  hideIndicators.value = value;
}

function setupMessages(app: AppPlayground) {
  subscription.add(
    app.modules.map.observables.map$
      .pipe(
        switchMap(map =>
          map ? map.modules.mission.observables.mission$ : EMPTY
        ),
        filter(Boolean)
      )
      .subscribe(() => {
        generalEl.value?.openMissionBriefing();
      })
  );

  subscription.add(
    app.modules.player.observables.currentPlayer$
      .pipe(
        switchMap(player => player?.modules.vehicle.observables.unit$ ?? EMPTY),
        switchMap(
          unit =>
            unit?.observables.position$.pipe(
              map(position => ({ unit, position }))
            ) ?? EMPTY
        )
      )
      // eslint-disable-next-line complexity
      .subscribe(({ unit, position }) => {
        const map = unit.getMap();
        const min = map?.modules.surface.size
          .clone()
          .divideScalar(2)
          .multiplyScalar(-1);
        const max = min?.clone().multiplyScalar(-1);
        if (
          (min && max && position.x < min.x) ||
          (min && max && position.z < min.y) ||
          (min && max && position.x > max.x) ||
          (min && max && position.z > max.y)
        ) {
          if (!autoDestroyInterval) startAutoDestroyInterval();
        } else {
          if (autoDestroyInterval) stopAutoDestroyInterval();
        }
      })
  );

  function updateMessagePayload() {
    messagePayload.value = {
      duration: MAX_DESTROY_SECONDS - autoDestroySeconds
    };
  }

  function startAutoDestroyInterval() {
    messageType.value = MESSAGE_TYPE.OUT_OF_BOUNDS;
    autoDestroySeconds = 0;
    updateMessagePayload();
    autoDestroyInterval = setInterval(() => {
      autoDestroySeconds++;
      updateMessagePayload();
      if (autoDestroySeconds >= MAX_DESTROY_SECONDS) {
        clearInterval(autoDestroyInterval);
        autoDestroyInterval = undefined;
        const damageModule = app.modules.player
          .getCurrentPlayer()
          .modules.vehicle.getUnit()?.modules.damage;

        damageModule?.setDamage(damageModule.getMaxDamage());
      }
    }, 1000);
  }

  function stopAutoDestroyInterval() {
    clearInterval(autoDestroyInterval);
    autoDestroyInterval = undefined;
    messageType.value = null;
  }

  subscription.add(
    combineLatest([
      app.modules.player.observables.currentPlayer$,
      app.modules.map.observables.map$
    ])
      .pipe(
        switchMap(([player, map]) => {
          return merge(
            player?.modules.vehicle.observables.unit$.pipe(
              switchMap(u =>
                !map?.modules.mission.isFailed() && u
                  ? u.modules.damage.observables.destroyed$.pipe(
                      rxjsMap(() =>
                        player.modules.life.isGameOver()
                          ? MESSAGE_TYPE.DESTROYED_GAME_OVER
                          : MESSAGE_TYPE.DESTROYED_RESTART
                      )
                    )
                  : EMPTY
              )
            ) ?? EMPTY,
            map?.modules.mission.observables.complete$.pipe(
              rxjsMap(() => MESSAGE_TYPE.MISSION_COMPLETE)
            ) ?? EMPTY,
            map?.modules.mission.observables.failed$.pipe(
              rxjsMap(() => MESSAGE_TYPE.MISSION_FAILED)
            ) ?? EMPTY
          ).pipe(
            debounceTime(500),
            switchMap(type =>
              app.modules.player.observables.currentPlayer$.pipe(
                rxjsMap(player => ({ type, player }))
              )
            )
          );
        })
      )
      .subscribe(({ type, player }) => {
        messageType.value = type;

        subscription_?.unsubscribe();
        subscription_ = merge(
          player.modules.controls.observables.controls$.pipe(
            rxjsMap(controls => controls[ControlAction.RESTART]),
            filter(Boolean)
          ) ?? EMPTY,
          fromEvent(document, 'click').pipe(rxjsMap(() => true))
        ).subscribe(async () => {
          messageType.value = null;
          if (type !== MESSAGE_TYPE.DESTROYED_RESTART) {
            app.modules.player
              .getCurrentPlayer()
              .modules.vehicle.setVehicleUnit(null);
            await app.modules.map.restartMap();
          } else {
            await app.modules.player.respawnPlayer();
          }
          subscription_?.unsubscribe();
          subscription_ = null;
        });
        subscription.add(subscription_);
      })
  );

  let subscription_: Subscription | null = null;
}
</script>

<style lang="postcss" scoped>
.bm-app-playground {
  --panel-offset: 1em;

  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  pointer-events: none;

  & .bm-renderer {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
  }
}

.message {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
