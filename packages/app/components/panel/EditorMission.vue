<template>
  <bm-panel
    v-if="mission"
    class="bm-panel-editor-mission"
    title="Editor Mission">
    <bm-fieldset v-if="unit" label="Unit">
      <bm-toggle
        v-if="canRescue"
        :model-value="targetType === 'rescue'"
        label="Rescue"
        @update:model-value="
          app.modules.editorMission.setTarget('rescue', optional)
        " />
      <bm-toggle
        :model-value="targetType === 'attack'"
        label="Attack"
        @update:model-value="
          app.modules.editorMission.setTarget('attack', optional)
        " />
      <bm-toggle
        v-if="canRescue"
        :model-value="optional"
        label="Optional"
        @update:model-value="
          app.modules.editorMission.setTarget(targetType, $event)
        " />
    </bm-fieldset>
    <div v-else class="no-selected">No Unit selected</div>
  </bm-panel>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { Subscription } from 'rxjs';
import type Unit from '@blue-might/app/lib/classes/Unit';
import type Mission from '@blue-might/app/lib/classes/Mission';
import type { TargetType } from '@blue-might/app/lib/types/mission';

import BmPanel from '../Panel.vue';
import BmToggle from '../Toggle.vue';
import BmFieldset from '../Fieldset.vue';

const $props = defineProps<{
  app: AppEditor;
}>();

const mission = ref<Raw<Mission> | null>(null);
const unit = ref<Raw<Unit> | null>(null);
const targetType = ref<TargetType>('rescue');
const optional = ref(false);
const canAttack = ref(false);
const canRescue = ref(false);

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
  subscription.add(
    $props.app.modules.editorMission.observables.optional$.subscribe(v => {
      optional.value = v;
    })
  );
  subscription.add(
    $props.app.modules.editorMission.observables.availability$.subscribe(
      availability => {
        canAttack.value = availability.canAttack;
        canRescue.value = availability.canRescue;
      }
    )
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>
<style lang="postcss" scoped>
.bm-panel-editor-mission {
  & .no-selected {
    padding: var(--bm-spacing-medium) 0;
    font-family: var(--font-family-base);
    font-size: 12px;
    font-weight: bold;
    text-align: center;
    opacity: 0.6;
  }
}
</style>
