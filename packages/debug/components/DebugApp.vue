<template>
  <div>
    <app-component :config="appConfig" :map="map" :on-setup="onSetupApp" />
  </div>
</template>

<script setup lang="ts">
import type { AppConfig } from '@blue-might/app/lib/classes/BaseApp';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { HumanPlayer } from '@blue-might/app/lib/classes/player/Human';
import type { UnitIdentifier } from '@blue-might/app/lib/types/unit';
import { debugGroundMap, debugSeaMap } from '@blue-might/maps';
import { Subscription } from 'rxjs';
import { onUnmounted, defineAsyncComponent, markRaw } from 'vue';
import { defu } from 'defu';
import type { App } from '@blue-might/app/lib/types';
const subscription = new Subscription();

const $props = defineProps<{
  config?: Partial<AppConfig>;
  mapType?: 'ground' | 'sea';
  map?: Partial<MapDescription>;
  playerUnit?: UnitIdentifier;
  onSetup?: (context: { app: App }) => void;
}>();

const appConfig = defu($props.config ?? {}, {
  rendererOptions: {
    fog: false,
    pixelated: false,
    controls: true
  }
});
onUnmounted(() => {
  subscription.unsubscribe();
});
const map_ = $props.mapType === 'sea' ? debugSeaMap() : debugGroundMap();
const map: MapDescription = defu($props.map ?? {}, {
  ...map_,
  factions: [...map_.factions],
  units: [...map_.units]
}) as MapDescription;

const AppComponent = defineAsyncComponent(
  () => import('@blue-might/app/components/App.vue')
);

async function onSetupApp(app: App) {
  await setupPlayer(app);
  if ($props.onSetup) {
    $props.onSetup({
      app
    });
  }
}

async function setupPlayer(app: App) {
  if (!('player' in app.modules)) return;
  await app.modules.player.addPlayer(
    markRaw(
      new HumanPlayer(app, {
        name: 'Player'
      })
    )
  );
}
</script>

<style lang="postcss" scoped>
div {
  position: relative;
  height: 100vh;
  height: 100svh;
}

.bm-app {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
