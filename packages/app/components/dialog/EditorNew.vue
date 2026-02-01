<template>
  <div class="bm-dialog-new">
    <form @submit="onSubmit">
      <bm-form-field v-slot="{ id }" label="Name">
        <bm-textfield :id="id" v-model="name" />
      </bm-form-field>
      <bm-form-field v-slot="{ id }" label="Background Color">
        <bm-color-picker :id="id" v-model="backgroundColor" />
      </bm-form-field>
      <bm-form-field v-slot="{ id }" label="Width">
        <bm-textfield
          :id="id"
          v-model="width"
          :input-attrs="{ type: 'number' }"
          unit="px" />
      </bm-form-field>
      <bm-form-field v-slot="{ id }" label="Height">
        <bm-textfield
          :id="id"
          v-model="height"
          :input-attrs="{ type: 'number' }"
          unit="px" />
      </bm-form-field>
      <bm-button type="submit" label="Create" />
    </form>
  </div>
</template>

<script lang="ts" setup>
import { inject, ref } from 'vue';
import type { App } from '@blue-might/app/lib/types';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import factions from '@blue-might/app/lib/utils/factions';

import type { DialogContext } from '../base/Dialog.vue';
import BmFormField from '../FormField.vue';
import BmTextfield from '../Textfield.vue';
import BmColorPicker from '../ColorPicker.vue';
import BmButton from '../Button.vue';

const dialog = inject<DialogContext>('dialog')!;

const name = ref('New Map');
const backgroundColor = ref('#4f711c');
const width = ref(24);
const height = ref(24);

const $props = defineProps<{
  app: App;
}>();

async function createMap({
  name,
  width,
  height,
  backgroundColor
}: {
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  //#region background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  const background = await new Promise<Blob>(resolve =>
    canvas.toBlob(blob => resolve(blob!))
  );
  //#endregion

  //#region heightMap
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, width, height);
  const heightMap = await new Promise<Blob>(resolve =>
    canvas.toBlob(blob => resolve(blob!))
  );
  //#endregion

  //#region foreground
  ctx.clearRect(0, 0, width, height);
  const ratio = height / width;
  canvas.width = 2048;
  canvas.height = 2048 * ratio;
  console.log(canvas.width, canvas.height);
  const foreground = await new Promise<Blob>(resolve =>
    canvas.toBlob(blob => resolve(blob!))
  );
  //#endregion

  const mapDescription: MapDescription = {
    meta: { name },
    playerOptions: {
      unit: {
        key: 'combat_helicopter_1'
      },
      faction: factions.neutral.id,
      position: [0, 0, 0]
    },
    factions: [structuredClone(factions.neutral)],
    surface: {
      textures: {
        backgroundTexture: await URL.createObjectURL(background),
        heightMap: await URL.createObjectURL(heightMap),
        foregroundTexture: await URL.createObjectURL(foreground)
      }
    },
    units: []
  };

  await $props.app.modules.map.enterMap(mapDescription);
}

async function onSubmit(e: Event) {
  e.preventDefault();
  await createMap({
    name: name.value,
    width: width.value,
    height: height.value,
    backgroundColor: backgroundColor.value
  });
  dialog.close();
}
</script>

<style lang="postcss" scoped>
.bm-dialog-new {
  width: 240px;

  & form {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-medium);
  }
}

:deep(.bm-form-field label) {
  width: 140px;
}
</style>
