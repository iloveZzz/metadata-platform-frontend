<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { YTable, type YTableColumn } from '@yss-ui/components';
import type { Channel, ChannelCreateRequest, ChannelUpdateRequest } from '@/api';
import { customMessage } from '@/utils/message';
import ChannelStateTag from '@/components/dq-insight/ChannelStateTag.vue';
import Perm403 from '@/components/dq-insight/Perm403.vue';
import { usePermission } from '@/views/dq-insight/hooks/usePermission';
import { useChannels } from './hooks/useChannels';
import { useIngestionRecords } from './hooks/useIngestionRecords';
import ChannelDrawer from './components/ChannelDrawer.vue';

defineOptions({ name: 'ChannelsPage' });

const permission = usePermission();
const channelsApi = useChannels({ permission });
const {
  channels,
  loading,
  isForbidden,
  hasError,
  retryingId,
  load,
  createChannel,
  updateChannel,
  toggleChannel,
  retryChannel,
} = channelsApi;
const records = useIngestionRecords();
/** 接入记录 API（ref 解构到顶层，模板自动解包） */
const {
  filters: recordFilters,
  pagination: recordPagination,
  list: recordList,
  loading: recordLoading,
  hasError: recordHasError,
  query: recordsQuery,
  onFilterChange: recordsFilterChange,
  onPageChange: recordsPageChange,
  onSizeChange: recordsSizeChange,
  retry: recordsRetry,
} = records;

onMounted(() => {
  load();
  recordsQuery();
});

/* ---------- 页面状态 ---------- */
const activeTab = ref('channels');
const drawerOpen = ref(false);
const drawerMode = ref<'create' | 'edit'>('create');
const editingChannel = ref<Channel | null>(null);
/** 停用二次确认（不可逆操作确认，交互反馈基线） */
const togglingChannel = ref<Channel | null>(null);
const togglingBusy = ref(false);
/** drawer dirty-form 离开确认 */
const dirtyCloseConfirm = ref(false);
/** 拉取失败错误详情弹窗 */
const errorTarget = ref<Channel | null>(null);

/** 通道列表本地分页（服务端 MultiResult 无分页元数据；YTable 通过 update:pagination 回写，此处原地合并保持 const） */
const channelPagination = reactive({
  current: 1,
  pageSize: 5,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  remote: false,
});
watch(
  channels,
  list => {
    channelPagination.total = list.length;
  },
  { immediate: true }
);

/** YTable 分页回写（remote=false 本地分页：current / pageSize 由组件驱动） */
const onChannelPaginationChange = (p: { current?: number; pageSize?: number }) => {
  if (typeof p.current === 'number') {
    channelPagination.current = p.current;
  }
  if (typeof p.pageSize === 'number') {
    channelPagination.pageSize = p.pageSize;
  }
};

const channelTypeText = (type?: string) => (type === 'api-push' ? 'API 推送' : '定时拉取');
const formatTypeText = (format?: string) =>
  format === 'ge' ? 'GE' : format === 'csv' ? '通用 CSV' : format === 'api' ? '通用 API' : '—';
const errorCategoryText = (cat?: string) =>
  cat === 'format' ? '格式' : cat === 'auth' ? '认证' : cat === 'network' ? '网络' : '—';

/* ---------- 操作 ---------- */
const openCreate = () => {
  drawerMode.value = 'create';
  editingChannel.value = null;
  drawerOpen.value = true;
};

const openEdit = (ch: Channel) => {
  drawerMode.value = 'edit';
  editingChannel.value = ch;
  drawerOpen.value = true;
};

const closeDrawer = () => {
  drawerOpen.value = false;
  editingChannel.value = null;
  dirtyCloseConfirm.value = false;
};

/** 启停（停用需二次确认；启用直接执行） */
const handleToggle = (ch: Channel) => {
  if (ch.state === 'enabled') {
    togglingChannel.value = ch;
    return;
  }
  void confirmToggle(ch);
};

const confirmToggle = async (ch: Channel) => {
  togglingBusy.value = true;
  try {
    const ok = await toggleChannel(ch);
    if (ok) {
      customMessage.success(`「${ch.name}」已${ch.state === 'enabled' ? '停用' : '启用'}（配置变更已审计）`);
    }
  } finally {
    togglingBusy.value = false;
    togglingChannel.value = null;
  }
};

const confirmToggleCurrent = () => {
  if (togglingChannel.value) {
    void confirmToggle(togglingChannel.value);
  }
};

