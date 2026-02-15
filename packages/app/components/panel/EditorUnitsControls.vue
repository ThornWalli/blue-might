<template>
  <bm-panel
    v-if="mode === EDITOR_MODE.UNITS"
    hide-title
    class="bm-panel-editor-units-controls"
    title="Editor Units Control">
    <bm-toggle
      label="Auto apply"
      :model-value="autoApply"
      @input="editorUnitsModule.setAutoApply($event)" />
    <p>If the radius is 0, <br />a single unit will be added.</p>
    <bm-form-field label-top label="Spread/Remove Radius">
      <bm-textfield
        :model-value="actionRadius"
        :input-attrs="{ type: 'number', step: 0.5, min: 0 }"
        @update:model-value="editorUnitsModule.setActionRadius($event)" />
    </bm-form-field>
    <bm-form-field label-top label="Intensity">
      <bm-textfield
        :model-value="actionIntensity"
        :input-attrs="{ type: 'number', step: 0.5, min: 0 }"
        @update:model-value="editorUnitsModule.setActionIntensity($event)" />
    </bm-form-field>
    <bm-toggle
      label="Add"
      :model-value="action === ACTION.ADD"
      @input="$event && editorUnitsModule.setAction(ACTION.ADD)" />
    <bm-toggle
      label="Remove"
      :model-value="action === ACTION.REMOVE"
      @input="$event && editorUnitsModule.setAction(ACTION.REMOVE)" />
  </bm-panel>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';
import { ACTION } from '@blue-might/app/lib/classes/appModule/EditorUnits';

import BmPanel from '../Panel.vue';
import BmToggle from '../Toggle.vue';
import BmFormField from '../FormField.vue';
import BmTextfield from '../Textfield.vue';

const autoApply = ref<boolean>(false);
const action = ref<ACTION>(ACTION.ADD);
const actionRadius = ref<number>(0);
const actionIntensity = ref<number>(0);

const subscription = new Subscription();
const $props = defineProps<{
  app: AppEditor;
  mode: EDITOR_MODE;
}>();

const editorUnitsModule = $props.app.modules.editorUnits;

onMounted(() => {
  subscription.add(
    editorUnitsModule.observables.autoApply$.subscribe(lu => {
      autoApply.value = lu;
    })
  );
  subscription.add(
    editorUnitsModule.observables.action$.subscribe(a => {
      action.value = a;
    })
  );
  subscription.add(
    editorUnitsModule.observables.actionRadius$.subscribe(a => {
      actionRadius.value = a;
    })
  );
  subscription.add(
    editorUnitsModule.observables.actionIntensity$.subscribe(i => {
      actionIntensity.value = i;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>
<style lang="postcss" scoped>
.bm-panel-editor-units-controls {
  & p {
    font-family: var(--font-family-base);
    font-size: 12px;
    font-style: italic;
    background-color: rgb(255 255 255 / 10%);
  }
}
</style>
