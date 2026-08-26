<script setup lang="ts">
import type { DatasourceCatalogItem } from '../type';

defineOptions({ name: 'DatasourceCard' });

interface Props {
  item: DatasourceCatalogItem;
  createdCount?: number;
  collectedCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  createdCount: 0,
  collectedCount: 0,
});

const emit = defineEmits<{
  (e: 'click', item: DatasourceCatalogItem): void;
}>();
</script>

<template>
  <div class="datasource-card" @click="emit('click', props.item)">
    <div class="datasource-card__top">
      <div class="datasource-card__header">
        <div class="datasource-card__icon" :style="{ backgroundColor: props.item.brandColor }">
          {{ props.item.logoText }}
        </div>
        <div class="datasource-card__title" :title="props.item.name">
          {{ props.item.name }}
        </div>
      </div>

      <div class="datasource-card__stats">
        <div class="datasource-card__stat-item">
          <span class="stat-label">已采集</span>
          <span class="stat-num">{{ props.collectedCount }}</span>
        </div>
        <div class="datasource-card__stat-item">
          <span class="stat-label">已创建</span>
          <span class="stat-num">{{ props.createdCount }}</span>
        </div>
      </div>
    </div>

    <div class="datasource-card__meta">
      <div class="meta-line" :title="props.item.supportedObjects">
        <span class="meta-label">采集对象类型：</span>
        <span class="meta-val">{{ props.item.supportedObjects }}</span>
      </div>
      <div v-if="props.item.supportedVersions" class="meta-line" :title="props.item.supportedVersions">
        <span class="meta-label">支持版本：</span>
        <span class="meta-val">{{ props.item.supportedVersions }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.datasource-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 156px;
  box-sizing: border-box;

  &:hover {
    border-color: #1677ff;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }

  &__top {
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    color: #ffffff;
    margin-right: 12px;
    flex-shrink: 0;
    user-select: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
  }

  &__stats {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #4b5563;
  }

  &__stat-item {
    display: flex;
    align-items: baseline;

    .stat-label {
      color: #6b7280;
    }

    .stat-num {
      font-weight: 600;
      color: #111827;
      margin-left: 6px;
      font-size: 14px;
    }
  }

  &__meta {
    font-size: 12px;
    color: #6b7280;
    border-top: 1px dashed #f0f0f0;
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-line {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
  }

  .meta-label {
    color: #9ca3af;
  }

  .meta-val {
    color: #4b5563;
  }
}
</style>
