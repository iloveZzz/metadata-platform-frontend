<template>
  <div class="recognition-result-page">
    <!-- 1. 顶部全局导航与控制区 -->
    <div class="recognition-result-page__top-nav">
      <div class="nav-left">
        <span class="page-title">识别结果</span>
      </div>

      <div class="nav-controls">
        <!-- 全局搜索框 -->
        <a-input
          v-model:value="searchKeyword"
          placeholder="请输入关键字"
          allow-clear
          class="global-search-input"
          @press-enter="onSearch"
          @change="onSearch"
        >
          <template #prefix>
            <SearchOutlined class="text-gray-400" />
          </template>
        </a-input>

        <!-- 高级筛选 Popover -->
        <RecognitionResultFilterBar v-model:filter="filterParams" @change="onFilterChange" />

        <!-- 批量导入与批量记录下拉 -->
        <a-dropdown>
          <template #overlay>
            <a-menu @click="handleBatchMenuClick">
              <a-menu-item key="import">批量导入识别结果</a-menu-item>
              <a-menu-item key="history">批量操作记录</a-menu-item>
            </a-menu>
          </template>
          <a-button class="batch-import-btn">
            批量导入
            <DownOutlined />
          </a-button>
        </a-dropdown>

        <!-- 手动添加主按钮 -->
        <a-button type="primary" class="manual-add-btn" @click="handleOpenManualAdd"> 手动添加 </a-button>

        <!-- 刷新按钮 -->
        <a-tooltip title="刷新列表">
          <a-button class="refresh-btn" @click="handleFullRefresh">
            <template #icon><ReloadOutlined /></template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- 2. 主体骨架：YSplitPane (左侧分类目录树 + 右侧识别结果表格) -->
    <div class="recognition-result-page__body">
      <YSplitPane :initial-width="260" :min-width="200" :max-width="400" collapsible class="split-pane-wrapper">
        <!-- 左侧：分类目录树面板 (严格对齐参考截图与 DataCategory) -->
        <template #left>
          <CategoryTreePanel
            :tree-data="rawTreeData"
            :selected-key="treeSelectedKey"
            :total-categories="pagination.total || tableData.length"
            :loading="treeLoading"
            @select="onTreeSelect"
            @add-root="openAddRootNodeModal"
            @add-sub="openAddSubNodeModal"
            @edit-node="openEditNodeModal"
            @move-node="openMoveNodeModal"
            @delete-node="handleDeleteNode"
            @refresh="fetchTree"
          />
        </template>

        <!-- 右侧：识别结果清单展示区 -->
        <template #right>
          <div class="result-right-content">
            <!-- 统计 Header 看板 (对齐 DataCategory 看板) -->
            <div class="result-header-stats">
              <div class="stats-left">
                <span class="system-title">{{ currentDirTitle }}</span>
                <span class="count-number">{{ tableData.length }}</span>
                <span class="count-unit">个打标字段</span>
                <a-tag
                  v-if="treeSelectedNode?.visibility"
                  :color="treeSelectedNode.visibility === 'PUBLIC' ? 'green' : 'purple'"
                  class="visibility-tag"
                >
                  {{ treeSelectedNode.visibility === 'PUBLIC' ? '公开' : '机密' }}
                </a-tag>
                <a-tooltip title="根据左侧分类目录与规则扫描汇聚的字段级识别打标结果">
                  <InfoCircleOutlined class="info-icon" />
                </a-tooltip>
              </div>
            </div>

            <!-- 标准表格呈现区 (useTableHeight 自适应高度) -->
            <div ref="tableAreaRef" class="result-table-area">
              <YTable
                v-model:pagination="pagination"
                :data="tableData"
                :columns="RECOGNITION_RESULT_COLUMNS"
                :loading="loading"
                pageable
                :height="tableHeight"
                :row-config="{ keyField: 'id', useKey: true, isHover: true }"
                :checkbox-config="{ highlight: true }"
                @page-change="handlePageChange"
                @checkbox-change="onCheckboxChange"
                @checkbox-all="onCheckboxChange"
                @selection-change="onSelectionChange"
              >
                <!-- 表名列 -->
                <template #tableName="{ row }">
                  <div class="table-name-cell">
                    <TableOutlined
                      :class="['table-icon', row.assetSourceType === 'DATAPHIN' ? 'is-dataphin' : 'is-source']"
                    />
                    <div class="table-text-group">
                      <a class="table-name-primary" :title="row.tableName" @click="handleViewDetail(row)">
                        {{ row.tableName }}
                      </a>
                      <span v-if="row.tableComment" class="table-comment-sub" :title="row.tableComment">
                        {{ row.tableComment }}
                      </span>
                    </div>
                  </div>
                </template>

                <!-- 字段列 -->
                <template #fieldName="{ row }">
                  <span class="field-name-cell" :title="row.fieldName">{{ row.fieldName }}</span>
                </template>

                <!-- 资产来源列 -->
                <template #assetSourceTitle>
                  <div class="inline-flex items-center gap-1">
                    <span>资产来源</span>
                    <a-tooltip title="Dataphin表展示所属项目和板块；数据源表展示所属Database/Schema和数据源">
                      <InfoCircleOutlined class="text-gray-400 text-xs cursor-pointer" />
                    </a-tooltip>
                  </div>
                </template>
                <template #assetSourceInfo="{ row }">
                  <div class="asset-source-cell" :title="row.assetSourceInfo || row.datasourceName || '-'">
                    {{ row.assetSourceInfo || row.datasourceName || '-' }}
                  </div>
                </template>

                <!-- 数据分类列 -->
                <template #categoryName="{ row }">
                  <div class="category-name-cell">
                    <div class="cat-title-row">
                      <span class="cat-name" :title="row.categoryName || '未指定分类'">{{ row.categoryName || '未指定分类' }}</span>
                      <a-tooltip v-if="row.hasBetterRecommendation" title="检测到更高匹配度分类，点击采纳">
                        <span class="rec-badge" @click="handleAdoptRec(row)">推荐</span>
                      </a-tooltip>
                    </div>
                  </div>
                </template>

                <!-- 数据分级列 -->
                <template #securityGradeName="{ row }">
                  <span
                    class="grade-badge-cell"
                    :style="{
                      color: getGradeTagStyle(row.securityGradeName).color,
                      backgroundColor: getGradeTagStyle(row.securityGradeName).bg,
                      border: `1px solid ${getGradeTagStyle(row.securityGradeName).border}`,
                    }"
                  >
                    {{ row.securityGradeName || 'L1' }}
                  </span>
                </template>

                <!-- 脱敏生效状态列 -->
                <template #maskingStatusTitle>
                  <div class="inline-flex items-center justify-center gap-1">
                    <span>脱敏生效状态</span>
                    <a-tooltip title="开启后识别结果进入后续脱敏策略；关闭后当前字段不会被动态脱敏">
                      <InfoCircleOutlined class="text-gray-400 text-xs cursor-pointer" />
                    </a-tooltip>
                  </div>
                </template>
                <template #maskingStatus="{ row }">
                  <div class="masking-switch-cell">
                    <a-switch
                      :checked="row.maskingStatus === 'ENABLED'"
                      size="small"
                      @change="(checked: any) => handleToggleMasking(row, !!checked)"
                    />
                    <span v-if="row.maskingStatusUpdatedAt" class="switch-time-sub">
                      {{ formatDateTimeStr(row.maskingStatusUpdatedAt) }}
                    </span>
                  </div>
                </template>

                <!-- 识别方式列 -->
                <template #recognitionMethod="{ row }">
                  <div class="recognition-method-cell">
                    <span class="method-text">{{ RECOGNITION_METHOD_MAP[row.recognitionMethod]?.label || '自动识别' }}</span>
                    <a-tooltip v-if="row.isLocked" title="已手动锁定，不受后续自动识别结果覆盖">
                      <LockOutlined class="lock-icon" />
                    </a-tooltip>
                  </div>
                </template>

                <!-- 操作列 -->
                <template #action="{ row }">
                  <div class="action-btn-group">
                    <a-tooltip title="查看识别详情">
                      <a-button type="link" size="small" class="action-icon-btn" @click="handleViewDetail(row)">
                        <template #icon><FileSearchOutlined /></template>
                      </a-button>
                    </a-tooltip>

                    <a-tooltip title="编辑识别结果">
                      <a-button type="link" size="small" class="action-icon-btn" @click="handleOpenEdit(row)">
                        <template #icon><EditOutlined /></template>
                      </a-button>
                    </a-tooltip>

                    <a-tooltip :title="row.isLocked ? '解除锁定' : '锁定当前识别结果'">
                      <a-button type="link" size="small" class="action-icon-btn" @click="handleToggleLock(row)">
                        <template #icon>
                          <UnlockOutlined v-if="row.isLocked" class="text-amber-500" />
                          <LockOutlined v-else />
                        </template>
                      </a-button>
                    </a-tooltip>

                    <a-popconfirm
                      title="确定删除此识别结果吗？"
                      ok-text="删除"
                      cancel-text="取消"
                      ok-type="danger"
                      @confirm="handleDelete(row)"
                    >
                      <a-tooltip title="删除识别结果">
                        <a-button type="link" danger size="small" class="action-icon-btn danger-btn">
                          <template #icon><DeleteOutlined /></template>
                        </a-button>
                      </a-tooltip>
                    </a-popconfirm>
                  </div>
                </template>
              </YTable>
            </div>

            <!-- 底部批量浮动操作栏 -->
            <div v-if="selectedRowKeys.length > 0" class="batch-action-bar">
              <span class="selected-count">
                已选择 <span class="count-highlight">{{ selectedRowKeys.length }}</span> 项
              </span>
              <div class="batch-btn-group">
                <a-button size="small" @click="handleBatchMasking(true)">批量脱敏生效</a-button>
                <a-button size="small" @click="handleBatchMasking(false)">批量脱敏失效</a-button>
                <a-button size="small" @click="handleBatchOpenEdit">批量编辑分类</a-button>
                <a-button size="small" @click="handleBatchLock(true)">批量锁定</a-button>
                <a-popconfirm
                  title="确定批量删除选中的识别结果吗？"
                  ok-text="删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="handleBatchDelete"
                >
                  <a-button size="small" danger>批量删除</a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
        </template>
      </YSplitPane>
    </div>

    <!-- 3. 详情抽屉与各类业务弹窗 -->
    <RecognitionResultDetailDrawer ref="detailDrawerRef" @refresh="fetchList" @open-edit="handleOpenEditById" />

    <RecognitionResultEditModal ref="editModalRef" @success="fetchList" />

    <ManualAddResultModal ref="manualAddModalRef" @success="fetchList" />

    <BatchImportModal ref="batchImportModalRef" @success="fetchList" />

    <BatchImportHistoryDrawer ref="batchHistoryDrawerRef" />

    <!-- 目录树节点操作弹窗 (对齐 DataCategory) -->
    <CategoryNodeModal
      v-model:open="nodeModalVisible"
      :mode="nodeModalMode"
      :active-parent-node="activeParentNode"
      :edit-node="activeEditNode"
      :submitting="nodeSubmitting"
      @submit="handleNodeModalSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  TableOutlined,
  InfoCircleOutlined,
  FileSearchOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { YSplitPane } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { useRecognitionResultTable } from './hooks/useRecognitionResultTable';
