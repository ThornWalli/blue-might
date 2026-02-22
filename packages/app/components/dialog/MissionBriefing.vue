<template>
  <article v-if="mission" class="bm-dialog-mission-briefing">
    <form @submit="onSubmit">
      <h1 class="name">Mission Briefing: "{{ mission.getName() }}"</h1>
      <div class="briefing">
        <div class="objective">
          <h2>Objective</h2>
          <p>{{ mission.getObjective() }}</p>
        </div>
        <div class="location">
          <h2>Location</h2>
          <p>{{ mission.getLocation() }}</p>
        </div>
        <div class="situation-report">
          <h2>Situation Report</h2>
          <div v-html="situationReport"></div>
        </div>
        <div class="mission-objectives">
          <h2>Mission Objectives</h2>
          <div v-html="missionObjectives"></div>
        </div>
      </div>
      <div>
        <h2>Targets</h2>
        <div class="units">
          <bm-fieldset label="Attack">
            <ul>
              <li
                v-for="target in targets.filter(t => t.type === 'attack')"
                :key="target.name">
                <div>
                  <span>{{ target.name }}</span>
                  <span
                    class="count"
                    :class="{ complete: target.completes === target.count }">
                    {{ target.completes }} / {{ target.count }}
                  </span>
                </div>
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
                <div>
                  <span>{{ target.name }}</span>
                  <span
                    class="count"
                    :class="{ complete: target.completes === target.count }">
                    {{ target.completes }} / {{ target.count }}
                  </span>
                </div>
              </li>
              <li
                v-if="!targets.filter(t => t.type === 'rescue').length"
                class="empty">
                No Rescue Targets
              </li>
            </ul>
          </bm-fieldset>
        </div>
      </div>
      <div class="controls">
        <bm-button label="Start" type="submit" />
      </div>
    </form>
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
import type { TargetType } from '@blue-might/app/lib/classes/Mission';
import type { Units } from '@blue-might/units';

import type { DialogContext } from '../base/Dialog.vue';
import BmFieldset from '../Fieldset.vue';
import BmButton from '../Button.vue';

const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: App;
}>();

const mission = ref<Raw<Mission> | null>(null);
const targets = ref<
  {
    type: TargetType;
    name: string;
    count: number;
    completes: number;
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

        // Create a map of all units
        const unitMap = new Map(
          [
            ...map.modules.units.getUnits(),
            ...map.modules.units.getDestroyedUnits(),
            ...map.modules.units
              .getUnits()
              .map(u =>
                'transport' in u.modules ? u.modules.transport.getSlots() : []
              )
              .flat()
          ].map(u => [u.id, u])
        );

        targets.value = groupTargetsByUnit(
          (mission.value?.getTargets() ?? []).map(t => {
            return {
              type: t.type,
              unit: unitMap.get(t.unit)!
            };
          })
        );
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onSubmit(e: Event) {
  e.preventDefault();
  dialog.close();
}

function groupTargetsByUnit(targets: { type: TargetType; unit: Units }[]) {
  const grouped: {
    name: string;
    type: TargetType;
    count: number;
    completes: number;
  }[] = [];
  for (const target of targets) {
    let existing = grouped.find(t => t.name === target.unit.name);
    if (!existing) {
      existing = {
        name: target.unit.name,
        type: target.type,
        count: 0,
        completes: 0
      };
      grouped.push(existing);
    }

    existing.count++;

    if (
      target.type === 'rescue' &&
      'figure' in target.unit.modules &&
      target.unit.modules.figure.isRescueComplete()
    ) {
      existing.completes++;
    }
    if (target.type === 'attack' && target.unit.modules.damage.isDestroyed()) {
      existing.completes++;
    }
  }
  return grouped;
}
</script>

<style lang="postcss" scoped>
.bm-dialog-mission-briefing {
  width: 100%;
  max-width: 640px;
  padding: var(--bm-spacing-small);
  font-size: var(--bm-font-size-small);

  & form {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-medium);
  }

  & .controls {
    display: flex;
    flex-direction: column;
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
        & > div {
          justify-content: space-between;
        }

        & > div,
        &.empty {
          display: flex;
          gap: var(--bm-spacing-small);
          align-items: center;
        }
      }
    }

    & .empty {
      justify-content: center;
      padding: var(--bm-spacing-small) 0;
      opacity: 0.4;
    }
  }

  h1 {
    padding-bottom: var(--bm-spacing-small);
    margin: 0;
    font-family: var(--font-family-base);
    font-size: 20px;
    font-weight: bold;
    border-bottom: solid 4px var(--bm-line-color);
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

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
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

  & .count {
    color: red;

    &.complete {
      color: green;
    }
  }
}
</style>
