<template>
  <bm-panel class="bm-panel-controls" title="Debug">
    <bm-debug :app="app" />
  </bm-panel>
</template>

<script lang="ts" setup>
import type { App } from '@blue-might/app/lib/types';

import BmDebug from '../Debug.vue';
import BmPanel from '../Panel.vue';

defineProps<{
  app: App;
}>();
</script>

<style lang="postcss" scoped>
:deep(p) {
  font-size: var(--bm-font-size-small);
  line-height: 1.4;
}
</style>
