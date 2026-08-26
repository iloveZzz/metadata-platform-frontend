<script setup lang="ts">
import { STATE_TAG_TEXT } from './constants';

defineOptions({ name: 'StateTag' });

defineProps<{
  /** 独立展示态：expired=过期（标灰 + 提示重新接入）；noresult=无结果 */
  state: 'expired' | 'noresult';
}>();
</script>

<template>
  <a-tooltip :title="STATE_TAG_TEXT[state]">
    <a-tag color="default">{{ state === 'expired' ? '过期' : '无结果' }}</a-tag>
  </a-tooltip>
</template>
