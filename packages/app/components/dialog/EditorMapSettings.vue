<template>
  <form class="bm-dialog-editor-map-settings" @submit="onSubmit">
    <bm-fieldset label="General">
      <bm-form-field label="Map Name">
        <bm-textfield v-model="meta.name"></bm-textfield>
      </bm-form-field>
      <bm-form-field label="Map Description">
        <bm-textarea v-model="meta.description"></bm-textarea>
      </bm-form-field>
    </bm-fieldset>
    <div class="controls">
      <bm-button label="Abort" @click="onClickAbort" />
      <div class="spacer"></div>
      <bm-button label="Apply" type="submit" />
    </div>
  </form>
</template>

<script lang="ts" setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { Meta } from '@blue-might/app/lib/classes/Map';

import type { DialogContext } from '../base/Dialog.vue';
import BmTextfield from '../Textfield.vue';
import BmTextarea from '../Textarea.vue';
import BmFormField from '../FormField.vue';
import BmButton from '../Button.vue';
import BmFieldset from '../Fieldset.vue';

const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: AppEditor;
}>();
const editorMapSettingsModule = $props.app.modules.editorMapSettings;

const subscription = new Subscription();

const meta = ref<
  Meta & {
    description: string;
  }
>({
  name: 'Default Map',
  description: ''
});
onMounted(() => {
  subscription.add(
    editorMapSettingsModule.observables.meta$.subscribe(m => {
      meta.value = {
        ...m,
        description: m?.description ?? meta.value.description
      };
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onSubmit(e: Event) {
  e.preventDefault();
  if (meta.value) {
    editorMapSettingsModule.setMeta(meta.value);
    dialog.close();
  }
}

function onClickAbort() {
  dialog.close();
}
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-map-settings {
  width: 400px;

  & .controls {
    display: flex;
    gap: var(--bm-spacing-medium);
    justify-content: space-between;
    padding: var(--bm-spacing-medium);
    margin-top: var(--bm-spacing-medium);
  }
}

:deep(.bm-form-field label) {
  width: 120px;
}

.spacer {
  flex: 1;
}
</style>
