<template>
  <bm-panel class="bm-panel-controls" title="Internals">
    <bm-button label="Thumb Generator" @click="onClickThumbGenerator" />
    <bm-button label="Unit Stats" @click="onClickUnitStats" />
    <bm-button label="Projectile Stats" @click="onClickProjectileStats" />
    <bm-button label="Weapon Stats" @click="onClickWeaponStats" />
  </bm-panel>

  <teleport to="body">
    <bm-dialog ref="thumbGeneratorDialog">
      <template #header>Thumb Generator</template>
      <template #default>
        <bm-dialog-thumb-generator :app="$props.app" />
      </template>
    </bm-dialog>
    <bm-dialog ref="unitStatsDialog">
      <template #header>Unit Stats</template>
      <template #default>
        <bm-dialog-unit-stats :app="$props.app" />
      </template>
    </bm-dialog>
    <bm-dialog ref="projectileStatsDialog">
      <template #header>Projectile Stats</template>
      <template #default>
        <bm-dialog-projectile-stats :app="$props.app" />
      </template>
    </bm-dialog>
    <bm-dialog ref="weaponStatsDialog">
      <template #header>Weapon Stats</template>
      <template #default>
        <bm-dialog-weapon-stats :app="$props.app" />
      </template>
    </bm-dialog>
  </teleport>
</template>

<script lang="ts" setup>
import type { App } from '@blue-might/app/lib/types';
import { ref } from 'vue';

import BmDialog from '../Dialog.vue';
import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmDialogThumbGenerator from '../dialog/internals/ThumbGenerator.vue';
import BmDialogUnitStats from '../dialog/internals/UnitStats.vue';
import BmDialogProjectileStats from '../dialog/internals/ProjectileStats.vue';
import BmDialogWeaponStats from '../dialog/internals/WeaponStats.vue';

const thumbGeneratorDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const unitStatsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const projectileStatsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const weaponStatsDialog = ref<InstanceType<typeof BmDialog> | null>(null);

defineProps<{
  app: App;
}>();

function onClickThumbGenerator() {
  thumbGeneratorDialog.value?.context?.open();
}

function onClickUnitStats() {
  unitStatsDialog.value?.context?.open();
}

function onClickProjectileStats() {
  projectileStatsDialog.value?.context?.open();
}

function onClickWeaponStats() {
  weaponStatsDialog.value?.context?.open();
}
</script>

<style lang="postcss" scoped>
:deep(p) {
  font-size: var(--bm-font-size-small);
  line-height: 1.4;
}
</style>
