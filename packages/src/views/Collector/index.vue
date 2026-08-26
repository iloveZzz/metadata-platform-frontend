<template>
  <div class="collector-page">
    <YCard class="collector-page__card" :bordered="false">
      <!-- 顶部 Header 与过滤工具栏 -->
      <div class="collector-page__header">
        <!-- 标题区 -->
        <div class="collector-page__title-box">
          <span class="collector-page__title">采集任务</span>
          <a-tooltip title="管理元数据采集任务的生命周期、调度周期与生效状态，支持立即执行、局部重采与调度配置">
            <InfoCircleOutlined class="collector-page__info-icon" />
          </a-tooltip>
        </div>

        <!-- 控件与过滤区 -->
        <div class="collector-page__toolbar">
          <!-- 快捷复选框 1：我负责的任务 -->
          <a-checkbox v-model:checked="filterState.onlyMyTasks" class="toolbar-checkbox"> 我负责的任务 </a-checkbox>

          <!-- 快捷复选框 2：生效任务 -->
          <a-checkbox v-model:checked="filterState.onlyActive" class="toolbar-checkbox"> 生效任务 </a-checkbox>

          <!-- 高级筛选 Popover -->
          <a-popover
            v-model:open="filterPopoverOpen"
            trigger="click"
            placement="bottomRight"
            overlay-class-name="collector-filter-popover"
          >
            <template #content>
              <div class="filter-popover-content">
                <div class="filter-popover-header">
                  <span class="filter-popover-title">高级筛选</span>
                  <a-button type="link" size="small" @click="resetFilters">重置全部</a-button>
                </div>

                <div class="filter-group">
                  <div class="filter-group-label">数据源类型</div>
                  <a-select
                    v-model:value="filterState.datasourceTypes"
                    mode="multiple"
                    placeholder="全部数据源类型"
                    style="width: 100%"
                    :max-tag-count="2"
                    allow-clear
                  >
                    <a-select-option v-for="item in DATASOURCE_CATALOG" :key="item.id" :value="item.id">
                      {{ item.name }}
                    </a-select-option>
                  </a-select>
                </div>

                <div class="filter-group">
                  <div class="filter-group-label">采集方式</div>
                  <a-select
                    v-model:value="filterState.modes"
                    mode="multiple"
                    placeholder="全部采集方式"
                    style="width: 100%"
                    allow-clear
                  >
                    <a-select-option v-for="item in MODE_OPTIONS" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </a-select-option>
                  </a-select>
                </div>

                <div class="filter-group">
                  <div class="filter-group-label">任务状态</div>
                  <a-select
                    v-model:value="filterState.statuses"
                    mode="multiple"
                    placeholder="全部任务状态"
                    style="width: 100%"
                    allow-clear
                  >
                    <a-select-option v-for="item in COLLECTOR_STATUS_OPTIONS" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </a-select-option>
                  </a-select>
                </div>

                <div class="filter-popover-footer">
                  <YButton size="small" type="primary" @click="filterPopoverOpen = false"> 确定 </YButton>
                </div>
              </div>
            </template>

            <YButton class="toolbar-filter-btn" :class="{ 'toolbar-filter-btn--active': activeFilterCount > 0 }">
              <template #icon><FilterOutlined /></template>
              筛选
              <a-badge v-if="activeFilterCount > 0" :count="activeFilterCount" class="filter-badge" />
            </YButton>
          </a-popover>

          <!-- 关键词搜索框 -->
          <a-input
            v-model:value="filterState.keyword"
            placeholder="请输入任务名称"
            class="toolbar-search-input"
            allow-clear
          >
            <template #prefix><SearchOutlined class="search-icon" /></template>
          </a-input>

          <!-- 新建采集任务 Primary 按钮 -->
          <a-button type="primary" class="toolbar-create-btn" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新建采集任务
          </a-button>

          <!-- 刷新按钮 -->
          <a-button :loading="loading" class="toolbar-refresh-btn" @click="fetchList">
            <template #icon><RedoOutlined /></template>
          </a-button>
        </div>
      </div>

      <!-- 加载异常提示 -->
      <a-alert
        v-if="loadError"
        class="collector-page__error"
        type="error"
        show-icon
        message="列表加载失败"
        description="请检查网络或稍后重试"
      >
        <template #action>
          <YButton size="small" @click="fetchList">重试</YButton>
        </template>
      </a-alert>

      <!-- 11 列标准表格呈现区 -->
      <div ref="tableAreaRef" class="collector-page__table-area">
        <YTable
          v-model:pagination="pagination"
          :data="dataList"
          :columns="COLLECTOR_COLUMNS"
          :loading="loading"
          :max-height="tableHeight"
          :row-config="{ keyField: 'id', useKey: true }"
          pageable
          class="custom-collector-table"
        >
          <!-- 1. 任务名称 (实体方形图标 + 文本/链接) -->
          <template #name="{ row }">
            <div class="task-name-cell">
              <div class="dataset-icon-badge">
                <DatabaseFilled />
              </div>
              <a class="collector-task-name collector-task-name-link" :title="row.name" @click="handleViewDetail(row)">
                {{ row.name }}
              </a>
            </div>
          </template>

          <!-- 2. 数据源类型 (纯文本) -->
          <template #datasourceType="{ row }">
            <span class="plain-type-text">{{ row.datasourceType || 'MySQL' }}</span>
          </template>

          <!-- 3. 数据来源 (环境徽章 Dev/Prod + 蓝色链接) -->
          <template #connectorId="{ row }">
            <div class="connector-source-cell">
              <span
                v-if="getEnvBadge(row.connectorName)"
                :class="['env-badge', getEnvBadge(row.connectorName)?.toLowerCase()]"
              >
                {{ getEnvBadge(row.connectorName) }}
              </span>
              <a
                class="connector-link"
                :title="getCleanConnectorName(row.connectorName)"
                @click="goToConnectorDetail(row)"
              >
                {{ getCleanConnectorName(row.connectorName) }}
              </a>
            </div>
          </template>

          <!-- 4. 负责人 -->
          <template #owner="{ row }">
            <span class="collector-owner-text">{{ row.owner || '—' }}</span>
          </template>

          <!-- 5. 采集方式 (双行排版：手动 / 定时 每日, 04:11) -->
          <template #collectMethod="{ row }">
            <div class="collect-method-cell">
              <div class="method-title">{{ row.schedule === 'manual' ? '手动' : '定时' }}</div>
              <div v-if="row.schedule !== 'manual' && row.cronDescription" class="method-sub">
                {{ row.cronDescription }}
              </div>
            </div>
          </template>

          <!-- 6. 最近1次采集 (状态点/对勾/叉叉 + 双行时间) -->
          <template #lastRunAt="{ row }">
            <div v-if="row.lastRunAt" class="last-run-cell">
              <div class="last-run-status-line">
                <span
                  v-if="row.lastRunStatus === 'success' || (!row.lastRunStatus && row.status === 'success')"
                  class="status-indicator success"
                >
                  <CheckCircleFilled class="status-icon" /> 成功
                </span>
                <span
                  v-else-if="row.lastRunStatus === 'failed' || row.status === 'failed'"
                  class="status-indicator failed"
                >
                  <CloseCircleFilled class="status-icon" /> 失败
                  <a-tooltip title="查看采集实例日志">
                    <FileTextOutlined class="log-quick-link" @click="goToInstance(row)" />
                  </a-tooltip>
                </span>
                <span v-else-if="row.status === 'running'" class="status-indicator running">
                  <SyncOutlined spin class="status-icon" /> 运行中
                </span>
              </div>
              <div class="last-run-time-text">{{ row.lastRunAt }}</div>
            </div>
            <span v-else class="empty-cell-text">-</span>
          </template>

          <!-- 7. 描述 -->
          <template #description="{ row }">
            <span v-if="row.description" class="collector-desc-text" :title="row.description">
              {{ row.description }}
            </span>
            <span v-else class="empty-cell-text">-</span>
          </template>

          <!-- 8. 生效状态 (Switch 行内切换) -->
          <template #enabled="{ row }">
            <a-switch
              :checked="row.enabled !== false"
              :loading="row._switchLoading"
              size="small"
              class="collector-switch"
              @change="val => handleToggleEnable(row, val as boolean)"
            />
          </template>

          <!-- 9. 任务状态 (小圆点 + 语义文字) -->
          <template #status="{ row }">
            <div class="task-status-cell">
              <span :class="['status-dot-text', row.status || 'pending']">
                <span :class="['dot', `${row.status || 'pending'}-dot`]"></span>
                {{ getCollectorStatusMeta(row.status).label }}
              </span>
            </div>
          </template>

          <!-- 10. 最近更新时间 (双行排版：日期 / 时间) -->
          <template #updatedAt="{ row }">
            <div v-if="row.updatedAt && row.updatedAt !== '—'" class="updated-time-cell">
              <div class="time-date">{{ row.updatedAt.substring(0, 10) }}</div>
              <div class="time-hour">{{ row.updatedAt.substring(11, 19) }}</div>
            </div>
            <span v-else class="empty-cell-text">—</span>
          </template>

          <!-- 11. 操作列 (查看详情、编辑、手动执行、停止、删除) -->
          <template #action="{ row }">
            <div class="collector-actions-cell">
              <!-- 图标 1: 查看详情 -->
              <a-tooltip title="查看详情">
                <a-button type="link" size="small" class="action-icon-btn" @click="handleViewDetail(row)">
                  <EyeOutlined />
                </a-button>
              </a-tooltip>

              <!-- 图标 2: 编辑 -->
              <a-tooltip title="编辑任务">
                <a-button
                  type="link"
                  size="small"
                  :disabled="row.status === 'running'"
                  class="action-icon-btn"
                  @click="handleEdit(row)"
                >
                  <EditOutlined />
                </a-button>
              </a-tooltip>

              <!-- 图标 3: 手动执行 / 立即启动 -->
              <a-tooltip :title="row._runLoading ? '启动中...' : '手动执行'">
                <a-button
                  type="link"
                  size="small"
                  :loading="row._runLoading"
                  :disabled="row.status === 'running' || row.enabled === false"
                  class="action-icon-btn action-icon-btn--run"
                  @click="handleRun(row)"
                >
                  <PlayCircleOutlined v-if="!row._runLoading" />
                </a-button>
              </a-tooltip>

              <!-- 图标 4: 停止 (仅运行中可用) -->
              <a-tooltip
                :title="
                  row._cancelLoading ? '停止中...' : row.status === 'running' ? '停止任务' : '仅运行中的任务可停止'
                "
              >
                <a-button
                  type="link"
                  size="small"
                  :loading="row._cancelLoading"
                  :disabled="row.status !== 'running'"
                  class="action-icon-btn action-icon-btn--stop"
                  @click="handleCancel(row)"
                >
                  <StopOutlined v-if="!row._cancelLoading" />
                </a-button>
              </a-tooltip>

              <!-- 图标 5: 删除 -->
              <a-tooltip
                :title="row._deleteLoading ? '删除中...' : row.status === 'running' ? '运行中任务不可删除' : '删除任务'"
              >
                <a-button
                  type="link"
                  size="small"
                  danger
                  :loading="row._deleteLoading"
                  :disabled="row.status === 'running'"
                  class="action-icon-btn action-icon-btn--delete"
                  @click="handleDelete(row)"
                >
                  <DeleteOutlined v-if="!row._deleteLoading" />
                </a-button>
              </a-tooltip>

              <!-- 图标 6: 更多操作下拉菜单 -->
              <a-dropdown :trigger="['click']">
                <a-button type="link" size="small" class="action-icon-btn">
                  <MoreOutlined />
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="history" @click="goToInstance(row)">
                      <ProfileOutlined /> 采集实例历史
                    </a-menu-item>
                    <a-menu-item key="retry" :disabled="row.status !== 'failed'" @click="handleRetry(row)">
                      <RedoOutlined /> 失败重试
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>

          <!-- 空态定制 -->
          <template #empty>
            <div class="collector-empty-box">
              <a-empty description="暂无数据">
                <template #extra>
                  <YButton
                    v-if="
                      filteredList.length === 0 &&
                      (filterState.keyword ||
                        filterState.onlyMyTasks ||
                        filterState.onlyActive ||
                        activeFilterCount > 0)
                    "
                    size="small"
                    @click="resetFilters"
                  >
                    清空筛选条件
                  </YButton>
                  <YButton v-else type="primary" size="small" @click="openCreate"> 新建采集任务 </YButton>
                </template>
              </a-empty>
            </div>
          </template>
        </YTable>
      </div>
    </YCard>

    <!-- 两步式新建/编辑采集任务弹窗 -->
    <CreateCollectorModal
      v-model:open="createModalVisible"
      :selected-catalog-item="selectedCatalogItem"
      :catalog-list="DATASOURCE_CATALOG"
      :editing-record="editingCollector"
      @success="fetchList"
    />

    <!-- 采集任务详情弹窗 -->
    <CollectorDetailModal v-model:open="detailModalVisible" :collector="activeCollector" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { YButton, YCard, YTable } from '@yss-ui/components';
