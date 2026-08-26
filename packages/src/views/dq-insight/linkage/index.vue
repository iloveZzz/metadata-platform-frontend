<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { YTable, type YTableColumn } from '@yss-ui/components';
import type { PendingLinkage } from '@/api';
import { customMessage } from '@/utils/message';
import Perm403 from '@/components/dq-insight/Perm403.vue';
import { usePermission } from '@/views/dq-insight/hooks/usePermission';
import { usePendingLinkage } from './hooks/usePendingLinkage';

defineOptions({ name: 'AssetLinkagePage' });

const permission = usePermission();
const {
  pagination,
  list,
  loading,
  isForbidden,
  hasError,
  mapping,
  needsOverwriteConfirm,
  query,
  onPageChange,
  onSizeChange,
  retry,
  mapAsset,
  confirmOverwrite,
} = usePendingLinkage(permission);

onMounted(() => {
  query();
});

/* ---------- 人工映射对话框状态 ---------- */
const mapTarget = ref<PendingLinkage | null>(null);
const mapAssetId = ref('');
/** 不可逆二次确认（映射后触发健康分首次计算） */
const mapConfirmOpen = ref(false);

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
  { field: 'assetId', title: '资产 ID（未命中）', minWidth: 200 },
  { field: 'batchNo', title: '来源批次', minWidth: 170 },
  { field: 'sourceTool', title: '来源工具', width: 130 },
  { field: 'receivedAt', title: '接收时间', minWidth: 170 },
  { field: 'rowCount', title: '记录行数', width: 100 },
  { field: 'op', title: '操作', width: 120 },
];

const sourceToolText = (t?: string) =>
  t === 'great-expectations' ? 'Great Expectations' : t === 'generic' ? '通用导入' : '—';

const openMap = (row: PendingLinkage) => {
  mapTarget.value = row;
  mapAssetId.value = '';
};

/** 映射对话框可见性（v-model 需成员表达式，用 computed 桥接） */
const mapModalOpen = computed({
  get: () => mapTarget.value !== null,
  set: (v: boolean) => {
    if (!v) {
      mapTarget.value = null;
    }
  },
});

/** 映射（不可逆操作二次确认：确认映射 → 提交；目标批次已关联 → 409 → 覆盖二次确认） */
const handleMapConfirm = async () => {
  if (!mapTarget.value) {
    return;
  }
  const targetId = mapAssetId.value.trim();
  if (!targetId) {
    customMessage.error('请输入目标主平台资产 ID');
    return;
  }
  mapConfirmOpen.value = false;
  const result = await mapAsset(mapTarget.value.id ?? '', targetId);
  if (result === 'ok') {
    mapTarget.value = null;
  }
};

const handleOverwriteConfirm = async () => {
  if (!mapTarget.value) {
    return;
  }
  await confirmOverwrite(mapTarget.value.id ?? '', mapAssetId.value.trim());
};
</script>

<template>
  <div class="linkage-page">
    <a-breadcrumb style="margin-bottom: 12px" :items="[{ title: '数据质量' }, { title: '待关联资产' }]" />

    <Perm403
      v-if="isForbidden"
      desc="您不在任何已授权数据域内或角色权限不足，无法查看待关联队列。请联系管理员申请数据域权限（DQI-006）。"
    />

    <template v-else>
      <div class="page-header-row">
        <div>
          <h4 class="page-title">待关联资产</h4>
          <span class="page-desc"
            >结果已入库但资产 ID 未命中（资产不存在 / 名称变更 /
            尚未入库）的批次队列；人工映射后触发健康分（首次）计算（DQI-006 / SB-05）</span
          >
        </div>
      </div>

      <a-alert
        style="margin-bottom: 16px"
        type="warning"
        show-icon
        message="存在未命中资产 ID 的结果批次"
        description="结果已入库但资产 ID 未匹配，请人工映射后触发健康分（首次）计算（状态矩阵 §2 资产关联·未命中 / SB-05 已确认）。"
      />

      <a-card v-if="hasError" :bordered="false">
        <a-alert type="error" show-icon message="待关联资产列表请求失败">
          <template #description>可重试错误，不清空已展示数据。</template>
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
          <template #assetId="{ row }">
            <a-typography-text code>{{ row.assetId }}</a-typography-text>
          </template>
          <template #batchNo="{ row }">
            <a-typography-text code>{{ row.batchNo }}</a-typography-text>
          </template>
          <template #sourceTool="{ row }">{{ sourceToolText(row.sourceTool) }}</template>
          <template #op="{ row }">
            <a-button
              size="small"
              type="primary"
              ghost
              :disabled="!permission.can('linkage-map')"
              :title="permission.can('linkage-map') ? '人工映射' : permission.hintOf('linkage-map')"
              @click="openMap(row)"
            >
              人工映射
            </a-button>
          </template>
        </YTable>
        <div v-if="list.length === 0 && !loading" class="empty-page">
          当前无待关联批次（0 条记录为空分页结果，非错误）
        </div>
      </a-card>

      <!-- 人工映射对话框（只读消费主平台冻结资产 API 语义：目标资产 ID 由后端防腐层校验存在，DQI-006） -->
      <a-modal
        v-model:open="mapModalOpen"
        :title="`人工映射 · ${mapTarget?.assetId ?? ''}`"
        ok-text="映射（二次确认）"
        cancel-text="取消"
        :confirm-loading="mapping"
        :ok-button-props="{ danger: true }"
        @ok="mapConfirmOpen = true"
      >
        <a-alert
          style="margin-bottom: 12px"
          type="info"
          show-icon
          message="只读消费主平台冻结资产 API（DQI-006）"
          description="资产 ID 由主平台资产 API 校验存在（后端防腐层，不写冻结契约）；名称与数据域快照随映射保存。"
        />
        <a-input v-model:value="mapAssetId" placeholder="输入目标主平台资产 ID" @press-enter="mapConfirmOpen = true" />
      </a-modal>

      <!-- 不可逆二次确认：确认映射 -->
      <a-modal
        v-model:open="mapConfirmOpen"
        :title="`确认人工映射（不可逆） · ${mapTarget?.assetId ?? ''}`"
        ok-text="确认映射"
        cancel-text="取消"
        @ok="handleMapConfirm"
        @cancel="mapConfirmOpen = false"
      >
        将资产 ID「{{ mapTarget?.assetId }}」映射到「{{
          mapAssetId
        }}」？映射后结果批次归属该资产，并触发健康分（首次）计算（状态矩阵 §2 资产关联·未命中 → 已关联）。是否继续？
      </a-modal>

      <!-- 409 覆盖确认：目标批次已关联（SB-05） -->
      <a-modal
        v-model:open="needsOverwriteConfirm"
        title="目标批次已关联"
        ok-text="确认覆盖"
        cancel-text="取消"
        :confirm-loading="mapping"
        :ok-button-props="{ danger: true }"
        @ok="handleOverwriteConfirm"
      >
        目标资产已关联其他结果批次（409），继续将覆盖现有关联并重新触发健康分计算（不可逆）。是否覆盖？
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
.empty-page {
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
