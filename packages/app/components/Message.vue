<template>
  <div class="bm-message">
    <div v-if="$props.type === MESSAGE_TYPE.DESTROYED_RESTART">
      <div>You are destroyed!</div>
      <div><span>Click or type "R" for respawn.</span></div>
    </div>

    <div v-if="$props.type === MESSAGE_TYPE.DESTROYED_GAME_OVER">
      <div>Game Over</div>
      <div>
        <span>You have no more lives left!</span>
        <span>Click or type "R" for restart.</span>
      </div>
    </div>

    <div v-if="$props.type === MESSAGE_TYPE.MISSION_COMPLETE">
      <div>Mission Complete</div>
      <div>
        <span>Congratulations!</span>
        <span>Click or type "R" for restart.</span>
      </div>
    </div>

    <div v-if="$props.type === MESSAGE_TYPE.MISSION_FAILED">
      <div>Mission Failed</div>
      <div>
        <span>Better luck next time!</span>
        <span>Click or type "R" for restart.</span>
      </div>
    </div>

    <div v-if="$props.type === MESSAGE_TYPE.OUT_OF_BOUNDS">
      <div>Out of Bounds</div>
      <div>
        <span>You have gone out of bounds!</span>
        <span>
          Return to the play area or you will be destroyed in
          {{ $props.payload?.duration }} seconds.
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const $props = defineProps<{
  type: MESSAGE_TYPE;
  payload?: MESSAGE_PAYLOADS;
}>();
</script>

<script lang="ts">
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MESSAGE_PAYLOAD = Record<string, any>;
export enum MESSAGE_TYPE {
  OUT_OF_BOUNDS = 'out_of_bounds',
  DESTROYED_GAME_OVER = 'destroyed_game_over',
  DESTROYED_RESTART = 'destroyed_restart',
  MISSION_COMPLETE = 'mission_complete',
  MISSION_FAILED = 'mission_failed'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessagePayload = Record<string, any>;
interface MessagePayload_OutOfBounds extends MessagePayload {
  duration: number;
}

export type MESSAGE_PAYLOADS = MessagePayload | MessagePayload_OutOfBounds;
</script>

<style lang="postcss" scoped>
.bm-message {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  user-select: none;
  background: rgb(0 0 0 / 75%);

  & > div {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-very-large);
    padding: calc(var(--bm-spacing-large) * 2);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    color: white;
    text-align: center;
    background-color: #1c1f1c;
    border: solid 8px #2f3330;

    & > div {
      display: flex;
      flex-direction: column;
      gap: var(--bm-spacing-large);

      &:first-child {
        font-size: calc(var(--font-size-bit-font) * 2);
        line-height: calc(var(--line-height-bit-font) * 2);
      }

      & span {
        display: block;
      }
    }
  }
}
</style>
