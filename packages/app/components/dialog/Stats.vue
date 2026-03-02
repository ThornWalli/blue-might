<template>
  <div class="bm-dialog-stats">
    <bm-button label="Unit Stats" @click="onClickUnitStats" />
    <bm-button label="Projectile Stats" @click="onClickProjectileStats" />
    <bm-button label="Weapon Stats" @click="onClickWeaponStats" />
  </div>
  <teleport to="body">
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
import { inject, ref } from 'vue';
import type { App } from '@blue-might/app/lib/types';

import BmDialog from '../Dialog.vue';
import BmButton from '../Button.vue';
import type { DialogContext } from '../base/Dialog.vue';
import BmDialogUnitStats from '../dialog/internals/UnitStats.vue';
import BmDialogProjectileStats from '../dialog/internals/ProjectileStats.vue';
import BmDialogWeaponStats from '../dialog/internals/WeaponStats.vue';

const unitStatsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const projectileStatsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const weaponStatsDialog = ref<InstanceType<typeof BmDialog> | null>(null);

inject<DialogContext>('dialog')!;

defineProps<{
  app: App;
}>();

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
.bm-dialog-stats {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-small);
}
</style>
