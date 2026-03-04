<template>
  <bm-panel
    v-if="unit"
    class="bm-panel-editor-unit-info"
    title="Editor Unit Info">
    <bm-details label="Position">
      <bm-control-item
        label="X"
        :value="(unitPosition?.[0] ?? 'N/A').padStart(7, '&nbsp;')" />
      <bm-control-item
        label="Y"
        :value="(unitPosition?.[1] ?? 'N/A').padStart(7, '&nbsp;')" />
      <bm-control-item
        label="Z"
        :value="(unitPosition?.[2] ?? 'N/A').padStart(7, '&nbsp;')" />
    </bm-details>
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '@blue-might/app/lib/classes/Unit';
import { onMounted, ref, type Raw } from 'vue';
import { EMPTY, Subscription, switchMap } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';

import BmPanel from '../Panel.vue';
import BmDetails from '../Details.vue';
import BmControlItem from '../element/ControlItem.vue';

const unit = ref<Raw<Unit> | null>(null);
const unitPosition = ref<Raw<[string, string, string]> | null>(null);

const $props = defineProps<{
  app: AppEditor;
  mode: EDITOR_MODE;
}>();

const editorUnitsModule = $props.app.modules.editorUnits;

const subscription = new Subscription();
onMounted(() => {
  const unit$ = editorUnitsModule.observables.unit$;
  subscription.add(
    unit$.subscribe(u => {
      unit.value = u;
    })
  );
  subscription.add(
    unit$
      .pipe(switchMap(u => (u ? u.observables.position$ : EMPTY)))
      .subscribe(pos => {
        unitPosition.value = [
          pos.x.toFixed(2),
          pos.y.toFixed(2),
          pos.z.toFixed(2)
        ];
      })
  );
});
</script>
<style lang="postcss" scoped>
.bm-panel-editor-unit-settings {
  & .damage {
    & .bm-textfield {
      flex: 1;
    }

    & span {
      flex: 0;
      font-family: var(--font-family-base);
      font-size: 12px;
      white-space: nowrap;
    }
  }
}
</style>
