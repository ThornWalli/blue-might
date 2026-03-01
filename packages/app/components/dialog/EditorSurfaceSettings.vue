<template>
  <div class="bm-dialog-editor-surface-settings">
    <bm-fieldset label="Texture">
      <div class="textures">
        <figure
          v-for="{ key, path, texture } in previewItems"
          :key="`${key}_${texture.id}`">
          <div>
            <img :src="path" alt="Surface Texture" />
          </div>
          <figcaption>
            <div>
              {{ key }}<br />
              {{ texture.width }} / {{ texture.height }} Pixel
            </div>
            <div class="buttons">
              <bm-button
                :icon="ICON.ARROW_UP_TRAY"
                hide-label
                label="Download"
                @click="onClickDownload(key)" />
              <bm-button-upload
                :icon="ICON.ARROW_DOWN_TRAY"
                hide-label
                label="Upload"
                @files="onFiles(key, $event)" />
            </div>
          </figcaption>
        </figure>
        <figure>
          <div>
            <img
              v-for="{ key, path } in previewItems"
              :key="key"
              :class="{ 'height-map': key === 'heightMap' }"
              :src="path"
              :alt="`Surface Texture (${key})`" />
          </div>
          <figcaption>Preview</figcaption>
        </figure>
      </div>
    </bm-fieldset>
    <form @submit="onSubmit" @reset="onReset">
      <bm-fieldset label="Background">
        <div class="form-fields">
          <bm-toggle
            :model-value="heightMapOptions.include ?? false"
            label="HeightMap in Background"
            @update:model-value="
              editorSurfaceModule.setHeightMapOptions({ include: $event })
            " />
        </div>
      </bm-fieldset>

      <bm-fieldset label="Water Options">
        <div class="form-fields col-2">
          <bm-form-field v-slot="{ id }" label="Enable Water">
            <bm-toggle
              :model-value="waterOptions.enabled"
              :el-attrs="{ id }"
              @update:model-value="
                editorSurfaceModule.setWaterOptions({ enabled: $event })
              " />
          </bm-form-field>
          <bm-form-field v-slot="{ id }" label="Water Color">
            <bm-color-picker
              :model-value="waterOptions.color"
              :el-attrs="{ id }"
              @update:model-value="
                editorSurfaceModule.setWaterOptions({
                  color: new Color($event)
                })
              " />
          </bm-form-field>
          <bm-form-field v-slot="{ id }" label="Water Level">
            <bm-textfield
              v-model="waterOptions.waterLevel"
              :el-attrs="{ type: 'number', id }"
              @update:model-value="
                editorSurfaceModule.setWaterOptions({ waterLevel: $event })
              " />
          </bm-form-field>
          <bm-form-field v-slot="{ id }" label="Water Opacity">
            <bm-textfield
              v-model="waterOptions.opacity"
              :el-attrs="{ type: 'number', id }"
              @update:model-value="
                editorSurfaceModule.setWaterOptions({ opacity: $event })
              " />
          </bm-form-field>
        </div>
      </bm-fieldset>

      <bm-fieldset label="Noise">
        <div class="form-fields col-2">
          <bm-toggle
            :model-value="noiseOptions.enable"
            label="Enable Noise"
            @update:model-value="
              editorSurfaceModule.setNoiseOptions({ enable: $event })
            " />
          <bm-toggle
            :model-value="noiseOptions.monochrome"
            label="Enable Noise Monochrome"
            @update:model-value="
              editorSurfaceModule.setNoiseOptions({ monochrome: $event })
            " />
          <bm-form-field label="Noise Size">
            <bm-textfield
              :el-attrs="{ type: 'number', step: '1' }"
              :model-value="noiseOptions.size"
              @update:model-value="
                editorSurfaceModule.setNoiseOptions({ size: $event })
              " />
          </bm-form-field>

          <bm-form-field label="Noise Intensity">
            <bm-textfield
              :el-attrs="{ type: 'number', step: '0.01' }"
              :model-value="noiseOptions.intensity"
              @update:model-value="
                editorSurfaceModule.setNoiseOptions({ intensity: $event })
              " />
          </bm-form-field>

          <bm-form-field label="Noise Opacity">
            <bm-textfield
              :el-attrs="{ type: 'number', step: '0.01' }"
              :model-value="noiseOptions.opacity"
              @update:model-value="
                editorSurfaceModule.setNoiseOptions({ opacity: $event })
              " />
          </bm-form-field>
        </div>
      </bm-fieldset>
      <div class="buttons">
        <bm-button label="Abort" type="reset" />
        <bm-button label="Apply" type="submit" />
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { Color, Texture } from 'three';
import type { TextureDescription } from '@blue-might/app/lib/classes/appModule/EditorSurface';
import { ICON } from '@blue-might/app/utils/icons';
import { imageBitmapToBlob } from '@blue-might/app/utils/blob';
import {
  DEFAULT_MAP_HEIGHT_MAP,
  DEFAULT_MAP_NOISE,
  type MapHeightMap,
  type MapNoise,
  type RawWaterOptions
} from '@blue-might/app/lib/types/map';

