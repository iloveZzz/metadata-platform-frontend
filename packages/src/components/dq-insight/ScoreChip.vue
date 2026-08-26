<script setup lang="ts">
import { computed } from 'vue';
import type { HealthBand, HealthState } from '@/api';
import BandTag from './BandTag.vue';
import { BAND_META } from './constants';

defineOptions({ name: 'ScoreChip' });

const props = withDefaults(
  defineProps<{
    /** 健康分状态（ok=已计算 / expired=过期 / noresult=无结果 / calculating=计算中） */
    state?: HealthState;
    /** 健康分 0~100（noresult 时为 null） */
    score?: number | null;
    /** 档位（过期 / 无结果时为 null） */
    band?: HealthBand | null;
    /** 过期态字段（独立展示态，与「无结果」区分） */
    expired?: boolean;
    /** 大号展示（资产视图大数字） */
    big?: boolean;
    /** 可点击钻取（点击分数 → 规则明细） */
    clickable?: boolean;
  }>(),
  {
    state: undefined,
    score: null,
    band: null,
    expired: false,
    big: false,
    clickable: false,
  }
);

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const isExpired = computed(() => props.expired || props.state === 'expired');
const isNoResult = computed(() => props.state === 'noresult');

/** 已计算档位的芯片颜色 class（优 green / 良 amber / 差 red） */
const chipClass = computed(() => {
  if (!props.band) return '';
  return BAND_META[props.band].color === 'success'
    ? 'chip-ok'
    : BAND_META[props.band].color === 'warning'
      ? 'chip-mid'
      : 'chip-bad';
});

const handleClick = () => {
  if (props.clickable) {
    emit('click');
  }
};
</script>

<template>
  <!-- 过期独立展示态：分数标灰 + 过期 tag（OQ-03 已确认） -->
  <a-tooltip v-if="isExpired" title="结果已过期，请重新接入；点击可查看历史规则明细">
    <span
      class="score-chip chip-expired"
      :class="{ 'chip-big': big, clickable }"
      :role="clickable ? 'button' : undefined"
      :tabindex="clickable ? 0 : undefined"
      @click="handleClick"
      @keydown.enter="handleClick"
    >
      <template v-if="score !== null && score !== undefined">{{ score }}<span class="unit">分</span></template>
      <a-tag>过期</a-tag>
    </span>
  </a-tooltip>

  <!-- 无结果独立展示态：暂无 + 无结果 tag（SB-07 已确认） -->
  <a-tooltip v-else-if="isNoResult" title="未接入质量结果">
    <span class="score-chip chip-nr" :class="{ 'chip-big': big }">
      <span class="unit">暂无</span>
      <a-tag>无结果</a-tag>
    </span>
  </a-tooltip>

  <!-- 已计算：分数 + 档位徽标，可点击钻取规则明细（DQI-004） -->
  <a-tooltip v-else :title="clickable ? '点击分数进入规则明细钻取（DQI-004）' : undefined">
    <span
      class="score-chip"
      :class="[chipClass, { 'chip-big': big, clickable }]"
      :role="clickable ? 'button' : undefined"
      :tabindex="clickable ? 0 : undefined"
      @click="handleClick"
      @keydown.enter="handleClick"
    >
      {{ score }}<span class="unit">分</span>
      <BandTag :band="band" />
    </span>
  </a-tooltip>
</template>

<style scoped>
.score-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  cursor: default;
  white-space: nowrap;
}
.score-chip .unit {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
  margin-right: 2px;
}
.score-chip.chip-ok {
  color: #389e0d;
}
.score-chip.chip-mid {
  color: #d48806;
}
.score-chip.chip-bad {
  color: #cf1322;
}
.score-chip.chip-expired,
.score-chip.chip-nr {
  color: #8c8c8c;
}
.score-chip.chip-big {
  font-size: 30px;
  line-height: 1;
}
.score-chip.chip-big .unit {
  font-size: 15px;
}
.score-chip.clickable {
  cursor: pointer;
  border-bottom: 1px dashed currentColor;
}
.score-chip.clickable:hover {
  opacity: 0.75;
}
</style>
