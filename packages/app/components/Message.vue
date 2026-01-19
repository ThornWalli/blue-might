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
  </div>
</template>

<script lang="ts" setup>
const $props = defineProps<{
  type: MESSAGE_TYPE;
}>();
</script>

<script lang="ts">
export enum MESSAGE_TYPE {
  DESTROYED_GAME_OVER = 'destroyed_game_over',
  DESTROYED_RESTART = 'destroyed_restart'
}
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
    font-family: var(--font-bit-font-family);
    font-size: var(--font-bit-font-size);
    line-height: var(--font-bit-line-height);
    color: white;
    text-align: center;
    background-color: #1c1f1c;
    border: solid 8px #2f3330;

    & > div {
      display: flex;
      flex-direction: column;
      gap: var(--bm-spacing-large);

      &:first-child {
        font-size: calc(var(--font-bit-font-size) * 2);
        line-height: calc(var(--font-bit-line-height) * 2);
      }

      & span {
        display: block;
      }
    }
  }
}
</style>