/** 停用确认弹窗可见性（v-model 需成员表达式，用 computed 桥接） */
const toggleModalOpen = computed({
  get: () => togglingChannel.value !== null,
  set: (v: boolean) => {
    if (!v) {
      togglingChannel.value = null;
    }
  },
});

/** 接入错误详情弹窗可见性 */
const errorModalOpen = computed({
  get: () => errorTarget.value !== null,
  set: (v: boolean) => {
    if (!v) {
      errorTarget.value = null;
    }
  },
});

/** drawer 保存（create / update 分流） */
const handleDrawerSave = async (payload: { create?: ChannelCreateRequest; update?: ChannelUpdateRequest }) => {
  let ok = false;
  if (payload.create) {
    ok = await createChannel(payload.create);
  } else if (payload.update) {
    ok = await updateChannel(editingChannel.value?.id ?? '', payload.update);
  }
  if (ok) {
    closeDrawer();
  }
};

const handleRetry = async (ch: Channel) => {
  await retryChannel(ch);
};

/* ---------- 列定义 ---------- */
const channelColumns: YTableColumn[] = [
  { field: 'name', title: '通道名称', minWidth: 200 },
  { field: 'type', title: '类型', width: 110 },
  { field: 'formatType', title: '格式类型', width: 110 },
  { field: 'state', title: '状态', width: 110 },
  { field: 'lastPullAt', title: '上次拉取时间', minWidth: 170 },
  { field: 'lastError', title: '错误信息', minWidth: 200 },
  { field: 'op', title: '操作', width: 220 },
];

const recordColumns: YTableColumn[] = [
  { field: 'batchNo', title: '接入批次', minWidth: 170 },
  { field: 'sourceTool', title: '来源工具', width: 130 },
  { field: 'status', title: '结果', width: 110 },
  { field: 'linkageStatus', title: '关联状态', width: 130 },
  { field: 'receivedAt', title: '接收时间', minWidth: 170 },
  { field: 'errorMessage', title: '备注 / 错误', minWidth: 220 },
];

const sourceToolText = (t?: string) =>
  t === 'great-expectations' ? 'Great Expectations' : t === 'generic' ? '通用导入' : '—';

const recordStatusMeta = (status?: string) => {
  switch (status) {
    case 'ingested':
      return { color: 'success', text: '已入库' };
    case 'parse-failed':
      return { color: 'error', text: '解析失败' };
    case 'invalidated':
      return { color: 'default', text: '已失效（结果过期）' };
    case 'processing':
      return { color: 'processing', text: '处理中' };
    default:
      return { color: 'default', text: '—' };
  }
};

const linkageStatusMeta = (status?: string) => {
  switch (status) {
    case 'linked':
      return { color: 'success', text: '已关联' };
    case 'pending':
      return { color: 'warning', text: '未命中 · 待关联' };
    default:
      return { color: 'default', text: '—' };
  }
};

const statusFilterOptions = [
  { value: 'processing', label: '处理中' },
  { value: 'ingested', label: '已入库' },
  { value: 'parse-failed', label: '解析失败' },
  { value: 'invalidated', label: '已失效（结果过期）' },
];
const linkageFilterOptions = [
  { value: 'linked', label: '已关联' },
  { value: 'pending', label: '未命中 · 待关联' },
];

const recordPaginationProps = computed(() => ({
  current: recordPagination.current,
  pageSize: recordPagination.pageSize,
  total: recordPagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  remote: true,
  showTotal: (total: number) => `共 ${total} 条`,
}));
</script>