import { useDataCategoryTree } from '../DataCategory/hooks/useDataCategoryTree';
import { RECOGNITION_RESULT_COLUMNS, getGradeTagStyle, RECOGNITION_METHOD_MAP, formatDateTimeStr } from './constant';
import CategoryTreePanel from '../DataCategory/components/CategoryTreePanel.vue';
import CategoryNodeModal from '../DataCategory/components/CategoryNodeModal.vue';
import RecognitionResultFilterBar from './components/RecognitionResultFilterBar.vue';
import RecognitionResultDetailDrawer from './components/RecognitionResultDetailDrawer.vue';
import RecognitionResultEditModal from './components/RecognitionResultEditModal.vue';
import ManualAddResultModal from './components/ManualAddResultModal.vue';
import BatchImportModal from './components/BatchImportModal.vue';
import BatchImportHistoryDrawer from './components/BatchImportHistoryDrawer.vue';
import type { RecognitionResultItem } from '@/api/recognition-result';
import type { CategoryTreeNodeVO } from '@/api/generated/data-security/schemas';

// 主表格 Hook
const {
  loading,
  tableData,
  pagination,
  selectedRowKeys,
  searchKeyword,
  filterParams,
  fetchList,
  handlePageChange,
  onSelectionChange,
  onSearch,
  onFilterChange,
  handleToggleMasking,
  handleBatchMasking,
  handleToggleLock,
  handleBatchLock,
  handleDelete,
  handleBatchDelete,
  handleAdoptRecommendation,
} = useRecognitionResultTable();

