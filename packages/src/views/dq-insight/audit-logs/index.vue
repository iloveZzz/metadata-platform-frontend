<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { YTable, type YTableColumn } from '@yss-ui/components';
import { GetDqAuditlogsAction } from '@/api';
import Perm403 from '@/components/dq-insight/Perm403.vue';
import { useAuditLogs } from './hooks/useAuditLogs';

defineOptions({ name: 'AuditLogsPage' });

const {
  filters,
  pagination,
  list,
  loading,
  isForbidden,
  hasError,
  query,
  onFilterChange,
  onPageChange,
  onSizeChange,
  retry,
} = useAuditLogs();

onMounted(() => {
  query();
});

const paginationProps = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  remote: true,
  showTotal: (total: number) => `共 ${total} 条`,
}));

const columns: YTableColumn[] = [
  { field: 'time', title: '时间', minWidth: 170 },
  { field: 'operator', title: '操作者', width: 140 },
  { field: 'action', title: '动作', width: 160 },
  { field: 'object', title: '对象', minWidth: 200 },
  { field: 'result', title: '结果', width: 100 },
];

const ACTION_TEXT: Record<GetDqAuditlogsAction, string> = {
  ingest: '接入 · 批次入库',
  'parse-fail': '接入 · 解析失败',
  'health-calc': '健康分计算',
  'channel-config': '配置变更',
  'channel-toggle': '通道启停',
  'channel-retry': '通道重试拉取',
  'linkage-map': '人工映射',
};

const actionText = (action?: GetDqAuditlogsAction) => (action ? ACTION_TEXT[action] : '—');
const actionOptions = Object.entries(ACTION_TEXT).map(([value, label]) => ({ value, label }));
</script>

<template>
  <div class="audit-logs-page">
    <a-breadcrumb style="margin-bottom: 12px" :items="[{ title: '数据质量' }, { title: '审计日志' }]" />

    <Perm403
      v-if="isForbidden"
      desc="仅管理员可查看审计日志（AUDIT_QUERY）。域外 / 无权限访问不展示内容（DQI-007）。"
    />

    <template v-else>
      <div class="page-header-row">
        <div>
          <h4 class="page-title">审计日志</h4>
          <span class="page-desc">接入 / 计算 / 配置变更审计（只读不可变，append-only；DQI-007）</span>
        </div>
      </div>

      <a-alert
        style="margin-bottom: 16px"
        type="info"
        show-icon
        message="接入 / 计算 / 配置变更审计（只读不可变）"
        description="审计范围与主平台审计共享与否见 OQ-05（待确认）；本页仅管理员可查。"
      />

      <div class="toolbar">
        <a-select
          v-model:value="filters.action"
          allow-clear
          placeholder="动作"
          style="width: 200px"
          :options="actionOptions"
          @change="onFilterChange"
        />
      </div>

      <a-card v-if="hasError" :bordered="false">
        <a-alert type="error" show-icon message="审计日志请求失败">
          <template #description>可重试错误，不清空筛选条件。</template>
          <template #action>
            <a-button size="small" @click="retry">重试</a-button>
          </template>
        </a-alert>
      </a-card>

      <a-card v-else :bordered="false" class="table-card">
        <YTable
          :columns="columns"
          :data="list"
          :pageable="true"
          :pagination="paginationProps"
          :row-config="{ keyField: 'id', useKey: true }"
          :loading="loading"
          @page-change="onPageChange"
          @size-change="onSizeChange"
        >
          <template #action="{ row }">{{ actionText(row.action) }}</template>
          <template #result="{ row }">
            <a-tag :color="row.result === 'success' ? 'success' : 'error'">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </a-tag>
          </template>
        </YTable>
        <div v-if="list.length === 0 && !loading" class="empty-page">
          当前筛选条件下无审计记录（0 条记录为空分页结果，非错误）
        </div>
      </a-card>
    </template>
  </div>
</template>

<style scoped>
.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.page-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
.page-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  align-items: center;
}
.empty-page {
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
