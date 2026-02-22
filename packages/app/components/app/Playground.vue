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
      <bm-panel-secondary-screen key="secondary-screen" :app="app" />
    </template>
    <template #[PANEL.BOTTOM_RIGHT]>
      <bm-panel-unit-preview key="unit-preview" :app="app" />
    </template>
    <template #foreground>
      <bm-message v-if="messageType" :type="messageType" />
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
  switchMap
} from 'rxjs';
import { ControlAction } from '@blue-might/app/lib/classes/playerModule/Controls';

import type AppPlayground from '../../lib/classes/app/AppPlayground';
import BmAppLayout, { PANEL } from '../AppLayout.vue';
// import BmPanelDebug from '../panel/Debug.vue';
import BmPanelGeneral from '../panel/General.vue';
import BmPanelUnitPreview from '../panel/UnitPreview.vue';
import BmPanelPlayerUnit from '../panel/PlayerUnit.vue';
import BmPanelSecondaryScreen from '../panel/GunScreen.vue';
import BmPanelMap from '../panel/Map.vue';
import BmMessage, { MESSAGE_TYPE } from '../Message.vue';

const messageType = ref<MESSAGE_TYPE | null>(null);
const generalEl = ref<InstanceType<typeof BmPanelGeneral> | null>(null);

const $props = defineProps<{
  app: AppPlayground;
}>();

const subscription = new Subscription();

onMounted(() => {
  const app = $props.app;
  setupMessages(app);
});

onUnmounted(() => {
  subscription.unsubscribe();
});

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
        switchMap(unit => unit?.modules.damage.observables.destroyed$ ?? EMPTY),
        switchMap(() => app.modules.player.observables.currentPlayer$ ?? EMPTY)
      )
      .subscribe(player => {
        const subscription = merge(
          player?.modules.controls.observables.controls$.pipe(
            rxjsMap(controls => controls[ControlAction.RESTART]),
            filter(Boolean)
          ) ?? EMPTY,
          fromEvent(document, 'click').pipe(rxjsMap(() => true))
        ).subscribe(async () => {
          if (player.modules.life.isGameOver()) {
            await app.modules.map.restartMap();
          } else {
            await app.modules.player.respawnPlayer();
          }
          subscription.unsubscribe();
        });
        subscription.add(subscription);
      })
  );

  subscription.add(
    app.modules.player.observables.currentPlayer$
      .pipe(
        switchMap(player =>
          player
            ? merge(
                player.modules.vehicle.observables.unit$.pipe(filter(Boolean)),
                player.modules.vehicle.observables.unit$.pipe(
                  switchMap(
                    unit => unit?.modules.damage.observables.destroyed$ ?? EMPTY
                  )
                )
              )
            : EMPTY
        )
      )
      .subscribe(() => {
        const player = app.modules.player.getCurrentPlayer();
        const unit = player.modules.vehicle.getCurrentUnit();

        if (unit?.modules.damage.isDestroyed()) {
          if (player.modules.life.isGameOver()) {
            messageType.value = MESSAGE_TYPE.DESTROYED_GAME_OVER;
          } else {
            messageType.value = MESSAGE_TYPE.DESTROYED_RESTART;
          }
        } else {
          messageType.value = null;
        }
      })
  );

  subscription.add(
    app.modules.player.observables.currentPlayer$
      .pipe(
        switchMap(player =>
          app.modules.map.observables.map$.pipe(
            switchMap(
              map =>
                map?.modules.mission.observables.complete$.pipe(
                  rxjsMap(() => player)
                ) ?? EMPTY
            )
          )
        )
      )
      .subscribe(async player => {
        messageType.value = MESSAGE_TYPE.MISSION_COMPLETE;
        const subscription = merge(
          player?.modules.controls.observables.controls$.pipe(
            rxjsMap(controls => controls[ControlAction.RESTART]),
            filter(Boolean)
          ) ?? EMPTY,
          fromEvent(document, 'click').pipe(rxjsMap(() => true))
        ).subscribe(async () => {
          messageType.value = null;
          await app.modules.map.restartMap();
          subscription.unsubscribe();
        });
        subscription.add(subscription);
      })
  );
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
