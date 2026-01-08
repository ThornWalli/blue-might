<template>
  <div class="bm-debug">
    <bm-debug-pages />
    <bm-debug-controls :app="app" />
    <bm-debug-markers :app="app" />
    <bm-debug-move :app="app" />
    <bm-debug-effect :app="app" />
  </div>
</template>

<script lang="ts" setup>
import type App from '../lib/classes/App';

import BmDebugPages from './debug/Pages.vue';
import BmDebugControls from './debug/Controls.vue';
import BmDebugMarkers from './debug/Markers.vue';
import BmDebugMove from './debug/Move.vue';
import BmDebugEffect from './debug/Effect.vue';

const _$props = defineProps<{
  app: App;
}>();
</script>
