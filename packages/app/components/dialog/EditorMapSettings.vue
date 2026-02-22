<template>
  <form
    class="bm-dialog-editor-map-settings"
    @submit="onSubmit"
    @reset="onReset">
    <bm-fieldset label="General">
      <bm-form-field v-slot="{ id }" label="Map Name">
        <bm-textfield v-model="meta.name" :el-attrs="{ id }"></bm-textfield>
      </bm-form-field>
      <bm-form-field v-slot="{ id }" label="Map Description">
        <bm-textarea
          v-model="meta.description"
          :el-attrs="{ id }"></bm-textarea>
      </bm-form-field>
    </bm-fieldset>
    <bm-fieldset label="Fog Options">
      <bm-form-field v-slot="{ id }" label="Enable Fog">
        <bm-toggle v-model="fogOptions.enabled" :el-attrs="{ id }" />
      </bm-form-field>
      <bm-form-field v-slot="{ id }" label="Fog Distance">
        <bm-textfield
          v-model="fogOptions.fogDistance"
          :el-attrs="{ type: 'number', id }" />
      </bm-form-field>
      <bm-form-field v-slot="{ id }" label="Fog Color">
        <bm-color-picker v-model="fogOptions.color" :el-attrs="{ id }" />
      </bm-form-field>
    </bm-fieldset>
    <div class="controls">
      <bm-button label="Abort" type="reset" />
      <div class="spacer"></div>
      <bm-button label="Debug" type="button" @click="onClickDebug" />
      <bm-button label="Apply" type="submit" />
    </div>
    <teleport to="body">
      <bm-dialog ref="unitDebugDialog">
        <template #header>Unit Debug</template>
        <template #default>
          <bm-dialog-editor-map-debug :app="$props.app" />
        </template>
      </bm-dialog>
    </teleport>
  </form>
</template>

<script lang="ts" setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { Meta, RawFogOptions } from '@blue-might/app/lib/types/map';
import { Color } from 'three';

import type { DialogContext } from '../base/Dialog.vue';
import BmTextfield from '../Textfield.vue';
import BmTextarea from '../Textarea.vue';
import BmFormField from '../FormField.vue';
import BmButton from '../Button.vue';
import BmFieldset from '../Fieldset.vue';
import BmToggle from '../Toggle.vue';
import BmColorPicker from '../ColorPicker.vue';
import BmDialog from '../Dialog.vue';
import BmDialogEditorMapDebug from '../dialog/EditorMapDebug.vue';

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
const fogOptions = ref<RawFogOptions<string>>({
  enabled: false,
  fogDistance: 30,
  color: '#ffffff'
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
  subscription.add(
    editorMapSettingsModule.observables.fogOptions$.subscribe(options => {
      fogOptions.value = {
        ...options,
        color: '#' + options.color.getHexString()
      };
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onSubmit(e: Event) {
  e.preventDefault();

  editorMapSettingsModule.setMeta(meta.value);
  editorMapSettingsModule.setFogOptions({
    ...fogOptions.value,
    color: new Color(fogOptions.value.color)
  });

  dialog.close();
}

function onReset() {
  dialog.close();
}

const unitDebugDialog = ref<InstanceType<typeof BmDialog> | null>(null);
function onClickDebug() {
  unitDebugDialog.value?.context?.open();
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
