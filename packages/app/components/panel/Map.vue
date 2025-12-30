<template>
  <bm-panel class="bm-panel-map" title="Map">
    <bm-map :app="app" />
  </bm-panel>
</template>

<script lang="ts" setup>
import BmPanel from '../Panel.vue';
import type App from '../../lib/classes/App';
import BmMap from '../Map.vue';

defineProps<{
  app: App;
}>();
</script>
