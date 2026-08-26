<template>
  <div class="recognition-rule-page">
    <YCard class-name="page-card content-card" :bordered="false">
      <!-- 顶部标题与操作筛选栏 -->
      <div class="rule-page-header">
        <div class="header-title-area">
          <span class="page-title">识别规则</span>
          <a-tooltip>
            <template #title>
              <div>
                <p><strong>识别规则：</strong>定义数据扫描的分类分级目标与扫描计算/数据源范围。</p>
                <p><strong>识别结果：</strong>识别任务成功后自动为敏感资产字段打上安全分类与分级。</p>
                <p><strong>识别管理：</strong>支持手动规则扫描、定时自动调度、清空打标重置与批量管理。</p>
              </div>
            </template>
            <QuestionCircleOutlined class="title-help-icon" />
          </a-tooltip>
        </div>

        <div class="header-filter-area">
          <!-- 1. 数据分类筛选 -->
          <a-select
            v-model:value="filterCategoryId"
            placeholder="请选择数据分类"
            style="width: 160px"
            allow-clear
            @change="onFilterChange"
          >
            <a-select-option v-for="c in categoryList" :key="c.id" :value="c.id">
              {{ c.categoryName }}
            </a-select-option>
          </a-select>

          <!-- 2. 负责人筛选 -->
          <a-select
            v-model:value="filterOwner"
            placeholder="请选择负责人"
            style="width: 140px"
            allow-clear
            show-search
            @change="onFilterChange"
          >
            <a-select-option v-for="owner in ownerOptions" :key="owner" :value="owner">
              {{ owner }}
            </a-select-option>
          </a-select>

          <!-- 3. 仅看我的 -->
          <a-checkbox v-model:checked="onlyMine" @change="onFilterChange"> 仅看我的 </a-checkbox>

          <!-- 4. 规则名称搜索框 -->
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="请输入规则名称"
            style="width: 180px"
            allow-clear
            @search="onSearch"
          />

          <!-- 5. 新建识别规则按钮 -->
          <a-button type="primary" class="create-btn" @click="handleOpenCreate">
            <template #icon><PlusOutlined /></template>
            新建识别规则
          </a-button>

          <!-- 6. 手动规则扫描按钮 -->
          <a-button class="scan-btn" @click="handleOpenManualScan">
            <template #icon><PlayCircleOutlined /></template>
            手动规则扫描
          </a-button>

          <!-- 7. 刷新按钮 -->
          <a-button class="refresh-btn" @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
          </a-button>
        </div>
      </div>

      <!-- 数据表格容器 -->
      <div ref="tableRef" class="table-container">
        <YTable
          :data="tableData"
          :columns="columns"
          :loading="loading"
          pageable
          :pagination="pagination"
          :max-height="tableHeight"
          row-selection="checkbox"
          @page-change="handlePageChange"
          @selection-change="handleSelectionChange"
        >
          <!-- 规则名称列 -->
          <template #ruleName="{ row }">
            <span class="rule-name-cell" @click="handleViewDetail(row)">
              {{ row.ruleName || '-' }}
            </span>
          </template>

          <!-- 数据分类列 -->
          <template #categoryScopeMode="{ row }">
            <a-tag color="blue" class="category-tag">
              {{ formatCategoryMode(row.categoryScopeMode) }}
            </a-tag>
          </template>

          <!-- 负责人 -->
          <template #owner="{ row }">
            <span>{{ row.owner || '-' }}</span>
          </template>

          <!-- 更新时间 -->
          <template #updatedAt="{ row }">
            <span>{{ row.updatedAt || '-' }}</span>
          </template>

          <!-- 是否生效 Switch 列 -->
          <template #status="{ row }">
            <a-popconfirm
              :title="`确定${row.status === 'ENABLED' ? '停用' : '启用'}此规则？`"
              description="切换规则生效状态不会影响历史上已经识别打标的数据结果。"
              ok-text="确认切换"
              cancel-text="取消"
              @confirm="handleToggleStatus(row)"
            >
              <a-switch :checked="row.status === 'ENABLED'" checked-children="生效" un-checked-children="停用" />
            </a-popconfirm>
          </template>

          <!-- 操作列 -->
          <template #action="{ row }">
            <div class="action-buttons-wrapper">
              <a-button type="link" class="action-link-btn" @click="handleViewDetail(row)"> 详情 </a-button>

              <a-button type="link" class="action-link-btn" @click="handleEditRule(row)"> 编辑 </a-button>

              <a-popconfirm
                title="确定重置此识别规则？"
                description="重置将清空该规则的历史打标结果，并在下次扫描调度中重新识别打标。"
                ok-text="确定重置"
                cancel-text="取消"
                ok-type="danger"
                @confirm="handleReset(row)"
              >
                <a-button type="link" class="action-link-btn"> 重置 </a-button>
              </a-popconfirm>

              <a-button type="link" class="action-link-btn" @click="handleCloneRule(row)"> 克隆 </a-button>

              <!-- 更多下拉操作 -->
              <a-dropdown>
                <a class="ant-dropdown-link" @click.prevent> 更多 <DownOutlined /> </a>
                <template #overlay>
                  <a-menu>
                    <a-menu-item :disabled="row.status !== 'ENABLED'" @click="handleSingleRun(row)">
                      <PlayCircleOutlined /> 手动运行
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item danger @click="handleConfirmDelete(row)">
                      <DeleteOutlined /> 删除 (次日生效)
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>
        </YTable>
      </div>

      <!-- 底部批量浮动操作栏 -->
      <div v-if="hasSelected" class="batch-action-bar">
        <div class="selected-info">
          已选择 <span class="selected-count">{{ selectedRowKeys.length }}</span> 项识别规则
        </div>
        <div class="batch-buttons">
          <a-button size="small" @click="handleBatchResetClick"> 批量重置 </a-button>
          <a-button size="small" type="primary" ghost @click="handleBatchRunClick"> 批量手动运行 </a-button>
          <a-button size="small" danger @click="handleBatchDeleteClick"> 批量删除 </a-button>
        </div>
      </div>
    </YCard>

    <!-- 1. 新建 / 编辑 / 克隆 弹窗 -->
    <RecognitionRuleFormModal ref="formModalRef" @success="handleFormModalSuccess" />

    <!-- 2. 详情抽屉 -->
    <RecognitionRuleDetailDrawer ref="detailDrawerRef" />

    <!-- 3. 手动扫描弹窗 -->
    <ManualScanModal ref="manualScanModalRef" @success="handleManualScanSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Modal } from 'ant-design-vue';
