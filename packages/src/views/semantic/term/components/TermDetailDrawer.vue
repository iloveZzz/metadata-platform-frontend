<!--
  术语详情抽屉（原型 §术语详情抽屉 / 状态矩阵 §2 术语详情抽屉）
  挂接资产清单与关联同义词组为切片 03/04 交接（TermDetailVO.synonymSet / attachments
  占位 null / 空列表），以空态 + 交接提示展示；审计记录入口为切片 06 seam。
-->
<script setup lang="ts">
import { computed } from 'vue';
import { message } from 'ant-design-vue';
import { YTable } from '@yss-ui/components';
import { getTermStatusMeta, SLICE_HANDOVER } from '../constants';
import type { TermDetailState } from '../type';

defineOptions({ name: 'TermDetailDrawer' });

const props = defineProps<{
  state: TermDetailState;
}>();

const emit = defineEmits<{
  close: [];
}>();

const attachmentColumns = [
  { title: '资产', field: 'assetId' },
  { title: '字段', field: 'columnName' },
  { title: '级别', field: 'level' },
  { title: '状态', field: 'status' },
];

/** 契约 TermDetail.synonymSet 为未定型的 object（切片 03 交接），本地按展示字段读取 */
const synonymSet = computed(() => {
  const raw = props.state.detail?.synonymSet as
    | { name?: string; canonical?: string; words?: string[] }
    | null
    | undefined;
  return raw ?? null;
});

const attachments = computed(() => {
  const raw = props.state.detail?.attachments as
    | { id?: string; assetId?: string; columnName?: string | null; level?: string; status?: string }[]
    | null
    | undefined;
  return raw ?? [];
});

const openAudit = () => {
  message.info(SLICE_HANDOVER.audit);
};
</script>

<template>
  <a-drawer
    :open="state.visible"
    :title="state.detail ? `术语详情 · ${state.detail.name ?? ''}` : '术语详情'"
    :width="600"
    :destroy-on-close="true"
    @close="emit('close')"
  >
    <a-spin :spinning="state.loading">
      <template v-if="state.detail">
        <a-space direction="vertical" :size="16" class="detail-drawer__body">
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="名称">
              <a-space>
                <span>{{ state.detail.name }}</span>
                <a-tag :color="getTermStatusMeta(state.detail.status).color">
                  {{ getTermStatusMeta(state.detail.status).label }}
                </a-tag>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="别名">
              <span v-if="state.detail.aliases?.length">{{ state.detail.aliases.join(' / ') }}</span>
              <span v-else class="detail-drawer__muted">—</span>
            </a-descriptions-item>
            <a-descriptions-item label="负责人">{{ state.detail.owner || '—' }}</a-descriptions-item>
            <a-descriptions-item label="认证信息">
              <template v-if="state.detail.status === 'certified'">
                ★ 已认证 · 认证人 {{ state.detail.certifiedBy || '—' }} · {{ state.detail.certifiedAt || '—' }}
              </template>
              <template v-else-if="state.detail.status === 'deprecated'">
                已弃用 · {{ state.detail.deprecatedBy || '—' }} · {{ state.detail.deprecatedAt || '—' }}
              </template>
              <template v-else>未认证（草稿）</template>
            </a-descriptions-item>
            <a-descriptions-item label="更新时间">{{ state.detail.updatedAt || '—' }}</a-descriptions-item>
            <a-descriptions-item label="定义">{{ state.detail.definition || '—' }}</a-descriptions-item>
            <a-descriptions-item label="描述">{{ state.detail.description || '—' }}</a-descriptions-item>
          </a-descriptions>

          <a-card size="small" title="关联同义词组" :bordered="true">
            <a-empty v-if="!synonymSet" image="simple" :description="SLICE_HANDOVER.synonymSet" />
            <a-descriptions v-else :column="1" size="small">
              <a-descriptions-item label="组名">{{ synonymSet.name || '—' }}</a-descriptions-item>
              <a-descriptions-item label="主词">{{ synonymSet.canonical || '—' }}</a-descriptions-item>
              <a-descriptions-item label="词条">{{ synonymSet.words?.join(' / ') || '—' }}</a-descriptions-item>
            </a-descriptions>
          </a-card>

          <a-card size="small" title="挂接资产清单（切片 04 交接）" :bordered="true">
            <a-empty v-if="attachments.length === 0" image="simple" :description="SLICE_HANDOVER.attachments">
              <template #extra>
                <a-button size="small" disabled>前往挂接资产（切片 04 交接）</a-button>
              </template>
            </a-empty>
            <YTable
              v-else
              :data="attachments"
              :columns="attachmentColumns"
              :pageable="false"
              :row-config="{ keyField: 'id', useKey: true }"
            />
          </a-card>

          <a-card size="small" title="审计记录" :bordered="true">
            <a-empty image="simple" description="审计查询复用主平台 GET /api/audit-logs（切片 06 交接）">
              <template #extra>
                <a-button size="small" @click="openAudit">查看审计记录（切片 06 交接）</a-button>
              </template>
            </a-empty>
          </a-card>
        </a-space>
      </template>
      <a-empty v-else-if="!state.loading" image="simple" description="暂无详情数据" />
    </a-spin>
  </a-drawer>
</template>

<style scoped lang="less">
.detail-drawer__body {
  width: 100%;
}
.detail-drawer__muted {
  color: rgba(0, 0, 0, 0.45);
}
</style>
