<template>
  <article v-if="mission" class="bm-dialog-mission-briefing">
    <form @submit="onSubmit">
      <h1 class="name">Mission Briefing: "{{ mission.getName() }}"</h1>
      <div class="briefing">
        <div v-if="mission.getObjective()" class="objective">
          <h2>Objective</h2>
          <p>{{ mission.getObjective() }}</p>
        </div>
        <div v-if="mission.getLocation()" class="location">
          <h2>Location</h2>
          <p>{{ mission.getLocation() }}</p>
        </div>
        <div v-if="mission.getSituationReport()" class="situation-report">
          <h2>Situation Report</h2>
          <div v-html="situationReport"></div>
        </div>
        <div v-if="mission.getMissionObjectives()" class="mission-objectives">
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
                  <span class="spacer"></span>
                  <span
                    class="optional-count"
                    :class="{
                      complete: target.completes === target.count,
                      half: target.completes > Math.floor(target.count / 2)
                    }">
                    {{ target.failed }} / {{ target.completes }} /
                    {{ target.count }}
                  </span>
                  <span
                    class="count"
                    :class="{
                      complete:
                        target.optionalCompletes === target.optionalCount,
                      half:
                        target.optionalCompletes >
                        Math.floor(target.optionalCount / 2)
                    }">
                    {{ target.optionalFailed }} /
                    {{ target.optionalCompletes }} /
                    {{ target.optionalCount }}
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
                  <span class="spacer"></span>
                  <span
                    v-if="target.optionalCount > 0"
                    class="optional-count"
                    :class="{
                      complete:
                        target.optionalCompletes === target.optionalCount,
                      half:
                        target.optionalCompletes >
                        Math.floor(target.optionalCount / 2)
                    }">
                    {{ target.optionalFailed }} /
                    {{ target.optionalCompletes }} /
                    {{ target.optionalCount }}
                  </span>
                  <span
                    class="count"
                    :class="{
                      complete: target.completes === target.count,
                      half: target.completes > Math.floor(target.count / 2)
                    }">
                    {{ target.failed }} / {{ target.completes }} /
                    {{ target.count }}
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
import { groupTargetsByUnit } from '@blue-might/app/lib/utils/mission';

import type { DialogContext } from '../base/Dialog.vue';
import BmFieldset from '../Fieldset.vue';
import BmButton from '../Button.vue';
import type { TargetResult } from '../../lib/utils/mission';

const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: App;
}>();

const mission = ref<Raw<Mission> | null>(null);
const targets = ref<TargetResult[]>([]);

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
              ...t,
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
</script>

<style lang="postcss" scoped>
.bm-dialog-mission-briefing {
  box-sizing: border-box;
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

  & .briefing {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--bm-spacing-medium);

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
  }

  & .count,
  & .optional-count {
    color: red;

    &.half {
      color: yellow;
    }

    &.complete {
      color: green;
    }
  }
}
</style>