import {
  PlusOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  DownOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { YCard, YTable, type YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { useRecognitionRuleTable, type RecognitionRuleItem } from './hooks/useRecognitionRuleTable';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { DataCategoryVO } from '@/api/generated/data-security/schemas';
import RecognitionRuleFormModal from './components/RecognitionRuleFormModal.vue';
import RecognitionRuleDetailDrawer from './components/RecognitionRuleDetailDrawer.vue';
import ManualScanModal from './components/ManualScanModal.vue';
import './style.less';

defineOptions({ name: 'RecognitionRulePage' });

const api = getDataSecurityCenterAPIAPIApi();
const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

const formModalRef = ref();
const detailDrawerRef = ref();
const manualScanModalRef = ref();

const {
  loading,
  tableData,
  pagination,
  selectedRowKeys,
  hasSelected,
  query,
  handlePageChange,
  handleToggleStatus,
  handleReset,
  handleClone,
  handleDelete,
  handleCreate,
  handleUpdate,
  handleBatchRun,
  handleManualScan,
  handleBatchDelete,
  handleBatchReset,
} = useRecognitionRuleTable();

const searchKeyword = ref('');
const filterCategoryId = ref<number | undefined>(undefined);
const filterOwner = ref<string | undefined>(undefined);
const onlyMine = ref(false);
const categoryList = ref<DataCategoryVO[]>([]);

const loadCategories = async () => {
  try {
    const res = await api.pageDataCategories({ pageIndex: 1, pageSize: 100 });
    categoryList.value = (res as any)?.data || [];
  } catch (err) {
    categoryList.value = [];
  }
};

const ownerOptions = computed(() => {
  const owners = new Set<string>();
  tableData.value.forEach(row => {
    if (row.owner) owners.add(row.owner);
  });
  return Array.from(owners);
});

const columns: YTableColumn[] = [
  { title: '规则名称', field: 'ruleName', minWidth: 160, slots: { default: 'ruleName' } },
  { title: '数据分类', field: 'categoryScopeMode', width: 160, slots: { default: 'categoryScopeMode' } },
  { title: '负责人', field: 'owner', width: 120, slots: { default: 'owner' } },
  { title: '更新时间', field: 'updatedAt', width: 170, slots: { default: 'updatedAt' } },
  { title: '是否生效', field: 'status', width: 110, align: 'center', slots: { default: 'status' } },
  { title: '操作', field: 'action', width: 220, align: 'center', fixed: 'right', slots: { default: 'action' } },
];

function formatCategoryMode(mode?: string) {
  switch (mode) {
    case 'ALL':
      return '全部分类';
    case 'TREE_NODE':
      return '指定目录下所有分类';
    case 'SPECIFIC':
      return '指定数据分类';
    default:
      return mode || '-';
  }
}

const onSearch = () => {
  query({
    keyword: searchKeyword.value || undefined,
    categoryId: filterCategoryId.value,
    owner: filterOwner.value,
    onlyMine: onlyMine.value || undefined,
    pageIndex: 1,
  });
};

onMounted(() => {
  loadCategories();
});

const onFilterChange = () => {
  onSearch();
};

const handleRefresh = () => {
  query({});
};

const handleSelectionChange = (keys: number[]) => {
  selectedRowKeys.value = keys;
};

// 详情
const handleViewDetail = (row: RecognitionRuleItem) => {
  detailDrawerRef.value?.open(row);
};

// 新建
const handleOpenCreate = () => {
  formModalRef.value?.open('create');
};

// 编辑
const handleEditRule = (row: RecognitionRuleItem) => {
  formModalRef.value?.open('edit', row);
};

// 克隆
const handleCloneRule = (row: RecognitionRuleItem) => {
  handleClone(row);
};

// 单条删除二次确认
const handleConfirmDelete = (row: RecognitionRuleItem) => {
  Modal.confirm({
    title: `确定删除识别规则 [${row.ruleName}]？`,
    content: '删除识别规则将于次日生效，原有的识别打标将会在次日调度中清空，请谨慎操作。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => handleDelete(row),
  });
};

// 单条运行
const handleSingleRun = (row: RecognitionRuleItem) => {
  Modal.confirm({
    title: `手动运行规则 [${row.ruleName}]`,
    content: '立即触发该规则的扫描任务。',
    okText: '立即运行',
    cancelText: '取消',
    onOk: () => handleBatchRun([row.id], 'ENABLED_ONLY', true),
  });
};

// 手动扫描对话框
const handleOpenManualScan = () => {
  manualScanModalRef.value?.open();
};

const handleManualScanSuccess = (data: any) => {
  handleManualScan(data);
};

// 表单提交成功回调
const handleFormModalSuccess = async ({ mode, id, data }: any) => {
  if (mode === 'create' || mode === 'clone') {
    await handleCreate(data);
  } else if (mode === 'edit' && id) {
    await handleUpdate(id, data);
  }
};

// 批量运行
const handleBatchRunClick = () => {
  if (selectedRowKeys.value.length === 0) return;
  Modal.confirm({
    title: `批量运行已选的 ${selectedRowKeys.value.length} 条规则`,
    content: '将对所选规则立即触发扫描任务，系统将按规则配置进行并行扫描。',
    okText: '确定运行',
    cancelText: '取消',
    onOk: () => handleBatchRun(selectedRowKeys.value, 'ENABLED_ONLY', true),
  });
};

// 批量重置
const handleBatchResetClick = () => {
  if (selectedRowKeys.value.length === 0) return;
  Modal.confirm({
    title: `确定批量重置选中的 ${selectedRowKeys.value.length} 条识别规则？`,
    content: '批量重置将清空所有选中规则的历史打标结果，并在下次调度中重新扫描识别。',
    okText: '确定重置',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => handleBatchReset(selectedRowKeys.value),
  });
};

// 批量删除
const handleBatchDeleteClick = () => {
  if (selectedRowKeys.value.length === 0) return;
  Modal.confirm({
    title: `确定批量删除选中的 ${selectedRowKeys.value.length} 条识别规则？`,
    content: '批量删除将于次日生效，原有的打标结果将在次日扫描中被清理。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => handleBatchDelete(selectedRowKeys.value),
  });
};
</script>
