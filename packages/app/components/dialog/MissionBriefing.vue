<template>
  <article v-if="mission" class="bm-dialog-mission-briefing">
    <h1 class="name">Mission Briefing: "{{ mission.getName() }}"</h1>
    <div class="briefing">
      <div class="situation-report">
        <h2>Situation Report</h2>
        <div v-html="situationReport"></div>
      </div>
      <div class="mission-objectives">
        <h2>Mission Objectives</h2>
        <div v-html="missionObjectives"></div>
      </div>
    </div>
    <h2>Targets</h2>
    <div class="units">
      <bm-fieldset label="Attack">
        <ul>
          <li
            v-for="target in targets.filter(t => t.type === 'attack')"
            :key="target.name">
            <span>{{ target.name }}</span>
            <span>{{ target.count }}</span>
          </li>
          <li
            v-if="!targets.filter(t => t.type === 'attack').length"
            class="empty">
            No Attack Targets
          </li>
        </ul>
      </bm-fieldset>
      <bm-fieldset label="Rescue">
        <ul>
          <li
            v-for="target in targets.filter(t => t.type === 'rescue')"
            :key="target.name">
            <span>{{ target.name }}</span>
            <span>{{ target.count }}</span>
          </li>
          <li
            v-if="!targets.filter(t => t.type === 'rescue').length"
            class="empty">
            No Rescue Targets
          </li>
        </ul>
      </bm-fieldset>
    </div>
  </article>
</template>

<script lang="ts" setup>
import {
  computed,
  inject,
  markRaw,
  onMounted,
  onUnmounted,
  ref,
  type Raw
} from 'vue';
import type { App } from '@blue-might/app/lib/types';
import type Mission from '@blue-might/app/lib/classes/Mission';
import { map as rxjsMap, EMPTY, Subscription, switchMap } from 'rxjs';
import { marked } from 'marked';
import type Unit from '@blue-might/app/lib/classes/Unit';
import type { TargetType } from '@blue-might/app/lib/classes/Mission';

import type { DialogContext } from '../base/Dialog.vue';
import BmFieldset from '../Fieldset.vue';

inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: App;
}>();

const mission = ref<Raw<Mission> | null>(null);
const targets = ref<
  {
    type: TargetType;
    name: string;
    count: number;
  }[]
>([]);

const subscription = new Subscription();

const situationReport = computed(() =>
  marked.parse(mission.value?.getSituationReport() ?? '')
);
const missionObjectives = computed(() =>
  marked.parse(mission.value?.getMissionObjectives() ?? '')
);

onMounted(() => {
  subscription.add(
    $props.app.modules.map.observables.map$
      .pipe(
        switchMap(map =>
          map
            ? map.modules.mission.observables.mission$.pipe(
                rxjsMap(mission => ({ map, mission }))
              )
            : EMPTY
        )
      )
      .subscribe(({ map, mission: m }) => {
        mission.value = m ? markRaw(m) : null;
        targets.value = groupTargetsByUnit(
          (mission.value?.getTargets() ?? []).map(t => ({
            type: t.type,
            unit: map.modules.units.getUnitById(t.unit)!
          }))
        );
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function groupTargetsByUnit(targets: { type: TargetType; unit: Unit }[]) {
  const grouped: {
    name: string;
    type: TargetType;
    count: number;
  }[] = [];
  for (const target of targets) {
    const existing = grouped.find(t => t.name === target.unit.name);
    if (existing) {
      existing.count++;
    } else {
      grouped.push({
        name: target.unit.name,
        type: target.type,
        count: 1
      });
    }
  }
  return grouped;
}
</script>

<style lang="postcss" scoped>
.bm-dialog-mission-briefing {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-small);
  width: 100%;
  max-width: 640px;
  padding: var(--bm-spacing-small);
  font-size: var(--bm-font-size-small);

  & .controls-grid {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.5rem;

    & div:nth-of-type(odd) {
      font-weight: bold;
      opacity: 0.6;
    }

    & div:nth-of-type(even) {
      opacity: 1;
    }
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

  h1 {
    margin: 0;
    font-family: var(--font-family-base);
    font-size: 20px;
    font-weight: bold;
  }

  & .briefing {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--bm-spacing-medium);
  }

  & :deep(h2),
  & :deep(h3),
  & :deep(h4),
  & :deep(h5),
  & :deep(h6) {
    margin: 0;
    margin-bottom: var(--bm-spacing-medium);
    font-family: var(--font-family-base);
    font-size: 14px;
    font-weight: bold;
    opacity: 0.6;
  }

  & :deep(ul),
  & :deep(ol),
  & :deep(p) {
    margin: var(--bm-spacing-medium) 0;
  }

  & :deep(ul),
  & :deep(ol) {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
    padding-left: 1.25em;
  }

  & :deep(ol) {
    list-style-type: decimal;
  }

  & :deep(ul) {
    list-style-type: circle;
  }

  & :deep(hr) {
    margin: var(--bm-spacing-small) 0;
    border: none;
    border-top: 2px solid var(--bm-line-color);
  }
}
</style>
