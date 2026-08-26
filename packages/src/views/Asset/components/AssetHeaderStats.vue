<template>
  <div class="asset-header-stats">
    <div class="stats-left">
      <span class="system-title">{{ systemName || '全部元数据' }}</span>
      <span class="count-number">{{ totalCount }}</span>
      <span class="count-unit">个元数据</span>
      <a-tooltip title="统计当前已纳管的全部元数据实体总量（含数据表、视图及数据字典）">
        <InfoCircleOutlined class="info-icon" />
      </a-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { InfoCircleOutlined } from '@ant-design/icons-vue';

defineOptions({ name: 'AssetHeaderStats' });

defineProps<{
  systemName?: string;
  totalCount: number;
}>();
</script>

<style scoped lang="less">
.asset-header-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 12px 0;
  background: transparent;
  flex-shrink: 0;

  .stats-left {
    display: flex;
    align-items: baseline;
    gap: 6px;

    .system-title {
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
    }

    .count-number {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      line-height: 1;
      margin: 0 2px;
    }

    .count-unit {
      font-size: 13px;
      color: #6b7280;
    }

    .info-icon {
      font-size: 13px;
      color: #9ca3af;
      cursor: help;
      transition: color 0.2s;

      &:hover {
        color: #2563eb;
      }
    }
  }
}
</style>
