<template>
  <div ref="rootEl" class="bm-app-layout">
    <slot name="background"></slot>
    <bm-panel-group :id="PANEL.TOP_LEFT" position="top-left">
      <slot :name="PANEL.TOP_LEFT" />
    </bm-panel-group>
    <bm-panel-group :id="PANEL.TOP" position="top">
      <slot :name="PANEL.TOP" />
    </bm-panel-group>
    <bm-panel-group :id="PANEL.TOP_RIGHT" position="top-right">
      <slot :name="PANEL.TOP_RIGHT" />
    </bm-panel-group>
    <bm-panel-group :id="PANEL.LEFT" position="left">
      <slot :name="PANEL.LEFT" />
    </bm-panel-group>
    <bm-panel-group :id="PANEL.RIGHT" position="right">
      <slot :name="PANEL.RIGHT" />
    </bm-panel-group>
    <bm-panel-group :id="PANEL.BOTTOM_LEFT" position="bottom-left">
      <slot :name="PANEL.BOTTOM_LEFT" />
    </bm-panel-group>
    <bm-panel-group :id="PANEL.BOTTOM" position="bottom">
      <slot :name="PANEL.BOTTOM" />
    </bm-panel-group>
    <bm-panel-group :id="PANEL.BOTTOM_RIGHT" position="bottom-right">
      <slot :name="PANEL.BOTTOM_RIGHT" />
    </bm-panel-group>
    <slot name="foreground"></slot>
  </div>
</template>

<script setup lang="ts">
import BmPanelGroup from './PanelGroup.vue';
</script>

<script lang="ts">
export enum PANEL {
  TOP_LEFT = 'teleports-panel-top-left',
  TOP = 'teleports-panel-top',
  TOP_RIGHT = 'teleports-panel-top-right',
  LEFT = 'teleports-panel-left',
  RIGHT = 'teleports-panel-right',
  BOTTOM_LEFT = 'teleports-panel-bottom-left',
  BOTTOM = 'teleports-panel-bottom',
  BOTTOM_RIGHT = 'teleports-panel-bottom-right'
}
</script>

<style lang="postcss" scoped>
.bm-app-layout {
  position: relative;

  &::before {
    position: absolute;
    inset: var(--bm-panel-offset);
    pointer-events: none;
    content: '';
    border: solid 2px #000;
  }
}
</style>
