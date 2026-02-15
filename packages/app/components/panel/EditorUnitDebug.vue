<template>
  <bm-panel
    v-if="unit"
    class="bm-panel-editor-unit-debug"
    title="Editor Unit Debug">
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '@blue-might/app/lib/classes/Unit';
import { markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';

import BmPanel from '../Panel.vue';

const unit = ref<Raw<Unit> | null>(null);

const $props = defineProps<{
  app: AppEditor;
}>();

const editorUnitDebugModule = $props.app.modules.editorUnitDebug;

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    editorUnitDebugModule.observables.unit$.subscribe(u => {
      unit.value = u ? markRaw(u) : null;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>
<style lang="postcss" scoped>
.bm-panel-editor-unit-debug {
  /* empty */
}
</style>