import {
  InfoCircleOutlined,
  FilterOutlined,
  PlusOutlined,
  RedoOutlined,
  SearchOutlined,
  DatabaseFilled,
  CheckCircleFilled,
  CloseCircleFilled,
  SyncOutlined,
  FileTextOutlined,
  EditOutlined,
  PlayCircleOutlined,
  MoreOutlined,
  ProfileOutlined,
  StopOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { useCollectorList } from './hooks/useCollectorList';
import {
  COLLECTOR_COLUMNS,
  COLLECTOR_STATUS_OPTIONS,
  MODE_OPTIONS,
  getCollectorStatusMeta,
  getEnvBadge,
  getCleanConnectorName,
} from './constant';
import CreateCollectorModal from '@/views/Connector/components/CreateCollectorModal.vue';
import CollectorDetailModal from './components/CollectorDetailModal.vue';
import { DATASOURCE_CATALOG } from '@/views/Connector/constant';
import type { CollectorItem } from './type';
import type { DatasourceCatalogItem } from '@/views/Connector/type';

defineOptions({ name: 'CollectorManage' });

const router = useRouter();
const tableAreaRef = ref<HTMLElement>();
const filterPopoverOpen = ref(false);

const {
  loading,
  loadError,
  dataList,
  filteredList,
  filterState,
  pagination,
  tableHeight,
  activeCollector,
  detailModalVisible,
  fetchList,
  resetFilters,
  handleViewDetail,
  handleToggleEnable,
  handleRun,
  handleCancel,
  handleDelete,
  handleRetry,
} = useCollectorList({ tableAreaRef });

// 新建 / 编辑采集任务模态框状态
const createModalVisible = ref(false);
const selectedCatalogItem = ref<DatasourceCatalogItem | null>(null);
const editingCollector = ref<CollectorItem | null>(null);

// 打开新建采集任务弹窗
const openCreate = () => {
  editingCollector.value = null;
  selectedCatalogItem.value = DATASOURCE_CATALOG[0] || null;
  createModalVisible.value = true;
};

// 打开编辑采集任务
const handleEdit = (row: CollectorItem) => {
  editingCollector.value = row;
  const hit = DATASOURCE_CATALOG.find(c => c.id === row.datasourceType || c.name === row.datasourceType);
  selectedCatalogItem.value = hit || DATASOURCE_CATALOG[0] || null;
  createModalVisible.value = true;
};

// 跳转采集实例
const goToInstance = (row: CollectorItem) => {
  router.push({
    path: '/collector-instances',
    query: { keyword: row.name },
  });
};

const goToConnectorDetail = (row: CollectorItem) => {
  router.push({
    path: '/connectors',
    query: { keyword: row.connectorName || row.connectorId },
  });
};

// 高级筛选活动项数量
const activeFilterCount = computed(() => {
  let count = 0;
  if (filterState.datasourceTypes.length > 0) count += filterState.datasourceTypes.length;
  if (filterState.modes.length > 0) count += filterState.modes.length;
  if (filterState.statuses.length > 0) count += filterState.statuses.length;
  return count;
});
</script>

<style scoped lang="less">
@import './style.less';
</style>
