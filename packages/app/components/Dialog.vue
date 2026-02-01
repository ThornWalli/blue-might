<template>
  <base-dialog
    ref="dialog"
    v-slot="{ close }"
    class="bm-dialog"
    :class="{
      'embed-content': embedContent
    }">
    <div class="wrapper">
      <div class="header">
        <header v-if="$slots.header">
          <slot :close="close" name="header"></slot>
        </header>
        <div class="buttons">
          <base-button
            v-if="showFullscreen"
            class="show-fullscreen"
            aria-label="Fullscreen"
            @click="onClickFullscreen">
            <svg-dialog-maximize v-if="!dialog?.fullscreen" />
            <svg-dialog-minimize v-else />
          </base-button>
          <base-button
            v-if="!hideClose"
            class="close-button"
            aria-label="Close"
            @click="close">
            <svg-dialog-close />
          </base-button>
        </div>
      </div>
      <div class="content">
        <slot :close="close"></slot>
      </div>
      <div v-if="$slots.actions" class="actions">
        <slot name="actions" :close="close"></slot>
      </div>
    </div>
  </base-dialog>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import SvgDialogClose from '../assets/icons/dialog/close.svg';
import SvgDialogMinimize from '../assets/icons/dialog/minimize.svg';
import SvgDialogMaximize from '../assets/icons/dialog/maximize.svg';

import BaseDialog from './base/Dialog.vue';
import BaseButton from './base/Button.vue';

const dialog = ref<InstanceType<typeof BaseDialog> | null>(null);

const $props = defineProps<{
  forceOpen?: boolean;
  hideClose?: boolean;
  showFullscreen?: boolean;
  embedContent?: boolean;
}>();

onMounted(() => {
  if ($props.forceOpen) {
    dialog.value!.open();
  }
});

defineExpose({
  context: computed<InstanceType<typeof BaseDialog> | null>(() => dialog.value)
});

function onClickFullscreen() {
  dialog.value!.toggleFullscreen();
}
</script>

<style lang="postcss" scoped>
.bm-dialog {
  &:not(.embed-content) {
    & .content {
      padding: 5px;
    }
  }

  & .wrapper {
    overflow: hidden;
    color: var(--bm-dialog-foreground);
    background: var(--bm-dialog-background);
  }

  & .header {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px;
    font-weight: bold;
    color: var(--bm-dialog-header-foreground);
    background: var(--bm-dialog-header-background);

    & header {
      display: flex;
      align-items: center;
      padding-right: var(--bm-spacing-small);
      padding-left: var(--bm-spacing-small);
      font-family: var(--font-family-bit-font);
      font-size: var(--font-size-bit-font);
      line-height: var(--line-height-bit-font);
    }
  }

  & .buttons {
    display: flex;
    gap: var(--bm-spacing-small);
    align-items: center;
  }

  & .actions {
    display: flex;
    gap: var(--bm-spacing-small);
    justify-content: flex-end;
    padding: var(--bm-spacing-small);
    background: #ccc;
    border-top: solid #000 1px;
  }

  &.fullscreen {
    & .wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;

      & > .content {
        flex: 1;
      }
    }
  }

  & .show-fullscreen {
    padding: 4px;
    cursor: pointer;
    background: none;
    background: var(--color-yellow-6);
    border: solid 2px var(--color-black);

    & svg {
      display: block;
      width: 10px;
      fill: #666;
      transition: fill 0.2s;

      &:hover {
        fill: #000;
      }
    }
  }

  & .close-button {
    padding: var(--bm-spacing-small);
    cursor: pointer;
    background: var(--color-red-8);
    border: solid 2px var(--color-black);
    transition: background var(--cw-easing-duration-short) var(--cw-easing-in);

    &:hover {
      background: var(--color-red-10);
    }

    & svg {
      display: block;
      width: 10px;
      fill: #fff;
    }
  }
}
</style>