<template>
  <div class="channels-page">
    <a-breadcrumb style="margin-bottom: 12px" :items="[{ title: '数据质量' }, { title: '通道管理 / 接入记录' }]" />

    <Perm403
      v-if="isForbidden"
      desc="您不在任何已授权数据域内或角色权限不足，无法查看通道与接入记录。请联系管理员申请数据域权限（DQI-007）。"
    />

    <template v-else>
      <div class="page-header-row">
        <div>
          <h4 class="page-title">通道管理 / 接入记录</h4>
          <span class="page-desc"
            >接入通道状态（启用 / 停用 / 拉取失败 / 拉取中）、接入日志、待关联资产与审计留痕（DQI-005 / DQI-006 /
            DQI-007）</span
          >
        </div>
      </div>

      <a-card :bordered="false">
        <a-tabs v-model:active-key="activeTab">
          <a-tab-pane key="channels" :tab="`接入通道（${channels.length}）`">
            <a-card v-if="hasError" :bordered="false">
              <a-alert type="error" show-icon message="通道列表请求失败">
                <template #description>可重试错误，不清空已展示数据。</template>
                <template #action>
                  <a-button size="small" @click="load">重试</a-button>
                </template>
              </a-alert>
            </a-card>

            <a-card v-else-if="channels.length === 0 && !loading" :bordered="false">
              <a-empty>
                <template #description>
                  <div>
                    暂无接入通道
                    <span class="empty-desc"
                      >新建通道后外部 DQ 结果方可接入并计算健康分。空态主操作 = 新建通道（状态矩阵 §4
                      空态主操作）。</span
                    >
                  </div>
                </template>
                <a-button
                  type="primary"
                  :disabled="!permission.can('channel-create')"
                  :title="permission.can('channel-create') ? '' : permission.hintOf('channel-create')"
                  @click="openCreate"
                >
                  新建通道
                </a-button>
              </a-empty>
            </a-card>

            <template v-else>
              <div class="toolbar">
                <a-button
                  type="primary"
                  :disabled="!permission.can('channel-create')"
                  :title="permission.can('channel-create') ? '' : permission.hintOf('channel-create')"
                  @click="openCreate"
                >
                  新建通道
                </a-button>
                <span class="toolbar-hint">拉取失败态主操作 = 重试拉取；启停 / 配置变更留审计</span>
              </div>
              <YTable
                :columns="channelColumns"
                :data="channels"
                :pagination="channelPagination"
                :row-config="{ keyField: 'id', useKey: true }"
                :loading="loading"
                @update:pagination="onChannelPaginationChange"
              >
                <template #name="{ row }">
                  <a-space>
                    <span>{{ row.name }}</span>
                    <a-tag v-if="row.domain">{{ row.domain }}</a-tag>
                  </a-space>
                </template>
                <template #type="{ row }">
                  <a-tag color="blue">{{ channelTypeText(row.type) }}</a-tag>
                </template>
                <template #formatType="{ row }">
                  <a-tag>{{ formatTypeText(row.formatType) }}</a-tag>
                </template>
                <template #state="{ row }">
                  <ChannelStateTag :state="row.state" />
                </template>
                <template #lastPullAt="{ row }">
                  {{ row.lastPullAt || '—' }}
                </template>
                <template #lastError="{ row }">
                  <span v-if="row.state === 'pull-failed' && row.lastError">
                    <a-button size="small" type="link" @click="errorTarget = row">查看接入错误</a-button>
                  </span>
                  <span v-else class="secondary-text">—</span>
                </template>
                <template #op="{ row }">
                  <a-space wrap>
                    <a-button
                      size="small"
                      :disabled="!permission.can('channel-update')"
                      :title="permission.can('channel-update') ? '' : permission.hintOf('channel-update')"
                      @click="handleToggle(row)"
                    >
                      {{ row.state === 'enabled' ? '停用' : '启用' }}
                    </a-button>
                    <a-button
                      size="small"
                      :disabled="!permission.can('channel-update')"
                      :title="permission.can('channel-update') ? '' : permission.hintOf('channel-update')"
                      @click="openEdit(row)"
                    >
                      配置
                    </a-button>
                    <a-button
                      v-if="row.state === 'pull-failed'"
                      size="small"
                      type="primary"
                      ghost
                      :loading="retryingId === row.id"
                      :disabled="!!retryingId || !permission.can('channel-retry')"
                      :title="
                        retryingId
                          ? '另一通道正在拉取中，操作已锁定（幂等防重复触发）'
                          : permission.can('channel-retry')
                            ? '重试拉取'
                            : permission.hintOf('channel-retry')
                      "
                      @click="handleRetry(row)"
                    >
                      重试拉取
                    </a-button>
                  </a-space>
                </template>
              </YTable>
            </template>
          </a-tab-pane>

          <a-tab-pane key="records" :tab="`接入记录（${recordPagination.total}）`">
            <a-alert
              style="margin-bottom: 16px"
              type="info"
              show-icon
              message="结果状态与关联状态解耦表达（DQI-001 / DQI-006）"
              description="解析成功即入库（不依赖关联命中）；资产 ID 未命中挂待关联队列。相同批次号重复推送按幂等去重，不重复入库（SB-09 P1 待确认）。"
            />
            <div class="toolbar">
              <a-select
                v-model:value="recordFilters.status"
                allow-clear
                placeholder="结果状态"
                style="width: 160px"
                :options="statusFilterOptions"
                @change="recordsFilterChange"
              />
              <a-select
                v-model:value="recordFilters.linkageStatus"
                allow-clear
                placeholder="关联状态"
                style="width: 170px"
                :options="linkageFilterOptions"
                @change="recordsFilterChange"
              />
            </div>
            <a-card v-if="recordHasError" :bordered="false">
              <a-alert type="error" show-icon message="接入记录请求失败">
                <template #description>可重试错误，不清空筛选条件。</template>
                <template #action>
                  <a-button size="small" @click="recordsRetry">重试</a-button>
                </template>
              </a-alert>
            </a-card>
            <a-card v-else :bordered="false" class="table-card">
              <YTable
                :columns="recordColumns"
                :data="recordList"
                :pageable="true"
                :pagination="recordPaginationProps"
                :row-config="{ keyField: 'batchId', useKey: true }"
                :loading="recordLoading"
                @page-change="recordsPageChange"
                @size-change="recordsSizeChange"
              >
                <template #batchNo="{ row }">
                  <a-typography-text code>{{ row.batchNo }}</a-typography-text>
                </template>
                <template #sourceTool="{ row }">{{ sourceToolText(row.sourceTool) }}</template>
                <template #status="{ row }">
                  <a-tag :color="recordStatusMeta(row.status).color">{{ recordStatusMeta(row.status).text }}</a-tag>
                </template>
                <template #linkageStatus="{ row }">
                  <a-tag :color="linkageStatusMeta(row.linkageStatus).color">
                    {{ linkageStatusMeta(row.linkageStatus).text }}
                  </a-tag>
                </template>
                <template #errorMessage="{ row }">
                  <span
                    :class="
                      row.status === 'parse-failed' || row.status === 'invalidated' ? 'danger-text' : 'secondary-text'
                    "
                    class="record-note"
                  >
                    {{ row.errorMessage || (row.linkageStatus === 'pending' ? '资产 ID 未命中 · 待关联' : '—') }}
                  </span>
                </template>
              </YTable>
              <div v-if="recordList.length === 0 && !recordLoading" class="empty-page">
                当前筛选条件下无接入记录（0 条记录为空分页结果，非错误）
              </div>
            </a-card>
          </a-tab-pane>
        </a-tabs>
      </a-card>

      <!-- 配置抽屉（新建 / 配置共用；dirty-form 离开确认） -->
      <ChannelDrawer
        :open="drawerOpen"
        :mode="drawerMode"
        :channel="editingChannel"
        :channels="channels"
        @close="closeDrawer"
        @dirty-close="dirtyCloseConfirm = true"
        @save="handleDrawerSave"
      />

      <!-- 停用二次确认（不可逆操作确认，交互反馈基线） -->
      <a-modal
        v-model:open="toggleModalOpen"
        title="停用通道"
        ok-text="停用"
        cancel-text="取消"
        :confirm-loading="togglingBusy"
        :ok-button-props="{ danger: true }"
        @ok="confirmToggleCurrent"
      >
        <template v-if="togglingChannel">
          停用「{{ togglingChannel.name }}」后：拒绝 API
          推送、停止定时拉取。配置变更留审计（SB-08），停用需二次确认。是否继续？
        </template>
      </a-modal>

      <!-- drawer dirty-form 离开确认 -->
      <a-modal
        v-model:open="dirtyCloseConfirm"
        title="离开确认"
        ok-text="离开"
        cancel-text="留下"
        @ok="closeDrawer"
        @cancel="dirtyCloseConfirm = false"
      >
        通道配置尚未保存，离开将丢失已填写内容。
      </a-modal>

      <!-- 接入错误详情 -->
      <a-modal v-model:open="errorModalOpen" :title="`接入错误 · ${errorTarget?.name ?? ''}`" :footer="null">
        <template v-if="errorTarget">
          <a-alert
            type="error"
            show-icon
            :message="errorTarget.lastError?.split('·')[0]?.trim() || '拉取失败'"
            :description="`${errorTarget.lastError || ''}${errorTarget.errorCategory ? ` · 错误分类：${errorCategoryText(errorTarget.errorCategory)}` : ''}`"
          />
        </template>
      </a-modal>
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
.toolbar-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.secondary-text {
  color: rgba(0, 0, 0, 0.45);
}
.danger-text {
  color: #ff4d4f;
}
.record-note {
  font-size: 12px;
}
.empty-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.empty-page {
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