// 分类目录树 Hook (复用 DataCategory 目录树能力)
const {
  treeLoading,
  treeData: rawTreeData,
  selectedKey: treeSelectedKey,
  selectedNode: treeSelectedNode,
  fetchTree,
  handleSelect: onTreeSelectInternal,
  createNode,
  updateNode,
  deleteNode,
} = useDataCategoryTree();

const tableAreaRef = ref();
const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true, extraOffset: 24 });

// 当前选中目录标题
const currentDirTitle = computed(() => {
  if (!treeSelectedKey.value || treeSelectedKey.value === 0 || treeSelectedKey.value === 'all') {
    return '全部分类对象';
  }
  return treeSelectedNode.value?.nodeName ? `${treeSelectedNode.value.nodeName}` : '全部分类对象';
});

// 左侧目录树节点选择与右侧表格联动
const onCheckboxChange = (params: any) => {
  const records = params?.records || [];
  selectedRowKeys.value = records.map((r: any) => r.id);
};

const onTreeSelect = (keys: any[], info: any) => {
  onTreeSelectInternal(keys, info);
  const selectedId = keys.length > 0 ? keys[0] : 0;
  filterParams.treeNodeId = selectedId && selectedId !== 0 && selectedId !== '0' && selectedId !== 'all' ? selectedId : undefined;
  pagination.current = 1;
  fetchList();
};

