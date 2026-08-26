<script setup lang="ts">
import { computed } from 'vue';
import type { HealthBand } from '@/api';
import { BAND_META, BAND_THRESHOLD_TEXT } from './constants';

defineOptions({ name: 'BandTag' });

const props = defineProps<{
  /** 档位（优 / 良 / 差）；无结果 / 过期为 null/undefined 时不渲染 */
  band?: HealthBand | null;
}>();

const meta = computed(() => (props.band ? BAND_META[props.band] : undefined));
</script>

<template>
  <a-tooltip v-if="meta" :title="`档位「${band}」=${meta.text}（阈值 ${BAND_THRESHOLD_TEXT}）`">
    <a-tag :color="meta.color">{{ band }}</a-tag>
  </a-tooltip>
</template>
