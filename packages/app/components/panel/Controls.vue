<template>
  <bm-panel class="bm-panel-controls" hide-title title="Controls">
    <p>
      <strong>W / Arrow Up:</strong> Move Forward<br />
      <strong>S / Arrow Down:</strong> Move Backward<br />
      <strong>A / Arrow Left:</strong> Turn Left <br />
      <strong>D / Arrow Right:</strong> Turn Right <br />
      <strong>Space:</strong> Start / Up / Brake <br />
      <strong>Shift+Space:</strong> Down
    </p>
  </bm-panel>
</template>

<script lang="ts" setup>
import BmPanel from '../Panel.vue';
import type App from '../../lib/classes/App';

defineProps<{
  app: App;
}>();
</script>
<style lang="postcss" scoped>
.bm-panel-controls p {
  font-size: var(--bm-font-size-small);
  line-height: 1.4;
}
</style>
