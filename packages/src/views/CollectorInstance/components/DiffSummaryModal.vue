<template>
  <a-modal
    v-model:open="visible"
    title="采集变更概览"
    width="920px"
    :footer="null"
    class="diff-summary-modal"
    destroy-on-close
  >
    <a-spin :spinning="loading">
      <div v-if="summary" class="diff-summary-content">
        <!-- 1. 采集基础信息卡片 -->
        <div class="diff-summary__info-bar">
          <div class="info-item">
            <span class="info-label">数据源：</span>
            <span class="info-value font-medium">{{ summary.datasourceName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">采集范围：</span>
            <span class="info-value">{{ summary.collectScope || '全部 Database' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">采集策略：</span>
            <span class="info-value">{{ summary.collectStrategy || '增量比对' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">执行时间：</span>
            <span class="info-value">{{ formatTime(summary.executionTime) }}</span>
          </div>
        </div>

        <!-- 2. 对象统计看板 -->
        <div class="diff-summary__stats-grid">
          <div class="stat-card stat-card--total">
            <div class="stat-card__title">采集对象总数</div>
            <div class="stat-card__value">{{ summary.totalObjects }}</div>
            <div class="stat-card__sub">
              表 {{ summary.totalTables }} · 视图 {{ summary.totalViews }} · 字段 {{ summary.totalColumns }}
            </div>
          </div>
          <div class="stat-card stat-card--added">
            <div class="stat-card__title">新增对象统计</div>
            <div class="stat-card__value text-success">+{{ summary.addedObjects }}</div>
            <div class="stat-card__sub">
              +{{ summary.addedTables }} 表 · +{{ summary.addedViews }} 视图 · +{{ summary.addedColumns }} 字段
            </div>
          </div>
          <div class="stat-card stat-card--updated">
            <div class="stat-card__title">更新对象统计</div>
            <div class="stat-card__value text-warning">~{{ summary.updatedObjects }}</div>
            <div class="stat-card__sub">
              ~{{ summary.updatedTables }} 表 · ~{{ summary.updatedViews }} 视图 · ~{{ summary.updatedColumns }} 字段
            </div>
          </div>
          <div class="stat-card stat-card--deleted">
            <div class="stat-card__title">删除对象统计</div>
            <div class="stat-card__value text-error">-{{ summary.deletedObjects }}</div>
            <div class="stat-card__sub">
              -{{ summary.deletedTables }} 表 · -{{ summary.deletedViews }} 视图 · -{{ summary.deletedColumns }} 字段
            </div>
          </div>
        </div>

        <!-- 3. 变更明细 Tabs -->
        <div class="diff-summary__tabs-wrapper">
          <div class="diff-summary__filter-row">
            <a-radio-group v-model:value="filterDiffType" size="small" button-style="solid">
              <a-radio-button value="ALL">全部 ({{ allCount }})</a-radio-button>
              <a-radio-button value="ADDED">新增 ({{ summary.addedObjects }})</a-radio-button>
              <a-radio-button value="UPDATED">更新 ({{ summary.updatedObjects }})</a-radio-button>
              <a-radio-button value="DELETED">删除 ({{ summary.deletedObjects }})</a-radio-button>
            </a-radio-group>

            <a-input
              v-model:value="searchKeyword"
              placeholder="搜索表名/视图名/字段名..."
              size="small"
              allow-clear
              style="width: 220px"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </div>

          <a-tabs v-model:active-key="activeTab" class="diff-summary__tabs">
            <!-- Tab 1: 表明细 -->
            <a-tab-pane key="tables" :tab="`表明细 (${filteredTables.length})`">
              <a-table
                :data-source="filteredTables"
                :columns="tableColumns"
                :pagination="{ pageSize: 5, size: 'small' }"
                size="small"
                row-key="tableName"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'diffType'">
                    <a-tag :color="getDiffTypeTagColor(record.diffType)">
                      {{ getDiffTypeLabel(record.diffType) }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'tableName'">
                    <span class="font-medium text-primary">{{ record.tableName }}</span>
                  </template>
                  <template v-else-if="column.key === 'updatedAt'">
                    {{ formatTime(record.updatedAt) }}
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- Tab 2: 视图明细 -->
            <a-tab-pane key="views" :tab="`视图明细 (${filteredViews.length})`">
              <a-table
                :data-source="filteredViews"
                :columns="viewColumns"
                :pagination="{ pageSize: 5, size: 'small' }"
                size="small"
                row-key="viewName"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'diffType'">
                    <a-tag :color="getDiffTypeTagColor(record.diffType)">
                      {{ getDiffTypeLabel(record.diffType) }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'viewName'">
                    <span class="font-medium text-primary">{{ record.viewName }}</span>
                  </template>
                  <template v-else-if="column.key === 'updatedAt'">
                    {{ formatTime(record.updatedAt) }}
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- Tab 3: 字段明细 -->
            <a-tab-pane key="columns" :tab="`字段明细 (${filteredColumns.length})`">
              <a-table
                :data-source="filteredColumns"
                :columns="columnColumns"
                :pagination="{ pageSize: 5, size: 'small' }"
                size="small"
                row-key="columnName"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'diffType'">
                    <a-tag :color="getDiffTypeTagColor(record.diffType)">
                      {{ getDiffTypeLabel(record.diffType) }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'columnName'">
                    <span class="font-medium text-primary">{{ record.columnName }}</span>
                  </template>
                  <template v-else-if="column.key === 'dataType'">
                    <code>{{ record.dataType }}</code>
                  </template>
                  <template v-else-if="column.key === 'updatedAt'">
                    {{ formatTime(record.updatedAt) }}
                  </template>
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
      <a-empty v-else description="暂无变更比对数据" />
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { SearchOutlined } from '@ant-design/icons-vue';
import { getCollectorInstanceDiffSummary } from '@/api/collector-instance';
import type { TableColumnsType } from 'ant-design-vue';
import type { MetadataDiffSummary, TableDiffItem, ViewDiffItem, ColumnDiffItem } from '../type';

const props = defineProps<{
  open: boolean;
  instanceId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const visible = computed({
  get: () => props.open,
  set: val => emit('update:open', val),
});

const loading = ref(false);
const summary = ref<MetadataDiffSummary | null>(null);
const activeTab = ref('tables');
const filterDiffType = ref<'ALL' | 'ADDED' | 'UPDATED' | 'DELETED'>('ALL');
const searchKeyword = ref('');

const formatTime = (time?: string) => {
  if (!time) return '—';
  return time.replace('T', ' ').substring(0, 19);
};

const getDiffTypeTagColor = (type?: string) => {
  switch (type) {
    case 'ADDED':
      return 'success';
    case 'UPDATED':
      return 'warning';
    case 'DELETED':
      return 'error';
    default:
      return 'default';
  }
};

const getDiffTypeLabel = (type?: string) => {
  switch (type) {
    case 'ADDED':
      return '新增';
    case 'UPDATED':
      return '更新';
    case 'DELETED':
      return '删除';
    default:
      return type || '—';
  }
};

const fetchDiffSummary = async (id: string) => {
  loading.value = true;
  try {
    const res = await getCollectorInstanceDiffSummary(id);
    summary.value = res.data;
  } catch {
    summary.value = null;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  val => {
    if (val && props.instanceId) {
      fetchDiffSummary(props.instanceId);
    }
  },
  { immediate: true }
);

const allCount = computed(() => {
  if (!summary.value) return 0;
  return summary.value.addedObjects + summary.value.updatedObjects + summary.value.deletedObjects;
});

const filteredTables = computed(() => {
  if (!summary.value?.tableDetails) return [];
  return summary.value.tableDetails.filter(item => {
    if (filterDiffType.value !== 'ALL' && item.diffType !== filterDiffType.value) return false;
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      return (
        item.tableName.toLowerCase().includes(kw) ||
        (item.changeDescription && item.changeDescription.toLowerCase().includes(kw))
      );
    }
    return true;
  });
});

const filteredViews = computed(() => {
  if (!summary.value?.viewDetails) return [];
  return summary.value.viewDetails.filter(item => {
    if (filterDiffType.value !== 'ALL' && item.diffType !== filterDiffType.value) return false;
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      return (
        item.viewName.toLowerCase().includes(kw) ||
        (item.changeDescription && item.changeDescription.toLowerCase().includes(kw))
      );
    }
    return true;
  });
});

const filteredColumns = computed(() => {
  if (!summary.value?.columnDetails) return [];
  return summary.value.columnDetails.filter(item => {
    if (filterDiffType.value !== 'ALL' && item.diffType !== filterDiffType.value) return false;
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      return (
        item.tableName.toLowerCase().includes(kw) ||
        item.columnName.toLowerCase().includes(kw) ||
        (item.changeDescription && item.changeDescription.toLowerCase().includes(kw))
      );
    }
    return true;
  });
});

const tableColumns: TableColumnsType<TableDiffItem> = [
  { title: '表名', dataIndex: 'tableName', key: 'tableName', minWidth: 180 },
  { title: '变更类型', dataIndex: 'diffType', key: 'diffType', width: 90, align: 'center' },
  { title: '字段数', dataIndex: 'columnCount', key: 'columnCount', width: 80, align: 'right' },
  { title: '行数', dataIndex: 'rowCount', key: 'rowCount', width: 100, align: 'right' },
  { title: '变更说明', dataIndex: 'changeDescription', key: 'changeDescription', minWidth: 160 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150 },
];

const viewColumns: TableColumnsType<ViewDiffItem> = [
  { title: '视图名', dataIndex: 'viewName', key: 'viewName', minWidth: 180 },
  { title: '变更类型', dataIndex: 'diffType', key: 'diffType', width: 90, align: 'center' },
  { title: '视图 SQL 定义', dataIndex: 'definitionSql', key: 'definitionSql', ellipsis: true },
  { title: '变更说明', dataIndex: 'changeDescription', key: 'changeDescription', minWidth: 160 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150 },
];

const columnColumns: TableColumnsType<ColumnDiffItem> = [
  { title: '所属表', dataIndex: 'tableName', key: 'tableName', minWidth: 150 },
  { title: '字段名', dataIndex: 'columnName', key: 'columnName', minWidth: 140 },
  { title: '数据类型', dataIndex: 'dataType', key: 'dataType', width: 120 },
  { title: '变更类型', dataIndex: 'diffType', key: 'diffType', width: 90, align: 'center' },
  { title: '变更说明', dataIndex: 'changeDescription', key: 'changeDescription', minWidth: 160 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 150 },
];
</script>

<style lang="less" scoped>
.diff-summary-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.diff-summary__info-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;

  .info-item {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .info-label {
      color: #64748b;
      flex-shrink: 0;
    }
    .info-value {
      color: #1e293b;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.diff-summary__stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  .stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

    &__title {
      font-size: 12px;
      color: #64748b;
    }
    &__value {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
    }
    &__sub {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }

    &--total &__value {
      color: #0f172a;
    }
    &--added {
      border-color: #bbf7d0;
      background: #f0fdf4;
    }
    &--updated {
      border-color: #fed7aa;
      background: #fffbeb;
    }
    &--deleted {
      border-color: #fecaca;
      background: #fef2f2;
    }
  }
}

.diff-summary__filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.text-success {
  color: #16a34a !important;
}
.text-warning {
  color: #d97706 !important;
}
.text-error {
  color: #dc2626 !important;
}
.text-primary {
  color: #2563eb;
}
.font-medium {
  font-weight: 500;
}
</style>