// 弹窗与抽屉 Ref
const detailDrawerRef = ref<InstanceType<typeof RecognitionResultDetailDrawer> | null>(null);
const editModalRef = ref<InstanceType<typeof RecognitionResultEditModal> | null>(null);
const manualAddModalRef = ref<InstanceType<typeof ManualAddResultModal> | null>(null);
const batchImportModalRef = ref<InstanceType<typeof BatchImportModal> | null>(null);
const batchHistoryDrawerRef = ref<InstanceType<typeof BatchImportHistoryDrawer> | null>(null);

// 目录节点 Modal 状态
const nodeModalVisible = ref(false);
const nodeModalMode = ref<'ADD_ROOT' | 'ADD_SUB' | 'EDIT'>('ADD_ROOT');
const activeParentNode = ref<CategoryTreeNodeVO | null>(null);
const activeEditNode = ref<CategoryTreeNodeVO | null>(null);
const nodeSubmitting = ref(false);

const openAddRootNodeModal = () => {
  nodeModalMode.value = 'ADD_ROOT';
  activeParentNode.value = null;
  activeEditNode.value = null;
  nodeModalVisible.value = true;
};

const openAddSubNodeModal = (node: CategoryTreeNodeVO) => {
  nodeModalMode.value = 'ADD_SUB';
  activeParentNode.value = node;
  activeEditNode.value = null;
  nodeModalVisible.value = true;
};

const openEditNodeModal = (node: CategoryTreeNodeVO) => {
  nodeModalMode.value = 'EDIT';
  activeParentNode.value = null;
  activeEditNode.value = node;
  nodeModalVisible.value = true;
};

const openMoveNodeModal = (_node: CategoryTreeNodeVO) => {
  // 移动节点预留
};

const handleDeleteNode = async (node: CategoryTreeNodeVO) => {
  if (node.id) {
    await deleteNode(node.id);
    fetchList();
  }
};

const handleNodeModalSubmit = async (formData: any) => {
  nodeSubmitting.value = true;
  try {
    if (nodeModalMode.value === 'ADD_ROOT') {
      await createNode({ ...formData, parentId: 0 });
    } else if (nodeModalMode.value === 'ADD_SUB') {
      await createNode({ ...formData, parentId: activeParentNode.value?.id });
    } else if (nodeModalMode.value === 'EDIT' && activeEditNode.value?.id) {
      await updateNode(activeEditNode.value.id, formData);
    }
    nodeModalVisible.value = false;
  } finally {
    nodeSubmitting.value = false;
  }
};

const handleViewDetail = (row: RecognitionResultItem) => {
  detailDrawerRef.value?.open(row.id);
};

const handleOpenEdit = (row: RecognitionResultItem) => {
  editModalRef.value?.open([row.id], row.recognitionMethod, row.categoryId);
};

const handleOpenEditById = (id: number) => {
  const row = tableData.value.find(r => r.id === id);
  if (row) {
    handleOpenEdit(row);
  }
};

const handleBatchOpenEdit = () => {
  if (selectedRowKeys.value.length > 0) {
    editModalRef.value?.open(selectedRowKeys.value);
  }
};

const handleOpenManualAdd = () => {
  manualAddModalRef.value?.open();
};

const handleBatchMenuClick = (info: any) => {
  const key = info?.key;
  if (key === 'import') {
    batchImportModalRef.value?.open();
  } else if (key === 'history') {
    batchHistoryDrawerRef.value?.open();
  }
};

const handleAdoptRec = (row: RecognitionResultItem) => {
  handleAdoptRecommendation(row);
};

const handleFullRefresh = () => {
  fetchTree();
  fetchList();
};

onMounted(() => {
  fetchTree();
  fetchList();
});
</script>

<style lang="less" scoped>
@import './style.less';
</style>
