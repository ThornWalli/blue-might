<template>
  <div class="bm-dialog-editor-surface-settings">
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
    <div class="buttons">
      <bm-button label="Abort" @click="onClickAbort" />
      <bm-button label="Apply" @click="onClickApply" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { Texture } from 'three';
import type { TextureDescription } from '@blue-might/app/lib/classes/appModule/EditorSurface';
import { ICON } from '@blue-might/app/utils/icons';
import { imageBitmapToBlob } from '@blue-might/app/utils/blob';

import BmButton from '../Button.vue';
import BmButtonUpload from '../button/Upload.vue';
import type { DialogContext } from '../base/Dialog.vue';

const dialog = inject<DialogContext>('dialog')!;

const textures = ref<TextureDescription[]>([]);

const $props = defineProps<{
  app: AppEditor;
}>();

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    $props.app.modules.editorSurface.observables.textures$.subscribe(v => {
      textures.value = v;
      refreshTexturePreview();
    })
  );
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

function onClickAbort() {
  dialog.close();
}

async function onClickApply() {
  await $props.app.modules.editorSurface.apply();
  dialog.close();
}
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-surface-settings {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-medium);

  & .textures {
    display: flex;
    flex-wrap: wrap;
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
      font-family: var(--font-base);
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
}
</style>
