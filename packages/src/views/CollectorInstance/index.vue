<template>
  <div class="collector-instance-page">
    <YCard class="collector-instance-card" :bordered="false">
      <!-- 1. 顶部操作与筛选栏 -->
      <div class="instance-toolbar">
        <div class="instance-toolbar__left">
          <a-checkbox v-model:checked="filterState.onlyMyTasks" class="custom-checkbox"> 我负责的任务实例 </a-checkbox>
          <a-checkbox v-model:checked="filterState.onlyMyExecuted" class="custom-checkbox"> 我执行的 </a-checkbox>
          <a-checkbox v-model:checked="filterState.onlyFailed" class="custom-checkbox custom-checkbox--danger">
            仅失败实例
          </a-checkbox>

          <!-- 高级筛选 Popover -->
          <InstanceFilterPopover :filter-state="filterState" @change="handleFilterChange" />
        </div>

        <div class="instance-toolbar__right">
          <!-- 精准 Placeholder 搜索框 -->
          <a-input
            v-model:value="filterState.keyword"
            placeholder="请输入实例名称/任务名称/数据源"
            allow-clear
            class="search-input"
            @press-enter="fetchList"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </a-input>

          <a-button @click="fetchList">
            <template #icon><RedoOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>

      <!-- 2. 表格展示区域 (标准 YTable 封装) -->
      <div ref="tableAreaRef" class="instance-table-area">
        <YTable
          v-model:selected-row-keys="selectedRowKeys"
          :columns="INSTANCE_COLUMNS"
          :data="filteredList"
          :loading="loading"
          :pageable="true"
          :pagination="pagination"
          :row-config="{ isCurrent: true, isHover: true, useKey: true, keyField: 'id' }"
          :max-height="tableHeight"
          @page-change="onPageChange"
          @size-change="onSizeChange"
        >
          <!-- 1. 实例名称 (带数据库方形图标 + 下方关联任务名) -->
          <template #name="{ row }">
            <div class="instance-name-cell">
              <div class="name-icon-box">
                <DatabaseFilled class="name-icon" />
              </div>
              <div class="name-info">
                <a class="name-title" :title="row.name" @click="handleViewLogs(row)">
                  {{ row.name }}
                </a>
                <div class="name-sub" :title="row.collectorName || row.name">
                  关联任务: {{ row.collectorName || '—' }}
                </div>
              </div>
            </div>
          </template>

          <!-- 2. 数据来源类型 (MySQL / Oracle / ClickHouse 等彩色 Tag) -->
          <template #datasourceType="{ row }">
            <span class="datasource-type-tag">{{ row.datasourceType || '—' }}</span>
          </template>

          <!-- 3. 数据来源 (环境徽章 Dev/Prod + 数据源名称) -->
          <template #connectorName="{ row }">
            <div class="datasource-cell">
              <span
                v-if="getEnvBadge(row.connectorName)"
                :class="['env-badge', getEnvBadge(row.connectorName)?.toLowerCase()]"
              >
                {{ getEnvBadge(row.connectorName) }}
              </span>
              <span class="connector-name-text" :title="getCleanConnectorName(row.connectorName)">
                {{ getCleanConnectorName(row.connectorName) }}
              </span>
            </div>
          </template>

          <!-- 4. 任务负责人 -->
          <template #owner="{ row }">
            <span class="owner-text" :title="row.owner">{{ formatUserName(row.owner) }}</span>
          </template>

          <!-- 5. 执行方式 (双行排版) -->
          <template #executionMode="{ row }">
            <div class="mode-cell">
              <div class="mode-title">{{ getModeTitle(row) }}</div>
              <div v-if="getModeSub(row)" class="mode-sub">{{ getModeSub(row) }}</div>
            </div>
          </template>

          <!-- 6. 执行人 -->
          <template #executor="{ row }">
            <span class="executor-text" :title="row.executor">{{ formatUserName(row.executor) }}</span>
          </template>

          <!-- 7. 执行状态 (对勾/叉叉/小圆点 + 失败快捷日志查看) -->
          <template #status="{ row }">
            <div class="instance-status-cell">
              <span v-if="row.status === 'success'" class="status-indicator success">
                <CheckCircleFilled class="status-icon" /> 成功
              </span>
              <span v-else-if="row.status === 'failed'" class="status-indicator failed">
                <CloseCircleFilled class="status-icon" /> 失败
                <a-tooltip title="查看运行日志">
                  <FileTextOutlined class="log-quick-link" @click="handleViewLogs(row)" />
                </a-tooltip>
              </span>
              <span v-else-if="row.status === 'running'" class="status-indicator running">
                <span class="status-dot running-dot"></span> 运行中
              </span>
              <span v-else class="status-indicator pending"> <span class="status-dot pending-dot"></span> 等待中 </span>
            </div>
          </template>

          <!-- 8. 运行时间 (双行排版：耗时 / 开始时间) -->
          <template #duration="{ row }">
            <div v-if="row.durationMs !== undefined || row.startTime" class="duration-cell">
              <div class="duration-title">{{ getDisplayDuration(row) }}</div>
              <div v-if="row.startTime" class="duration-time-sub">{{ formatDateTime(row.startTime) }}</div>
            </div>
            <span v-else class="empty-cell-text">-</span>
          </template>

          <!-- 9. 操作列 (3 大核心操作图标) -->
          <template #action="{ row }">
            <div class="instance-actions">
              <!-- 状态操作组 -->
              <template v-if="row.status === 'running' || row.status === 'pending'">
                <a-tooltip title="终止实例">
                  <a-button
                    type="link"
                    size="small"
                    danger
                    class="action-icon-btn action-icon-btn--stop"
                    @click="handleTerminate(row)"
                  >
                    <StopOutlined />
                  </a-button>
                </a-tooltip>
              </template>
              <template v-else-if="row.status === 'failed'">
                <a-tooltip title="重跑实例">
                  <a-button
                    type="link"
                    size="small"
                    class="action-icon-btn action-icon-btn--rerun"
                    @click="handleRerun(row)"
                  >
                    <RedoOutlined />
                  </a-button>
                </a-tooltip>
                <a-tooltip title="采集变更概览">
                  <a-button type="link" size="small" class="action-icon-btn" @click="handleViewDiff(row)">
                    <FileSearchOutlined />
                  </a-button>
                </a-tooltip>
              </template>
              <template v-else>
                <a-tooltip title="采集变更概览">
                  <a-button type="link" size="small" class="action-icon-btn" @click="handleViewDiff(row)">
                    <FileSearchOutlined />
                  </a-button>
                </a-tooltip>
              </template>

              <!-- 查看运行日志 / Dlink 诊断 -->
              <a-tooltip title="查看运行日志">
                <a-button type="link" size="small" class="action-icon-btn" @click="handleViewLogs(row)">
                  <ProfileOutlined />
                </a-button>
              </a-tooltip>

              <!-- 查看采集任务 -->
              <a-tooltip title="查看采集任务">
                <a-button type="link" size="small" class="action-icon-btn" @click="handleGoToCollector(row)">
                  <LinkOutlined />
                </a-button>
              </a-tooltip>
            </div>
          </template>

          <!-- 空态渲染 -->
          <template #empty>
            <div class="custom-empty-state">
              <a-empty description="暂无采集实例数据" />
            </div>
          </template>
        </YTable>
      </div>

      <!-- 3. 底部浮动批量操作条 (勾选多行时浮现) -->
      <transition name="fade">
        <div v-if="selectedRowKeys.length > 0" class="floating-batch-bar">
          <div class="batch-bar__info">
            已选择 <span class="font-bold text-primary">{{ selectedRowKeys.length }}</span> 项
          </div>
          <div class="batch-bar__actions">
            <a-button type="primary" size="small" @click="handleBatchRerun">
              <template #icon><RedoOutlined /></template>
              批量重跑
            </a-button>
            <a-button danger size="small" @click="handleBatchTerminate">
              <template #icon><StopOutlined /></template>
              批量终止
            </a-button>
            <a-button type="link" size="small" @click="clearSelection"> 清除选择 </a-button>
          </div>
        </div>
      </transition>
    </YCard>

    <!-- 采集变更概览弹窗 -->
    <DiffSummaryModal v-model:open="diffModalVisible" :instance-id="selectedDiffInstanceId" />

    <!-- 运行日志与 Dlink 诊断抽屉 -->
    <ExecutionLogDrawer v-model:open="logDrawerVisible" :instance="selectedLogInstance" @refresh="fetchList" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { YCard, YTable } from '@yss-ui/components';
