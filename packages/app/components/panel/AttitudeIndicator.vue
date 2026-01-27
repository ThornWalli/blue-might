<template>
  <bm-panel class="bm-panel-attitude-indicator" title="Attitude Indicator">
    <bm-attitude-indicator :app="$props.app" />
  </bm-panel>
</template>

<script lang="ts" setup>
import type AppPlayground from '@blue-might/app/lib/classes/app/AppPlayground';

import BmPanel from '../Panel.vue';
import BmAttitudeIndicator from '../AttitudeIndicator.vue';

const $props = defineProps<{
  app: AppPlayground;
}>();
</script>

<style lang="postcss" scoped>
.bm-panel-attitude-indicator {
  width: 120px;
}
</style>
