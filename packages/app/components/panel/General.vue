<template>
  <bm-panel class="bm-panel-general" hide-title title="General">
    <div class="controls">
      <bm-button
        v-if="hasMission"
        label="Mission Briefing"
        @click="onClickMissionBriefing" />
      <hr v-if="hasMission" />
      <bm-button label="Instructions" @click="onClickInstructions" />
      <bm-button label="Stats" @click="onClickStats" />
      <bm-button label="Menu" @click="onClickMenu" />
      <hr v-if="showImport" />
      <bm-button-upload
        v-if="showImport"
        label="Use local Map"
        @files="onFiles" />
    </div>
    <teleport to="body">
      <bm-dialog ref="missionBriefingDialog" hide-header>
        <template #header>Mission Briefing</template>
        <template #default>
          <bm-dialog-mission-briefing :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="instructionsDialog">
        <template #header>Instructions</template>
        <template #default>
          <bm-dialog-instructions :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="statsDialog">
        <template #header>Stats</template>
        <template #default>
          <bm-dialog-stats :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="menuDialog">
        <template #header>Menu</template>
        <template #default>
          <bm-dialog-menu :app="$props.app" />
        </template>
      </bm-dialog>
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type { App } from '@blue-might/app/lib/types';
import { createImport } from '@blue-might/app/utils/export';
import type Mission from '@blue-might/app/lib/classes/Mission';
import { EMPTY, Subscription, switchMap } from 'rxjs';

import BmPanel from '../Panel.vue';
import BmDialog from '../Dialog.vue';
import BmButton from '../Button.vue';
import BmButtonUpload from '../button/Upload.vue';
import BmDialogMenu from '../dialog/Menu.vue';
import BmDialogMissionBriefing from '../dialog/MissionBriefing.vue';
import BmDialogInstructions from '../dialog/Instructions.vue';
import BmDialogStats from '../dialog/Stats.vue';

const missionBriefingDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const instructionsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const statsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const menuDialog = ref<InstanceType<typeof BmDialog> | null>(null);

const $props = defineProps<{
  app: App;
  showImport?: boolean;
}>();

const mission = ref<Raw<Mission> | null>(null);
const hasMission = computed(() => !!mission.value);

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    $props.app.modules.map.observables.map$
      .pipe(
        switchMap(map =>
          map ? map.modules.mission.observables.mission$ : EMPTY
        )
      )
      .subscribe(m => {
        mission.value = m ? markRaw(m) : null;
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onClickMissionBriefing() {
  missionBriefingDialog.value?.context?.open();
}

function onClickInstructions() {
  instructionsDialog.value?.context?.open();
}

function onClickStats() {
  statsDialog.value?.context?.open();
}

function onClickMenu() {
  menuDialog.value?.context?.open();
}

async function onFiles(files: FileList) {
  const file = files.item(0);
  if (file) {
    $props.app.modules.map.enterMap(await createImport(file));
  }
}

defineExpose({
  openMissionBriefing: onClickMissionBriefing,
  openInstructions: onClickInstructions,
  openMenu: onClickMenu
});
</script>

<style lang="postcss" scoped>
.bm-panel-general {
  & .controls {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
    align-items: stretch;
    width: 160px;

    & > * {
      flex: 1;
    }
  }
}
</style>
