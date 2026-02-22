<template>
  <form
    class="bm-dialog-editor-faction-settings"
    @submit="onSubmit"
    @reset="onReset">
    <div class="items">
      <div class="head">
        <div>Name</div>
        <div>Colors</div>
        <div>Map Color</div>
        <div></div>
      </div>
      <div v-for="faction in factions" :key="faction.id">
        <div><bm-textfield v-model="faction.name" /></div>
        <div class="colors">
          <bm-color-picker
            v-for="(_, index) in faction.colors"
            :key="index"
            v-model="faction.colors[index]!" />
        </div>
        <div><bm-color-picker v-model="faction.mapColor" /></div>
        <div>
          <bm-button
            :icon="ICON.TRASH"
            hide-label
            label="Delete"
            @click="onClickDelete(faction.id)" />
        </div>
      </div>
    </div>
    <div class="controls">
      <bm-button label="New" @click="onClickNew" />
      <bm-button label="Copy Factions" @click="onClickCopy" />
      <bm-button label="Paste Factions" @click="onClickPaste" />
      <div class="spacer"></div>
      <bm-button label="Abort" type="reset" />
      <bm-button label="Save" type="submit" />
    </div>
  </form>
</template>

<script lang="ts" setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';

import type {
  FactionDescription,
  FactoryColors
} from '../../lib/classes/Faction';
import { ICON } from '../../utils/icons';
import { convertColor } from '../../utils/export';
import BmButton from '../Button.vue';
import BmTextfield from '../Textfield.vue';
import BmColorPicker from '../ColorPicker.vue';
import type { DialogContext } from '../base/Dialog.vue';

const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: AppEditor;
}>();

const factions = ref<FactionDescription[]>([]);

const subscription = new Subscription();

const editorFactionModule = $props.app.modules.editorFaction;

onMounted(() => {
  subscription.add(
    editorFactionModule.observables.factions$.subscribe(f => {
      factions.value = prepareFactions(f);
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onClickNew() {
  const description: FactionDescription = {
    id: crypto.randomUUID(),
    name: 'New Faction',
    colors: [0xffffff, 0xffffff],
    mapColor: 0xffffff
  };
  factions.value.push(description);
}

function onClickCopy() {
  navigator.clipboard.writeText(JSON.stringify(factions.value));
}
async function onClickPaste() {
  try {
    const text = await navigator.clipboard.readText();
    factions.value = JSON.parse(text);
  } catch (error) {
    console.error(error);
    alert('Failed to paste factions');
  }
}

function onClickDelete(factionId: string) {
  factions.value = factions.value.filter(faction => faction.id !== factionId);
}

function onSubmit(e: Event) {
  e.preventDefault();
  editorFactionModule.setFactions(factions.value);
  dialog.close();
}

function onReset() {
  dialog.close();
}

function prepareFactions(factions: FactionDescription[]): FactionDescription[] {
  return factions
    .filter(faction => !faction.builtin)
    .map(faction => {
      return {
        ...faction,
        colors: [
          ...faction.colors.map(color => convertColor(color))
        ] as FactoryColors,
        mapColor: convertColor(faction.mapColor)
      };
    });
}
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-faction-settings {
  & .items {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
    padding: var(--bm-spacing-small) 0;

    & > .head {
      margin-bottom: var(--bm-spacing-small);
      font-family: var(--font-family-base);
      font-size: 12px;
      font-weight: bold;

      /* font-family: var(--font-family-bit-font);
      font-size: var(--font-size-bit-font);
      line-height: var(--line-height-bit-font); */
    }

    & > div {
      display: flex;
      gap: var(--bm-spacing-small);

      & > * {
        text-align: center;

        &:nth-child(1) {
          flex: 1;
        }

        &:nth-child(2) {
          flex: 0 0 200px;
        }

        &:nth-child(3) {
          flex: 0 0 100px;
        }

        &:nth-child(4) {
          flex: 0 0 100px;
        }

        &.colors {
          display: flex;
          gap: var(--bm-spacing-large);
          align-items: center;
          justify-content: center;
        }
      }
    }
  }

  & .controls {
    display: flex;
    gap: var(--bm-spacing-medium);
    justify-content: space-between;
    padding: var(--bm-spacing-medium);
    margin-top: var(--bm-spacing-medium);
  }
}

.spacer {
  flex: 1;
}
</style>
