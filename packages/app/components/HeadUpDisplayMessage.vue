<template>
  <transition name="fade-very-short">
    <div v-if="messages.length" class="bm-head-up-display-message">
      <div>
        <div
          v-if="messages.includes(HUD_MESSAGE_TYPE.DESTROYED)"
          :key="HUD_MESSAGE_TYPE.DESTROYED"
          class="message-destroyed">
          <div class="content">
            <div>!!! Destroyed !!!</div>
          </div>
        </div>
        <template
          v-else-if="
            messages.includes(HUD_MESSAGE_TYPE.INCOMING_MISSILE) ||
            messages.includes(HUD_MESSAGE_TYPE.DAMAGE) ||
            messages.includes(HUD_MESSAGE_TYPE.LOW_FUEL)
          ">
          <div
            v-if="messages.includes(HUD_MESSAGE_TYPE.INCOMING_MISSILE)"
            :key="HUD_MESSAGE_TYPE.INCOMING_MISSILE"
            class="message-incoming-missile">
            <div class="content">
              <div>!!! Warning !!!</div>
              <div>Incoming Missile</div>
            </div>
          </div>
          <div
            v-else-if="messages.includes(HUD_MESSAGE_TYPE.DAMAGE)"
            :key="HUD_MESSAGE_TYPE.DAMAGE"
            class="message-damage">
            <div class="content">
              <div>!!! WARNING !!!</div>
              <div>Damage</div>
            </div>
          </div>
          <div
            v-else-if="messages.includes(HUD_MESSAGE_TYPE.LOW_FUEL)"
            :key="HUD_MESSAGE_TYPE.LOW_FUEL"
            class="message-low-fuel">
            <div class="content">
              <div>Low Fuel</div>
            </div>
          </div>
        </template>
        <div
          v-else-if="messages.includes(HUD_MESSAGE_TYPE.READY)"
          :key="HUD_MESSAGE_TYPE.READY"
          class="message-ready">
          <div class="content">
            <div>Ready To Start</div>
          </div>
        </div>
        <div
          v-else-if="messages.includes(HUD_MESSAGE_TYPE.ENGINE_STARTED)"
          :key="HUD_MESSAGE_TYPE.ENGINE_STARTED"
          class="message-engine-started">
          <div class="content">
            <div>Engine Starting…</div>
            <div>Holding "R"</div>
          </div>
        </div>
        <div
          v-else-if="messages.includes(HUD_MESSAGE_TYPE.ENGINE_START)"
          :key="HUD_MESSAGE_TYPE.ENGINE_START"
          class="message-engine-start">
          <div class="content">
            <div>Start Engine</div>
            <div>Press "P"</div>
          </div>
        </div>
        <div
          v-if="messages.includes(HUD_MESSAGE_TYPE.LANDED)"
          :key="HUD_MESSAGE_TYPE.LANDED"
          class="message-landed">
          <div class="content">
            <div>Landed</div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';

import usePlayerUnitInterface from '../composables/usePlayerUnitInterface';
import { WARNING_TYPE } from '../lib/classes/unitModule/Radar';
import { DAMAGE_LEVEL } from '../lib/classes/unitModule/Damage';
import { isVehicle } from '../lib/utils/unit';
import { FLIGHT_STATUS } from '../lib/classes/unitModule/movable/airVehicle/Helicopter';
import type { App } from '../lib/types';

const $props = defineProps<{
  app: App;
}>();

const messages = ref<HUD_MESSAGE_TYPE[]>([
  HUD_MESSAGE_TYPE.READY,
  HUD_MESSAGE_TYPE.LANDED,
  HUD_MESSAGE_TYPE.LOW_FUEL,
  HUD_MESSAGE_TYPE.DESTROYED,
  HUD_MESSAGE_TYPE.INCOMING_MISSILE
]);

const { unit, unitDamage, hasFuelWarning, flightStatus, powerInfo, warnings } =
  usePlayerUnitInterface($props.app);

