<template>
  <div>
    <client-only>
      <app-component
        v-if="description"
        :config="config"
        :map="description"
        :on-setup="onSetup" />
    </client-only>
  </div>
</template>

<script lang="ts" setup>
import type { Raw } from 'vue';
import {
  defineAsyncComponent,
  markRaw,
  onUnmounted,
  ref,
  onMounted
} from 'vue';
import { HumanPlayer } from '@blue-might/app/lib/classes/player/Human';
import { Subscription } from 'rxjs';
import { APP_MODE, type AppConfig } from '@blue-might/app/lib/classes/BaseApp';
import type { App } from '@blue-might/app/lib/types';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { joinURL } from 'ufo';
import { getMapDescriptionFromArrayBuffer } from '@blue-might/app/utils/export';

import { useRoute, useRuntimeConfig } from '#imports';

const subscription = new Subscription();

const AppComponent = defineAsyncComponent(
  () => import('@blue-might/app/components/App.vue')
);

const config = ref<AppConfig>({
  mode: APP_MODE.PLAYGROUND,
  rendererOptions: {
    fog: true,
    pixelated: true,
    controls: true
  }
});

const $route = useRoute();
const $runtimeConfig = useRuntimeConfig();
const description = ref<Raw<MapDescription>>();
onMounted(async () => {
  const desc = await getMapDescriptionFromArrayBuffer(
    await fetch(
      joinURL(
        '/',
        $runtimeConfig.app.baseURL,
        String($route.query.map ?? 'extended_map.zip')
      )
    ).then(res => res.arrayBuffer())
  ).then(map => {
    map.debug = {
      // surface: true,
      // pathfinding: true
    };
    return map;
  });
  description.value = markRaw(desc);
});

async function onSetup(app: App) {
  await setupPlayer(app);
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

onUnmounted(() => {
  subscription.unsubscribe();
});
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
