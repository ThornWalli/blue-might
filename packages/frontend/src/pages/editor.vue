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
import {
  defineAsyncComponent,
  markRaw,
  onMounted,
  onUnmounted,
  ref,
  type Raw
} from 'vue';
// import { editorMap } from '@blue-might/maps';
import { Subscription } from 'rxjs';
import type BaseApp from '@blue-might/app/lib/classes/BaseApp';
import { APP_MODE, type AppConfig } from '@blue-might/app/lib/classes/BaseApp';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { getMapDescriptionFromArrayBuffer } from '@blue-might/app/utils/export';

const subscription = new Subscription();

const AppComponent = defineAsyncComponent(
  () => import('@blue-might/app/components/App.vue')
);

const description = ref<Raw<MapDescription>>();
onMounted(async () => {
  description.value = markRaw(
    await getMapDescriptionFromArrayBuffer(
      await fetch('editor_map.zip').then(res => res.arrayBuffer())
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

async function onSetup(_app: BaseApp) {
  //
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
