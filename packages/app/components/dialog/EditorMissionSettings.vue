<template>
  <form
    class="bm-dialog-editor-mission-settings"
    @submit="onSubmit"
    @reset="onReset">
    <bm-button
      v-if="!missionDescription"
      type="button"
      class="create-mission"
      label="Create Mission"
      @click="onCreateMission" />
    <template v-else>
      <bm-fieldset label="General">
        <bm-form-field v-slot="{ id }" label="Name">
          <bm-textfield :id="id" v-model="missionDescription.name" />
        </bm-form-field>
        <bm-form-field v-slot="{ id }" label="Objective">
          <bm-textfield :id="id" v-model="missionDescription.objective" />
        </bm-form-field>
        <bm-form-field v-slot="{ id }" label="Location">
          <bm-textfield :id="id" v-model="missionDescription.location" />
        </bm-form-field>

        <bm-details label="Mission Situation Report">
          <bm-form-field
            v-slot="{ id }"
            label-top
            hide-label
            label="Mission Situation Report">
            <bm-textarea
              :id="id"
              v-model="missionDescription.situationReport" />
          </bm-form-field>
        </bm-details>
        <bm-details label="Mission Objectives">
          <bm-form-field
            v-slot="{ id }"
            hide-label
            label-top
            label="Mission Objectives">
            <bm-textarea
              :id="id"
              v-model="missionDescription.missionObjectives" />
          </bm-form-field>
        </bm-details>
      </bm-fieldset>
      <div class="units">
        <bm-fieldset label="Attack Targets">
          <ul>
            <li
              v-for="target in targets.filter(t => t.type === 'attack')"
              :key="target.unit.id">
              <span>
                {{ target.unit.name }}
                <span v-if="!target.optional">*</span>
              </span>
              <bm-button
                mode="text"
                label="Remove"
                type="button"
                @click="onClickRemoveTarget(target.unit.id)" />
            </li>
            <li
              v-if="!targets.filter(t => t.type === 'attack').length"
              class="empty">
              No Attack Targets
            </li>
          </ul>
        </bm-fieldset>
        <bm-fieldset label="Rescue Targets">
          <ul>
            <li
              v-for="target in targets.filter(t => t.type === 'rescue')"
              :key="target.unit.id">
              <span>
                {{ target.unit.name }}
                <span v-if="!target.optional">*</span>
              </span>
              <bm-button
                mode="text"
                label="Remove"
                type="button"
                @click="onClickRemoveTarget(target.unit.id)" />
            </li>
            <li
              v-if="!targets.filter(t => t.type === 'rescue').length"
              class="empty">
              No Rescue Targets
            </li>
          </ul>
        </bm-fieldset>
      </div>

      <div class="controls">
        <bm-button
          type="button"
          label="Remove Mission"
          style-type="danger"
          @click="onClickRemoveMission" />
        <bm-button label="Abort" type="reset" />
        <bm-button label="Save" type="submit" />
      </div>
    </template>
  </form>
</template>

<script lang="ts" setup>
import { inject, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import { map as rxjsMap, EMPTY, Subscription, switchMap } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { MissionDescription } from '@blue-might/app/lib/classes/Mission';
import type Mission from '@blue-might/app/lib/classes/Mission';
import type Unit from '@blue-might/app/lib/classes/Unit';
import type { TargetType } from '@blue-might/app/lib/types/mission';

import BmButton from '../Button.vue';
import BmTextfield from '../Textfield.vue';
import BmFormField from '../FormField.vue';
import BmTextarea from '../Textarea.vue';
import BmFieldset from '../Fieldset.vue';
import BmDetails from '../Details.vue';
import type { DialogContext } from '../base/Dialog.vue';

const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: AppEditor;
}>();

const mission = ref<Raw<Mission> | null>(null);
const missionDescription = ref<Raw<MissionDescription> | null>(null);
const targets = ref<
  {
    type: TargetType;
    unit: Unit;
    optional: boolean;
  }[]
>([]);

const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    $props.app.modules.map.observables.map$
      .pipe(
        switchMap(map =>
          map
            ? $props.app.modules.editorMission.observables.mission$.pipe(
                rxjsMap(mission => ({ map, mission }))
              )
            : EMPTY
        )
      )
      .subscribe(({ map, mission: m }) => {
        mission.value = m ? markRaw(m) : null;
        missionDescription.value = mission.value?.toDescription() ?? null;
        targets.value = (mission.value?.getTargets() ?? []).map(t => ({
          type: t.type,
          unit: map.modules.units.getUnitById(t.unit)!,
          optional: t.optional ?? false
        }));
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onCreateMission() {
  $props.app.modules.editorMission.createMission();
}

function onClickRemoveMission() {
  if (!missionDescription.value) return;

  if (
    window.confirm(
      'Are you sure you want to remove this mission? This action cannot be undone.'
    )
  ) {
    $props.app.modules.editorMission.removeMission();
    dialog.close();
  }
}

function onSubmit(e: Event) {
  e.preventDefault();

  $props.app.modules.editorMission.updateMission(missionDescription.value!);

  dialog.close();
}

function onReset() {
  dialog.close();
}

function onClickRemoveTarget(targetId: string) {
  $props.app.modules.editorMission.removeTargetById(targetId);
}
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-mission-settings {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-large);
  width: 640px;

  & .controls {
    display: flex;
    gap: var(--bm-spacing-medium);
    justify-content: space-between;
    padding: var(--bm-spacing-medium);
    margin-top: var(--bm-spacing-medium);
  }

  & .create-mission {
    width: 100%;
  }

  & .units {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--bm-spacing-medium);
    font-family: var(--font-family-base);
    font-size: 12px;
    font-weight: bold;

    & ul {
      display: flex;
      flex-direction: column;
      gap: var(--bm-spacing-small);

      & li {
        display: flex;
        gap: var(--bm-spacing-small);
        align-items: center;
        justify-content: space-between;
      }
    }

    & .empty {
      justify-content: center;
      padding: var(--bm-spacing-small) 0;
      opacity: 0.4;
    }
  }

  & :deep(.bm-form-field label) {
    min-width: 80px;
  }

  & .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--bm-spacing-medium);
  }
}
</style>
