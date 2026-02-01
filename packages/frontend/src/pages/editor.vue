<template>
  <div>
    <client-only>
      <app-component v-if="description" :config="config" :map="description" />
    </client-only>
  </div>
</template>

<script lang="ts" setup>
import type { Raw } from 'vue';
import { defineAsyncComponent, markRaw, onMounted, ref } from 'vue';
import { APP_MODE, type AppConfig } from '@blue-might/app/lib/classes/BaseApp';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { getMapDescriptionFromArrayBuffer } from '@blue-might/app/utils/export';
import { joinURL } from 'ufo';

import { useRoute, useRuntimeConfig } from '#imports';

const $route = useRoute();

const AppComponent = defineAsyncComponent(
  () => import('@blue-might/app/components/App.vue')
);

const $runtimeConfig = useRuntimeConfig();
const description = ref<Raw<MapDescription>>();
onMounted(async () => {
  description.value = markRaw(
    await getMapDescriptionFromArrayBuffer(
      await fetch(
        joinURL(
          '/',
          $runtimeConfig.app.baseURL,
          String($route.query.map ?? 'editor_map.zip')
        )
      ).then(res => res.arrayBuffer())
    )
  );
});

const config = ref<AppConfig>({
  mode: APP_MODE.EDITOR,
  rendererOptions: {
    fog: false,
    pixelated: false,
    controls: true
  }
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
