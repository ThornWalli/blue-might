<template>
  <bm-panel class="bm-panel-attitude-indicator" title="Attitude Indicator">
    <bm-attitude-indicator :app="$props.app" />
  </bm-panel>
</template>

<script lang="ts" setup>
import type App from '@blue-might/app/lib/classes/App';

import BmPanel from '../Panel.vue';
import BmAttitudeIndicator from '../AttitudeIndicator.vue';

const $props = defineProps<{
  app: App;
}>();
</script>

<style lang="postcss" scoped>
.bm-panel-attitude-indicator {
  width: 120px;
}
</style>
