<script setup lang="ts">
import { ref } from 'vue';
import { InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons-vue';
import { YTable } from '@yss-ui/components';
import { FIELD_COLUMNS, VERSION_COLUMNS } from '../constant';
import { getClassificationMeta } from '../../Asset/constant';
import ColumnImpactDrawer from '../../Lineage/components/ColumnImpactDrawer.vue';
import type { AssetDetailItem } from '../type';

defineOptions({ name: 'AssetDetailTabs' });

const props = defineProps<{
  detail: AssetDetailItem;
}>();

const impactDrawerVisible = ref(false);
const currentImpactCol = ref<{ assetId: string; columnId: string; columnName: string } | null>(null);

const handleOpenImpact = (row: any) => {
  currentImpactCol.value = {
    assetId: props.detail.id,
    columnId: row.id || row.name,
    columnName: row.name,
  };
  impactDrawerVisible.value = true;
};

const formatRowCount = (count?: number | string): string => {
  if (count === undefined || count === null || count === '') return '147,657';
  const num = Number(count);
  return isNaN(num) ? String(count) : num.toLocaleString();
};
</script>

<template>
  <div class="asset-detail-tabs-container">
    <a-tabs default-active-key="table_detail" class="asset-detail-main-tabs">
      <!-- 1. 表详情 Tab -->
      <a-tab-pane key="table_detail" tab="表详情">
        <div class="table-detail-content">
          <!-- 业务属性 -->
          <div class="attribute-section">
            <div class="section-header">
              <span class="section-title">业务属性</span>
            </div>
            <div class="attribute-table">
              <div class="attribute-row">
                <div class="attribute-label">来源系统</div>
                <div class="attribute-value">
                  {{ detail.sourceSystem || '元数据采集系统demo' }}
                </div>
              </div>
            </div>
          </div>

          <!-- 技术属性 -->
          <div class="attribute-section">
            <div class="section-header">
              <span class="section-title">技术属性</span>
            </div>
            <div class="attribute-table">
              <div class="attribute-row">
                <div class="attribute-label">描述</div>
                <div class="attribute-value">
                  {{ detail.description || '—' }}
                </div>
                <div class="attribute-label">表行数</div>
                <div class="attribute-value">
                  {{ formatRowCount(detail.rowCount) }}
                </div>
              </div>
              <div class="attribute-row">
                <div class="attribute-label">存储量</div>
                <div class="attribute-value">
                  {{ detail.storageSize || '12.03MB' }}
                </div>
                <div class="attribute-label">所属 Database</div>
                <div class="attribute-value">
                  {{ detail.databaseName || detail.schemaName || 'dataphin01' }}
                </div>
              </div>
              <div class="attribute-row">
                <div class="attribute-label">最新版本</div>
                <div class="attribute-value">
                  {{ detail.version || 'V2026.08.23.221530' }}
                </div>
                <div class="attribute-label">最后更新时间</div>
                <div class="attribute-value">
                  {{ detail.updatedAt ? String(detail.updatedAt).replace('T', ' ') : '—' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- 2. 字段详情 Tab -->
      <a-tab-pane key="field_detail" tab="字段详情">
        <div class="field-detail-content">
          <YTable :data="detail.columns ?? []" :columns="FIELD_COLUMNS" :row-config="{ keyField: 'id', useKey: true }">
            <template #ordinalPosition="{ row, rowIndex }">
              <span class="column-ordinal-seq">{{ row.ordinalPosition || rowIndex + 1 }}</span>
            </template>
            <template #name="{ row }">
              <a-typography-text code>{{ row.name }}</a-typography-text>
            </template>
            <template #pk="{ row }">
              <a-tag v-if="row.pk" color="gold">PK</a-tag>
              <span v-else>—</span>
            </template>
            <template #classification="{ row }">
              <a-tag :color="getClassificationMeta(row.classification).color">
                {{ getClassificationMeta(row.classification).label }}
              </a-tag>
            </template>
            <template #actions="{ row }">
              <a-button type="link" size="small" @click="handleOpenImpact(row)">
                <template #icon><ThunderboltOutlined /></template>
                影响分析
              </a-button>
            </template>
          </YTable>
        </div>
      </a-tab-pane>

      <!-- 3. 版本管理 Tab -->
      <a-tab-pane key="version_manage">
        <template #tab>
          <span>
            版本管理
            <a-tooltip title="记录元数据表 Schema 演进历史与字段变更 Diff 记录">
              <InfoCircleOutlined class="tab-info-icon" />
            </a-tooltip>
          </span>
        </template>
        <div class="version-manage-content">
          <YTable
            :data="detail.versions ?? []"
            :columns="VERSION_COLUMNS"
            :row-config="{ keyField: 'id', useKey: true }"
          />
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 字段级下游爆炸半径影响分析抽屉 -->
    <ColumnImpactDrawer
      v-model:visible="impactDrawerVisible"
      :asset-id="currentImpactCol?.assetId"
      :column-id="currentImpactCol?.columnId"
      :column-name="currentImpactCol?.columnName"
    />
  </div>
</template>

<style scoped lang="less">
@import url('@/styles/variables.less');

.asset-detail-tabs-container {
  width: 100%;
  height: 100%;

  :deep(.ant-tabs-nav) {
    margin-bottom: 16px;
  }

  .tab-info-icon {
    margin-left: 4px;
    font-size: 13px;
    color: var(--text-color-secondary, rgba(0, 0, 0, 0.45));
    cursor: pointer;

    &:hover {
      color: var(--primary-color, #1890ff);
    }
  }

  .table-detail-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .attribute-section {
    .section-header {
      margin-bottom: 12px;

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color, rgba(0, 0, 0, 0.85));
        position: relative;
        padding-left: 10px;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 3px;
          bottom: 3px;
          width: 3px;
          background-color: var(--primary-color, #1890ff);
          border-radius: 2px;
        }
      }
    }

    .attribute-table {
      border: 1px solid var(--border-color-split, #f0f0f0);
      border-radius: 4px;
      overflow: hidden;

      .attribute-row {
        display: flex;
        align-items: stretch;
        border-bottom: 1px solid var(--border-color-split, #f0f0f0);

        &:last-child {
          border-bottom: none;
        }
      }

      .attribute-label {
        width: 140px;
        padding: 10px 16px;
        background-color: var(--bg-color-secondary, #fafafa);
        color: var(--text-color-secondary, rgba(0, 0, 0, 0.65));
        font-size: 13px;
        border-right: 1px solid var(--border-color-split, #f0f0f0);
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .attribute-value {
        flex: 1;
        padding: 10px 16px;
        color: var(--text-color, rgba(0, 0, 0, 0.88));
        font-size: 13px;
        display: flex;
        align-items: center;

        &:not(:last-child) {
          border-right: 1px solid var(--border-color-split, #f0f0f0);
        }
      }
    }
  }

  .field-detail-content,
  .version-manage-content {
    background: var(--bg-color-container, #fff);
  }

  .column-ordinal-seq {
    color: var(--text-color-secondary, rgba(0, 0, 0, 0.45));
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
}
</style>
