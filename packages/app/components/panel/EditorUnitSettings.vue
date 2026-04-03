<template>
  <bm-panel
    v-if="unit"
    class="bm-panel-editor-unit-settings"
    title="Editor Unit Settings">
    <bm-button
      :disabled="mode === EDITOR_MODE.PATROL || !hasPatrol"
      label="Patrol"
      :icon="ICON.MAP_PIN"
      @click="$emit('mode', EDITOR_MODE.PATROL)" />
    <bm-fieldset label="General">
      <bm-form-field label-top :icon="ICON.FLAG" label="Faction">
        <bm-select
          :model-value="unitFaction"
          :options="factionOptions"
          @update:model-value="onUpdateFaction" />
      </bm-form-field>
      <bm-form-field class="damage" label="Damage">
        <bm-textfield
          :model-value="unitDamage * 100"
          :el-attrs="{
            type: 'number',
            min: 0,
            max: Math.round(maxDamage * 100)
          }"
          @update:model-value="onUpdateDamage($event / 100)" />
        <span>/ {{ Math.round(maxDamage * 100) }}</span>
      </bm-form-field>
    </bm-fieldset>
    <bm-fieldset v-if="isFigure" label="Figure">
      <bm-toggle
        v-model="needRescue"
        :icon="ICON.RESCUE"
        label="Need Rescue"
        @update:model-value="onUpdateNeedRescue" />
    </bm-fieldset>
    <bm-button label="Debug" @click="onClickDebug" />
    <bm-button
      v-if="canCustomize"
      label="Customize Unit"
      @click="onClickCustomizeUnit" />
    <teleport to="body">
      <bm-dialog ref="unitDebugDialog">
        <template #header>Unit Debug</template>
        <template #default>
          <bm-dialog-editor-unit-debug
            :model-value="unit.moduleDebug"
            :app="$props.app"
            @update:model-value="unit.setModuleDebug($event)" />
        </template>
      </bm-dialog>
      <bm-dialog ref="customizeUnitDialog">
        <template #header>Customize Unit</template>
        <template #default>
          <bm-dialog-customize-unit :app="$props.app" :unit="unit" />
        </template>
      </bm-dialog>
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '@blue-might/app/lib/classes/Unit';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type { FactionIdentifier } from '@blue-might/app/lib/classes/Faction';
import { combineLatest, EMPTY, of, Subscription, switchMap } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';
import { isFigure as isFigureUnit } from '@blue-might/app/lib/utils/unit';
import { ICON } from '@blue-might/app/utils/icons';
import type Faction from '@blue-might/app/lib/classes/Faction';

import BmDialogEditorUnitDebug from '../dialog/EditorUnitDebug.vue';
import BmDialogCustomizeUnit from '../dialog/CustomizeUnit.vue';
import BmPanel from '../Panel.vue';
import BmFieldset from '../Fieldset.vue';
import BmSelect from '../Select.vue';
import BmFormField from '../FormField.vue';
import BmTextfield from '../Textfield.vue';
import BmButton from '../Button.vue';
import BmToggle from '../Toggle.vue';
import BmDialog from '../Dialog.vue';

const unit = ref<Raw<Unit> | null>(null);
const unitDamage = ref<number>(0);
const maxDamage = ref<number>(1);
const needRescue = ref<boolean>(false);
const unitFaction = ref<FactionIdentifier | null>(null);
const canCustomize = computed(() => {
  return 'customize' in (unit.value?.modules ?? {});
});

const unitDebugDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const customizeUnitDialog = ref<InstanceType<typeof BmDialog> | null>(null);

const $props = defineProps<{
  app: AppEditor;
  mode: EDITOR_MODE;
}>();

const editorUnitSettingsModule = $props.app.modules.editorUnitSettings;

defineEmits<{
  (e: 'mode', value: EDITOR_MODE): void;
}>();

//#region factions
const factions = ref<Faction[]>([]);
const factionOptions = computed(() => {
  return factions.value.map(faction => ({
    label: faction.name,
    value: faction.id
  }));
});
//#endregion

const hasPatrol = computed(() => {
  return 'patrol' in (unit.value?.modules ?? {});
});

const isFigure = computed(() => {
  return isFigureUnit(unit.value);
});

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    $props.app.modules.map.observables.map$
      .pipe(switchMap(map => map.modules.faction.observables.factions$))
      .subscribe(factionList => {
        factions.value = factionList;
      })
  );
  subscription.add(
    editorUnitSettingsModule.observables.unit$.subscribe(u => {
      unit.value = u ? markRaw(u) : null;
    })
  );
  subscription.add(
    editorUnitSettingsModule.observables.unit$
      .pipe(
        switchMap(u =>
          u
            ? combineLatest([
                u.modules.damage.observables.damage$,
                u.modules.faction.observables.faction$,
                'figure' in u.modules
                  ? (u.modules.figure?.observables.needRescue$ ?? of(false))
                  : of(false)
              ])
            : EMPTY
        )
      )
      .subscribe(([d, f, nr]) => {
        unitDamage.value = d;
        maxDamage.value = unit.value?.modules.damage.options.maxDamage ?? 1;
        unitFaction.value = f;
        needRescue.value = nr;
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onUpdateFaction(factionId: FactionIdentifier | null) {
  editorUnitSettingsModule.setFaction(factionId);
}

function onUpdateDamage(damage: number) {
  editorUnitSettingsModule.setInitialDamage(damage);
}

function onUpdateNeedRescue(needRescue: boolean) {
  editorUnitSettingsModule.setNeedRescue(needRescue);
}

function onClickDebug() {
  unitDebugDialog.value?.context?.open();
}

function onClickCustomizeUnit() {
  customizeUnitDialog.value?.context?.open();
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
      font-family: var(--font-family-base);
      font-size: 12px;
      white-space: nowrap;
    }
  }
}
</style>
