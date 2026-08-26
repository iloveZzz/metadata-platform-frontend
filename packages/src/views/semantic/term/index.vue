<!--
  术语管理页（SL-SLICE-01-WU-06，路由 /term-library）
  仅负责组合 Hooks / schema / blocks 与渲染；数据转换 / 请求编排见 hooks/、schemas/、constants/。
  对照：高保真原型（术语管理页 4 页）+ 状态矩阵 §2 + 交互说明 §7 term.*（SL-001 / SL-008）。
-->
<script setup lang="ts">
import { ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { YButton, YssFormily, YTable } from '@yss-ui/components';
import { usePermission } from './hooks/usePermission';
import { useTermList } from './hooks/useTermList';
import { useTermDetail } from './hooks/useTermDetail';
import { useTermActions } from './hooks/useTermActions';
import { createSearchSchema, SEARCH_INITIAL_VALUES, type SearchSchemaValues } from './schemas/searchSchema';
import {
  TERM_COLUMNS,
  TERM_STATUS_OPTIONS,
  createTermActionConfig,
  getTermStatusMeta,
  READONLY_BANNER,
} from './constants';
import type { TermRow, TermCreateValues } from './type';
import CertifyModal from './components/CertifyModal.vue';
import DeprecateModal from './components/DeprecateModal.vue';
import TermDetailDrawer from './components/TermDetailDrawer.vue';
import CreateTermModal from './components/CreateTermModal.vue';
import EditTermModal from './components/EditTermModal.vue';

defineOptions({ name: 'TermLibrary' });

const { isGov, isReadonly } = usePermission();

const tableAreaRef = ref<HTMLElement>();
const searchFormRef = ref<{ getValues: () => object; setValues: (v: object) => void }>();

const searchSchema = createSearchSchema(TERM_STATUS_OPTIONS);

const { loading, loadError, dataList, pagination, tableHeight, fetchList, onPageChange, handleSearch, handleReset } =
  useTermList({ tableAreaRef });

const { state: detailState, open: openDetail, close: closeDetail } = useTermDetail();

const actions = useTermActions({ onSuccess: fetchList });

/** 弹窗状态（认证 / 弃用 / 新建 / 编辑） */
const certifyTerm = ref<TermRow | null>(null);
const deprecateTerm = ref<TermRow | null>(null);
const createOpen = ref(false);
const editTerm = ref<TermRow | null>(null);

/** 操作人展示（审计信息；真实用户来自 yss-userinfo / 主平台用户上下文，切片 06 收敛） */
const operatorName = '治理专员·演示';

/** 查询区提交（YssFormily schema 值 → 服务端筛选） */
const doSearch = () => {
  const values = (searchFormRef.value?.getValues() ?? {}) as SearchSchemaValues;
  handleSearch(values);
};

/** 查询区重置 */
const doReset = () => {
  searchFormRef.value?.setValues({ ...SEARCH_INITIAL_VALUES });
  handleReset();
};

const openCreate = () => {
  createOpen.value = true;
};

const openEdit = (row: TermRow) => {
  editTerm.value = row;
};

const handleCreateConfirm = async (values: TermCreateValues) => {
  const ok = await actions.create(values);
  if (ok) createOpen.value = false;
};

const handleEditConfirm = async (values: TermCreateValues) => {
  const ok = await actions.update(editTerm.value as TermRow, values);
  if (ok) editTerm.value = null;
};

const handleCertifyConfirm = async (note: string) => {
  const ok = await actions.certify(certifyTerm.value as TermRow, note);
  if (ok) certifyTerm.value = null;
};

const handleDeprecateConfirm = async (note: string) => {
  const ok = await actions.deprecate(deprecateTerm.value as TermRow, note);
  if (ok) deprecateTerm.value = null;
};

/** 删除二次确认（原型：删除仅草稿且未被挂接 / 关联；被引用 409 改用弃用） */
const confirmDelete = (row: TermRow) => {
  Modal.confirm({
    title: `确认删除术语「${row.name}」？`,
    content:
      '删除仅对「草稿」且未被挂接 / 被同义词组关联的术语开放（物理删除，不可恢复）；已认证 / 已弃用 / 被引用时接口返回 409 阻断（SL-001），应改用弃用。',
    okText: '确认删除',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => actions.remove(row),
  });
};

/** 挂接资产入口（切片 04 交接：资产详情挂接展示区 POST /api/semantic/attachments） */
const goAttach = () => {
  message.info('挂接资产为资产详情挂接展示区流程（切片 04 交接，本切片不落挂接 UI）');
};

const actionConfig = createTermActionConfig(
  {
    onView: row => openDetail(row.id as string),
    onEdit: openEdit,
    onCertify: row => (certifyTerm.value = row),
    onDeprecate: row => (deprecateTerm.value = row),
    onDelete: confirmDelete,
    onAttach: goAttach,
  },
  isGov.value
);

const isEmpty = !loading.value && !loadError.value && dataList.value.length === 0;
</script>

<template>
  <div class="term-page">
    <div class="term-page__header">
      <div>
        <div class="term-page__title">术语管理</div>
        <div class="term-page__desc">业务概念定义与认证（草稿 → 已认证 / 已弃用，SL-001）</div>
      </div>
      <YButton type="primary" :disabled="!isGov" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        新建术语
      </YButton>
    </div>

    <a-alert
      v-if="isReadonly"
      type="warning"
      show-icon
      class="term-page__readonly-banner"
      :message="READONLY_BANNER.message"
      :description="READONLY_BANNER.description"
    />

    <div class="term-page__search">
      <YssFormily ref="searchFormRef" :schema="searchSchema" :initial-values="SEARCH_INITIAL_VALUES" />
      <a-space>
        <a-button type="primary" @click="doSearch">查询</a-button>
        <a-button @click="doReset">重置</a-button>
      </a-space>
    </div>

    <a-alert
      v-if="loadError"
      class="term-page__error"
      type="error"
      show-icon
      message="列表请求失败"
      description="请检查网络或稍后重试（重试不会丢失当前筛选条件）"
    >
      <template #action>
        <YButton size="small" @click="fetchList">重试</YButton>
      </template>
    </a-alert>

    <div ref="tableAreaRef" class="term-page__table-area">
      <div v-if="isEmpty" class="term-page__empty">
        <a-empty image="simple" description="暂无术语，点击按钮新建第一个术语（空态引导，状态矩阵 §2 术语管理页）">
          <template #extra>
            <YButton type="primary" :disabled="!isGov" @click="openCreate">新建第一个术语</YButton>
          </template>
        </a-empty>
      </div>
      <YTable
        v-else
        v-model:pagination="pagination"
        :data="dataList"
        :columns="TERM_COLUMNS"
        :action-config="actionConfig"
        :loading="loading"
        :height="tableHeight"
        :row-config="{ keyField: 'id', useKey: true }"
        pageable
        @page-change="onPageChange"
      >
        <template #name="{ row }">
          <a-button type="link" size="small" class="term-page__name-link" @click="openDetail(row.id)">
            {{ row.name }}
          </a-button>
        </template>
        <template #aliases="{ row }">
          <span v-if="row.aliases?.length">{{ row.aliases.join(' / ') }}</span>
          <span v-else class="term-page__muted">—</span>
        </template>
        <template #status="{ row }">
          <a-tag :color="getTermStatusMeta(row.status).color">
            {{ getTermStatusMeta(row.status).label }}
          </a-tag>
        </template>
        <template #owner="{ row }">
          {{ row.owner || '—' }}
        </template>
        <template #attachCount>
          <a-tooltip title="挂接数由切片 04（挂接展示）交接；删除被挂接 409 REFERENCE_CONFLICT 由后端兜底">
            <span class="term-page__muted">—</span>
          </a-tooltip>
        </template>
        <template #updatedAt="{ row }">
          {{ row.updatedAt || '—' }}
        </template>
      </YTable>
    </div>

    <!-- 详情抽屉 + 弹窗 -->
    <TermDetailDrawer :state="detailState" @close="closeDetail" />
    <CertifyModal
      :open="!!certifyTerm"
      :term="certifyTerm"
      :submitting="actions.certifying.value"
      :operator-name="operatorName"
      @confirm="handleCertifyConfirm"
      @cancel="certifyTerm = null"
    />
    <DeprecateModal
      :open="!!deprecateTerm"
      :term="deprecateTerm"
      :submitting="actions.deprecating.value"
      :operator-name="operatorName"
      @confirm="handleDeprecateConfirm"
      @cancel="deprecateTerm = null"
    />
    <CreateTermModal
      :open="createOpen"
      :submitting="actions.creating.value"
      @confirm="handleCreateConfirm"
      @cancel="createOpen = false"
    />
    <EditTermModal
      :open="!!editTerm"
      :term="editTerm"
      :submitting="actions.updating.value"
      @confirm="handleEditConfirm"
      @cancel="editTerm = null"
    />
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
