<template>
  <div>
    <client-only>
      <app-component
        :config="config"
        :map="extendedMap()"
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
import { extendedMap } from '@blue-might/maps';
import { HumanPlayer } from '@blue-might/app/lib/classes/player/Human';
import { Subscription } from 'rxjs';
import { APP_MODE, type AppConfig } from '@blue-might/app/lib/classes/BaseApp';
import type { App } from '@blue-might/app/lib/types';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { joinURL } from 'ufo';
import { getMapDescriptionFromArrayBuffer } from '@blue-might/app/utils/export';

import { useRuntimeConfig } from '#imports';

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
  },
  debug: {
    map: {
      pathfinding: false
    }
  }
});

const runtimeConfig = useRuntimeConfig();
const description = ref<Raw<MapDescription>>();
onMounted(async () => {
  description.value = markRaw(
    await getMapDescriptionFromArrayBuffer(
      await fetch(
        joinURL('/', runtimeConfig.app.baseURL, 'extended_map.zip')
      ).then(res => res.arrayBuffer())
    )
  );
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
