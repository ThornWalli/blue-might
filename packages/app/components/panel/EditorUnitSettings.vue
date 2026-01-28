<template>
  <bm-panel
    v-if="unit"
    class="bm-panel-editor-unit-settings"
    title="Editor Unit Settings">
    <bm-form-field label-top label="Faction">
      <bm-select
        :model-value="unitFaction"
        :options="factionOptions"
        @update:model-value="onUpdateFaction" />
    </bm-form-field>
    <bm-form-field class="damage" label="Damage">
      <bm-textfield
        :model-value="unitDamage * 100"
        :input-attrs="{
          type: 'number',
          min: 0,
          max: Math.round(maxDamage * 100)
        }"
        @update:model-value="onUpdateDamage($event / 100)" />
      <span>/ {{ Math.round(maxDamage * 100) }}</span>
    </bm-form-field>

    <bm-button
      :disabled="mode === EDITOR_MODE.PATROL || !hasPatrol"
      label="Patrol"
      @click="$emit('mode', EDITOR_MODE.PATROL)" />
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '@blue-might/app/lib/classes/Unit';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type { FactionIdentifier } from '@blue-might/app/lib/classes/Faction';
import { EMPTY, Subscription, switchMap } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';

import BmPanel from '../Panel.vue';
import BmSelect from '../Select.vue';
import BmFormField from '../FormField.vue';
import BmTextfield from '../Textfield.vue';
import BmButton from '../Button.vue';

const unit = ref<Raw<Unit> | null>(null);
const unitDamage = ref<number>(100);
const maxDamage = ref<number>(100);
const unitFaction = ref<FactionIdentifier | null>(null);

const $props = defineProps<{
  app: AppEditor;
  mode: EDITOR_MODE;
}>();

defineEmits<{
  (e: 'mode', value: EDITOR_MODE): void;
}>();

const factionOptions = computed(() => {
  return (
    $props.app.modules.map.getMap()?.modules.faction.getFactions() ?? []
  ).map(faction => ({
    label: faction.name,
    value: faction.id
  }));
});

const hasPatrol = computed(() => {
  return 'patrol' in (unit.value?.modules ?? {});
});

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    $props.app.modules.editorUnits.observables.unit$.subscribe(u => {
      unit.value = u ? markRaw(u) : null;
      unitFaction.value = u?.modules.faction.getFactionId() ?? null;
      maxDamage.value = u?.modules.damage.getMaxDamage() ?? 0;
    })
  );
  subscription.add(
    $props.app.modules.editorUnits.observables.unit$
      .pipe(switchMap(u => u?.modules.damage.observables.damage$ ?? EMPTY))
      .subscribe(v => {
        unitDamage.value = v;
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onUpdateFaction(factionId: FactionIdentifier | null) {
  if (unit.value) {
    unit.value.modules.faction.setFaction(factionId);
    unitFaction.value = factionId;
  }
}

function onUpdateDamage(damage: number) {
  if (unit.value) {
    unit.value.modules.damage.setValue(damage, true);
  }
}
</script>
<style lang="postcss" scoped>
.bm-panel-editor-unit-settings {
  & .damage {
    & .bm-textfield {
      flex: 1;
    }

    & span {
      flex: 0;
      font-family: var(--font-base);
      font-size: 12px;
      white-space: nowrap;
    }
  }
}
</style>
