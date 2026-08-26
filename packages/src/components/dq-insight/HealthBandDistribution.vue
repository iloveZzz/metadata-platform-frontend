<script setup lang="ts">
import { computed } from 'vue';
import type { DashboardStatsBandDistribution } from '@/api';
import { DIST_SEGMENT_META } from './constants';

defineOptions({ name: 'HealthBandDistribution' });

const props = withDefaults(
  defineProps<{
    /** 健康分分布（优 / 良 / 差 + 过期 / 无结果独立展示态） */
    distribution?: DashboardStatsBandDistribution;
    /** 分布基数（数据域内可见目标资产数）；<=0 时不渲染条 */
    total?: number;
  }>(),
  {
    distribution: undefined,
    total: 0,
  }
);

/** 分布条分段（仅渲染数量 > 0 的段） */
const segments = computed(() =>
  DIST_SEGMENT_META.map(seg => ({
    ...seg,
    n: props.distribution?.[seg.key] ?? 0,
  })).filter(seg => seg.n > 0)
);

/** 图例（含 0 数量段，展示完整口径） */
const legend = computed(() =>
  DIST_SEGMENT_META.map(seg => ({
    ...seg,
    n: props.distribution?.[seg.key] ?? 0,
  }))
);

const total = computed(() => Math.max(props.total, 0));

const segmentWidth = (n: number) => (total.value > 0 ? `${(n / total.value) * 100}%` : '0%');
</script>

<template>
  <div class="dist-block">
    <div v-if="total > 0 && segments.length > 0" class="dist-bar">
      <div
        v-for="seg in segments"
        :key="seg.key"
        class="dist-seg"
        :class="seg.cls"
        :style="{ width: segmentWidth(seg.n) }"
        :title="`${seg.label} ${seg.n}`"
      />
    </div>
    <div v-else class="dist-bar dist-bar-empty" />
    <div class="dist-legend">
      <span v-for="seg in legend" :key="seg.key" class="dist-legend-item">
        <i class="legend-dot" :class="seg.cls" />{{ seg.label }} {{ seg.n }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.dist-block {
  width: 100%;
}
.dist-bar {
  display: flex;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: #f0f0f0;
  margin: 12px 0 8px;
}
.dist-bar-empty {
  background: #f0f0f0;
}
.dist-seg {
  height: 100%;
}
.dist-seg.ok {
  background: #52c41a;
}
.dist-seg.mid {
  background: #faad14;
}
.dist-seg.bad {
  background: #ff4d4f;
}
.dist-seg.expired {
  background: #8c8c8c;
}
.dist-seg.noresult {
  background: #bfbfbf;
}
.dist-legend {
  font-size: 12px;
  color: #595959;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 4px;
  vertical-align: -1px;
}
.legend-dot.ok {
  background: #52c41a;
}
.legend-dot.mid {
  background: #faad14;
}
.legend-dot.bad {
  background: #ff4d4f;
}
.legend-dot.expired {
  background: #8c8c8c;
}
.legend-dot.noresult {
  background: #bfbfbf;
}
</style>