import BmFieldset from '../Fieldset.vue';
import BmButton from '../Button.vue';
import BmButtonUpload from '../button/Upload.vue';
import BmToggle from '../Toggle.vue';
import BmTextfield from '../Textfield.vue';
import BmColorPicker from '../ColorPicker.vue';
import BmFormField from '../FormField.vue';
import type { DialogContext } from '../base/Dialog.vue';

const dialog = inject<DialogContext>('dialog')!;

const textures = ref<TextureDescription[]>([]);
const heightMapOptions = ref<MapHeightMap>(DEFAULT_MAP_HEIGHT_MAP);
const noiseOptions = ref<MapNoise>(DEFAULT_MAP_NOISE);

const $props = defineProps<{
  app: AppEditor;
}>();

const subscription = new Subscription();

const editorSurfaceModule = $props.app.modules.editorSurface;

onMounted(() => {
  subscription.add(
    editorSurfaceModule.observables.textures$.subscribe(v => {
      textures.value = v;
      refreshTexturePreview();
    })
  );
  subscription.add(
    editorSurfaceModule.observables.heightMapOptions$.subscribe(v => {
      heightMapOptions.value = v;
    })
  );
  subscription.add(
    editorSurfaceModule.observables.noiseOptions$.subscribe(v => {
      noiseOptions.value = v;
    })
  );
  subscription.add(
    editorSurfaceModule.observables.waterOptions$.subscribe(v => {
      waterOptions.value = {
        ...v,
        color: `#${v.color.getHexString()}`
      };
    })
  );
});

const waterOptions = ref<RawWaterOptions<string>>({
  enabled: false,
  color: '#004080',
  waterLevel: 0,
  opacity: 0.9
});

const previewItems = ref<
  (TextureDescription & {
    path: string;
  })[]
>([]);
async function refreshTexturePreview() {
  const items = await Promise.all(
    textures.value.map(async ({ key, texture }) => {
      return {
        key,
        path: URL.createObjectURL(await imageBitmapToBlob(texture.image)),
        texture
      };
    })
  );
  previewItems.value = [
    items[1]!, // backgroundTexture
    items[0]!, // heightMap
    items[2]! // foregroundTexture
  ];
}

onUnmounted(() => {
  subscription.unsubscribe();
});

async function onClickDownload(key: string) {
  const item = previewItems.value.find(i => i.key === key);
  if (item) {
    const { saveAs } = await import('file-saver');
    await saveAs(item.path, `${key}.png`);
  }
}

function onFiles(key: string, files: FileList) {
  const file = files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.onload = async () => {
        const texture = new Texture(await createImageBitmap(img));
        texture.needsUpdate = true;

        const newTextures = [...textures.value];
        const index = newTextures.findIndex(t => t.key === key)!;
        if (newTextures[index]) {
          newTextures[index] = {
            ...newTextures[index],
            texture
          };
        }
        $props.app.modules.editorSurface.setTextures(newTextures);
      };
      img.src = (event.target as FileReader).result as string;
    };
    reader.readAsDataURL(file);
  }
}

async function onSubmit(e: Event) {
  e.preventDefault();
  await $props.app.modules.editorSurface.apply();
  dialog.close();
}

function onReset() {
  dialog.close();
}
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-surface-settings {
  &,
  & form {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-medium);
  }

  & .textures {
    display: flex;
    flex-direction: row;
    gap: var(--bm-spacing-small);

    & > figure {
      margin: 0;
    }
  }

  & figure {
    & > div {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--bm-spacing-small);
      width: 128px;

      &::before {
        display: block;
        padding-top: 100%;
        content: '';
      }
    }

    & figcaption {
      display: flex;
      flex-direction: column;
      gap: var(--bm-spacing-small);
      font-family: var(--font-family-base);
      font-size: 12px;
      text-align: center;
    }
  }

  & input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  & img {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border: solid #000 4px;

    &.height-map {
      mix-blend-mode: multiply;
    }
  }

  & .buttons {
    display: flex;
    gap: var(--bm-spacing-medium);

    & > * {
      flex: 1;
    }

    figure & {
      gap: 0;
    }
  }

  & .form-fields {
    --cols: 1;

    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: var(--bm-spacing-medium);
    margin: var(--bm-spacing-small) 0;

    &.col-2 {
      --cols: 2;
    }
  }
}
</style>
