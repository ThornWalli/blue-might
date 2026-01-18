<template>
  <component
    :is="button ? 'button' : 'div'"
    class="bm-control-item"
    :class="{
      [`status-${status}`]: status
    }">
    <div>
      <div>
        <span v-if="indicator" class="indicator-lamp"></span>
        <span v-else></span>
        {{ label.padStart(10, '\u00A0') }}
      </div>
      <div v-html="value"></div>
    </div>
  </component>
</template>

<script setup lang="ts">
defineProps<{
  indicator?: boolean;
  button?: boolean;
  status?: CONTROL_ITEM_STATUS;
  label: string;
  value: string;
}>();
</script>

<script lang="ts">
export enum CONTROL_ITEM_STATUS {
  NORMAL = 'normal',
  WARNING = 'warning',
  DANGER = 'danger',
  INACTIVE = 'inactive'
}
</script>

<style lang="postcss" scoped>
.bm-control-item {
  display: block;
  width: 100%;

  --color-inactive: #555;
  --color-normal: green;
  --color-warning: yellow;
  --color-danger: red;

  &button {
    padding: 0;
    appearance: none;
    cursor: pointer;
    outline: none;
    background: transparent;
    border: none;

    & > div {
      width: 100%;
      border: solid 2px #555;
    }
  }

  & > div {
    box-sizing: border-box;
    display: flex;
    font-family: var(--font-bit-font-family);
    font-size: var(--font-bit-font-size);
    line-height: var(--font-bit-line-height);
    border: solid 2px transparent;
  }

  & > div > div {
    display: flex;
    gap: var(--bm-spacing-medium);
    align-items: center;
    padding: var(--bm-spacing-small);

    &:nth-child(odd) {
      display: flex;
      flex: 1;
      justify-content: space-between;
    }

    &:nth-child(even) {
      flex: 0;
      text-align: right;
      background-color: #333;
    }
  }

  & .indicator-lamp {
    display: inline-block;
    width: 14px;
    height: 14px;
    background-color: var(--color-inactive);
    border-radius: 50%;
    box-shadow: inset 0 0 2px rgb(0 0 0 / 50%);
  }

  &.status-inactive .indicator-lamp {
    background-color: var(--color-inactive);
  }

  &.status-normal .indicator-lamp {
    background-color: var(--color-normal);
  }

  &.status-warning .indicator-lamp {
    background-color: var(--color-warning);
  }

  &.status-danger .indicator-lamp {
    background-color: var(--color-danger);
  }
}
</style>