watchEffect(() => {
  const messages_ = [];
  if (warnings.value.length) {
    if (warnings.value.includes(WARNING_TYPE.MISSILE)) {
      messages_.push(HUD_MESSAGE_TYPE.INCOMING_MISSILE);
    }
  } else if (unitDamage.value.destroyed) {
    messages_.push(HUD_MESSAGE_TYPE.DESTROYED);
  } else if (hasFuelWarning.value) {
    messages_.push(HUD_MESSAGE_TYPE.LOW_FUEL);
  } else if (isVehicle(unit.value)) {
    if (unitDamage.value.level >= DAMAGE_LEVEL.DAMAGED) {
      messages_.push(HUD_MESSAGE_TYPE.DAMAGE);
    }

    if (powerInfo.value.currentPower === 0) {
      messages_.push(HUD_MESSAGE_TYPE.ENGINE_START);
    } else if (
      powerInfo.value.currentPower >= powerInfo.value.idlePower &&
      powerInfo.value.currentPower <= powerInfo.value.minPower
    ) {
      messages_.push(HUD_MESSAGE_TYPE.ENGINE_STARTED);
    }

    if (FLIGHT_STATUS.LANDED === flightStatus.value) {
      messages_.push(HUD_MESSAGE_TYPE.LANDED);
    }
  }
  messages.value = messages_;
});
</script>

<script lang="ts">
export enum HUD_MESSAGE_TYPE {
  INCOMING_MISSILE,
  LOW_FUEL,
  DESTROYED,
  DAMAGE,
  READY,
  LANDED,
  ENGINE_STARTED,
  ENGINE_START
}
</script>

<style lang="postcss" scoped>
.bm-head-up-display-message {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  & .message-incoming-missile {
    padding: var(--bm-spacing-small);
    color: white;
    border: solid 4px red;

    & .content {
      padding: var(--bm-spacing-medium) var(--bm-spacing-large);
      background: red;
    }
  }

  & .message-destroyed {
    padding: var(--bm-spacing-small);
    color: white;
    border: solid 4px red;
    animation: blink 2s infinite steps(1);

    & .content {
      padding: var(--bm-spacing-medium) var(--bm-spacing-large);
      background: red;
    }
  }

  & .message-damage {
    padding: var(--bm-spacing-small);
    color: white;
    border: solid 4px orange;
    animation: blink 2s infinite steps(1);

    & .content {
      padding: var(--bm-spacing-medium) var(--bm-spacing-large);
      background: orange;
    }
  }

  & .message-landed {
    padding: var(--bm-spacing-small);
    color: white;
    border: solid 4px green;

    & .content {
      padding: var(--bm-spacing-medium) var(--bm-spacing-large);
      background: green;
    }
  }

  & .message-engine-start,
  & .message-engine-started {
    padding: var(--bm-spacing-small);
    color: black;
    border: solid 4px yellow;

    & .content {
      padding: var(--bm-spacing-medium) var(--bm-spacing-large);
      background: yellow;
    }
  }

  & .message-ready {
    padding: var(--bm-spacing-small);
    color: black;
    border: solid 4px yellow;

    & .content {
      padding: var(--bm-spacing-medium) var(--bm-spacing-large);
      background: yellow;
    }
  }

  & .message-low-fuel {
    padding: var(--bm-spacing-small);
    color: #fff;
    border: solid 4px #f00;
    animation: blink 1s infinite steps(1);

    & .content {
      padding: var(--bm-spacing-medium) var(--bm-spacing-large);
      background: #f00;
    }
  }

  & > div {
    position: absolute;
    bottom: 164px;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-medium);
    align-items: center;
    width: 100%;

    & > div {
      & .content {
        display: flex;
        flex-direction: column;
        gap: var(--bm-spacing-medium);

        & div {
          font-family: var(--font-family-bit-font);
          font-size: var(--font-size-bit-font);
          font-weight: bold;
          line-height: var(--line-height-bit-font);
          text-align: center;
          text-transform: uppercase;

          /* &:first-child {
          font-size: 20px;
        } */

          &:last-child {
            font-family: var(--font-family-bit-font);
            font-size: var(--font-size-bit-font);
            line-height: var(--line-height-bit-font);
          }
        }
      }
    }
  }
}

@keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}
</style>
