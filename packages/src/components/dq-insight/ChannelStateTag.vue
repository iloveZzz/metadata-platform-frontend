<script setup lang="ts">
import { computed } from 'vue';
import type { ChannelState } from '@/api';

defineOptions({ name: 'ChannelStateTag' });

const props = withDefaults(
  defineProps<{
    /** 通道状态：enabled=启用 / disabled=停用 / pulling=拉取中 / pull-failed=拉取失败 */
    state?: ChannelState;
  }>(),
  {
    state: undefined,
  }
);

const meta = computed(() => {
  switch (props.state) {
    case 'enabled':
      return { color: 'success', text: '启用' };
    case 'disabled':
      return { color: 'default', text: '停用' };
    case 'pulling':
      return { color: 'processing', text: '拉取中' };
    case 'pull-failed':
      return { color: 'error', text: '拉取失败' };
    default:
      return undefined;
  }
});
</script>

<template>
  <a-badge v-if="props.state === 'pulling'" status="processing" text="拉取中" />
  <a-tag v-else-if="meta" :color="meta.color">{{ meta.text }}</a-tag>
  <span v-else class="state-placeholder">—</span>
</template>

<style scoped>
.state-placeholder {
  color: rgba(0, 0, 0, 0.45);
}
</style>
