<template>
  <div>
    <client-only>
      <app :config="config" />
    </client-only>
  </div>
</template>

<script lang="ts" setup>
import type { AppConfig } from '@blue-might/app/lib/classes/App';
import { defineAsyncComponent, ref } from 'vue';

const App = defineAsyncComponent(
  () => import('@blue-might/app/components/App.vue')
);

const config = ref<AppConfig>({});
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
