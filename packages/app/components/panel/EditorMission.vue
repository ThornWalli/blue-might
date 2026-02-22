<template>
  <bm-panel
    v-if="mission"
    class="bm-panel-editor-mission"
    title="Editor Mission">
    <bm-fieldset v-if="unit" label="Unit">
      <bm-toggle
        :model-value="targetType === 'rescue'"
        label="Rescue"
        @update:model-value="
          app.modules.editorMission.setTargetType('rescue')
        " />
      <bm-toggle
        :model-value="targetType === 'attack'"
        label="Attack"
        @update:model-value="
          app.modules.editorMission.setTargetType('attack')
        " />
    </bm-fieldset>
    <div v-else>No Unit selected</div>
  </bm-panel>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { Subscription } from 'rxjs';
import type { TargetType } from '@blue-might/app/lib/classes/Mission';
import type Unit from '@blue-might/app/lib/classes/Unit';
import type Mission from '@blue-might/app/lib/classes/Mission';

import BmPanel from '../Panel.vue';
import BmToggle from '../Toggle.vue';
import BmFieldset from '../Fieldset.vue';

const $props = defineProps<{
  app: AppEditor;
}>();

const mission = ref<Raw<Mission> | null>(null);
const unit = ref<Raw<Unit> | null>(null);
const targetType = ref<TargetType>('rescue');

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    $props.app.modules.editorMission.observables.mission$.subscribe(v => {
      mission.value = v ? markRaw(v) : null;
    })
  );
  subscription.add(
    $props.app.modules.editorMission.observables.unit$.subscribe(v => {
      unit.value = v ? markRaw(v) : null;
    })
  );
  subscription.add(
    $props.app.modules.editorMission.observables.targetType$.subscribe(v => {
      targetType.value = v;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>
<style lang="postcss" scoped>
.bm-panel-editor-mission {
  /* empty */
}
</style>