import {
  SearchOutlined,
  RedoOutlined,
  FileSearchOutlined,
  StopOutlined,
  ProfileOutlined,
  LinkOutlined,
  DatabaseFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  FileTextOutlined,
} from '@ant-design/icons-vue';
import { useCollectorInstanceList } from './hooks/useCollectorInstanceList';
import { INSTANCE_COLUMNS, formatDateTime, getDisplayDuration } from './constant';
import type { CollectorInstanceItem } from './type';
import DiffSummaryModal from './components/DiffSummaryModal.vue';
import ExecutionLogDrawer from './components/ExecutionLogDrawer.vue';
import InstanceFilterPopover from './components/InstanceFilterPopover.vue';

defineOptions({ name: 'CollectorInstanceManage' });

const tableAreaRef = ref<HTMLElement>();

const {
  loading,
  filteredList,
  filterState,
  pagination,
  tableHeight,
  selectedRowKeys,
  diffModalVisible,
  selectedDiffInstanceId,
  logDrawerVisible,
  selectedLogInstance,
  fetchList,
  onPageChange,
  onSizeChange,
  handleFilterChange,
  clearSelection,
  handleViewDiff,
  handleRerun,
  handleBatchRerun,
  handleTerminate,
  handleBatchTerminate,
  handleViewLogs,
  handleGoToCollector,
} = useCollectorInstanceList({ tableAreaRef });

const getEnvBadge = (name?: string): string | null => {
  if (!name) return null;
  if (/^dev[ _]/i.test(name)) return 'Dev';
  if (/^prod[ _]/i.test(name)) return 'Prod';
  return null;
};

const getCleanConnectorName = (name?: string): string => {
  if (!name) return '—';
  return name.replace(/^(Dev|Prod)[ _]/i, '');
};

const formatUserName = (val?: string): string => {
  if (!val) return '—';
  if (val === '1397905662202719') return 'SuperAdmin';
  return val;
};

const getModeTitle = (row: CollectorInstanceItem): string => {
  if (row.executionMode === 'manual') {
    return row.scheduleDescription || '临时手动执行';
  }
  return '定时执行';
};

const getModeSub = (row: CollectorInstanceItem): string | null => {
  if (row.executionMode === 'schedule') {
    return row.scheduleDescription || '每日, 04:17';
  }
  return null;
};
</script>

<style scoped lang="less">
@import './style.less';
</style>
