<template>
  <div
    class="bm-dialog-internals-thumb-generator"
    :style="{
      '--width': width,
      '--cols': cols
    }">
    <div class="controls">
      <bm-form-field label="View">
        <bm-select v-model="view" :options="viewOptions" />
      </bm-form-field>
      <bm-form-field label="Faction">
        <bm-select v-model="faction" :options="factionOptions" />
      </bm-form-field>

      <!-- <bm-form-field label="Scale">
        <bm-textfield
          v-model="scale"
          :el-attrs="{ type: 'number', step: 1, min: 1 }" />
      </bm-form-field> -->

      <bm-form-field label="Width">
        <bm-textfield v-model="width" />
      </bm-form-field>

      <bm-button label="Download" @click="onClickDownload" />
    </div>

    <div class="items">
      <ul>
        <li v-for="{ url, key } in thumbs" :key="key">
          <img :src="url" :alt="`Thumbnail for ${key}`" />
        </li>
      </ul>

      <transition name="fade-short">
        <div v-if="loading" class="loading">Loading…</div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { App } from '@blue-might/app/lib/types';
import { onMounted, ref } from 'vue';
import * as units from '@blue-might/units';
import thumbGenerator, {
  type ViewType
} from '@blue-might/app/services/thumbGenerator';
import type { FactionIdentifier } from '@blue-might/app/lib/classes/Faction';

import BmTextfield from '../../Textfield.vue';
import BmSelect from '../../Select.vue';
import BmFormField from '../../FormField.vue';
import BmButton from '../../Button.vue';

const $props = defineProps<{
  app: App;
}>();

const viewOptions = ref<
  {
    label: string;
    value: ViewType;
  }[]
>([
  { label: 'Isometric', value: 'isometric' },
  { label: 'Front', value: 'front' },
  { label: 'Side', value: 'side' }
]);

const view = ref<ViewType>(viewOptions.value[0]!.value);
const scale = ref(1);

const factionOptions = ref<
  {
    label: string;
    value: FactionIdentifier;
  }[]
>(
  $props.app.modules.map
    .getMap()
    ?.modules.faction.getFactions()
    .map(faction => ({
      label: faction.name,
      value: faction.id
    })) ?? []
);

const faction = ref<FactionIdentifier>(factionOptions.value[0]!.value);

const thumbs = ref<
  {
    url: string;
    key: string;
  }[]
>([]);

const width = ref(32);
const cols = ref(8);
const loading = ref(false);

function render() {
  const newThumbs: { url: string; key: string }[] = [];
  const u = Object.values(units);

  const faction_ =
    $props.app.modules.map
      .getMap()
      ?.modules.faction.getFactionById(faction.value ?? 'neutral') || undefined;

  return Promise.all(
    u
      .map(unit => unit.KEY)
      .map(key =>
        thumbGenerator
          .getFromUnit(key, {
            size: Number(width.value),
            view: view.value,
            faction: faction_,
            scale: scale.value
          })
          .then(url => newThumbs.push({ url, key }))
      )
  ).then(() => {
    thumbs.value = newThumbs;
  });
}
onMounted(async () => {
  render();
});

async function onClickDownload() {
  loading.value = true;
  await render();

  const JSZip = await import('jszip').then(m => m.default);
  const { saveAs } = await import('file-saver');

  const zip = new JSZip();
  thumbs.value.forEach(thumb => {
    zip.file(
      `${thumb.key}.png`,
      fetch(thumb.url).then(res => res.blob())
    );
  });

  zip.generateAsync({ type: 'blob' }).then(content => {
    saveAs(content, 'thumbnails.zip');
  });

  loading.value = false;
}
</script>

<style lang="postcss" scoped>
.bm-dialog-internals-thumb-generator {
  --max-width: 32;
  --width: 32;
  --cols: 10;
  --rows: 4;

  & .items {
    position: relative;
    height: calc(
      var(--rows) * var(--max-width) * 1px + (var(--rows) - 1) *
        var(--bm-spacing-small) + var(--max-width) / 2 * 1px +
        var(--bm-spacing-small)
    );
    overflow: auto;

    & .loading {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background-color: rgb(0 0 0 / 40%);
      backdrop-filter: blur(4px);
    }
  }

  & ul {
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(calc(var(--max-width) * 1px), 1fr)
    );
    gap: var(--bm-spacing-small);
    width: calc(
      var(--cols) * var(--max-width) * 1px + (var(--cols) - 1) *
        var(--bm-spacing-small)
    );
    padding: var(--bm-spacing-small);
  }

  & img {
    max-width: 32px;
  }

  & .controls {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
  }
}

:deep(.bm-form-field label) {
  width: 80px;
}
</style>
