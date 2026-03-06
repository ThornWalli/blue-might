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
          v-else-if="messages.includes(HUD_MESSAGE_TYPE.LANDED)"
          :key="HUD_MESSAGE_TYPE.LANDED"
          class="message-landed">
          <div class="content">
            <div>Landed</div>
          </div>
        </div>
        <div
          v-else-if="messages.includes(HUD_MESSAGE_TYPE.ENGINE_START)"
          :key="HUD_MESSAGE_TYPE.ENGINE_START"
          class="message-engine-start">
          <div class="content">
            <div>Engine Starting…</div>
            <div>Holding "R"</div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{
  messages: HUD_MESSAGE_TYPE[];
}>();
</script>

<script lang="ts">
export enum HUD_MESSAGE_TYPE {
  INCOMING_MISSILE,
  LOW_FUEL,
  DESTROYED,
  DAMAGE,
  READY,
  LANDED,
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

  & .message-engine-start {
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
    top: calc(6 / 8 * 100%);
    left: 50%;
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-medium);
    transform: translate(-50%, -50%);

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
