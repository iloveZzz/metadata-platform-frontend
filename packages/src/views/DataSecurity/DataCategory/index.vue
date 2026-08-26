<template>
  <div class="data-category-page">
    <!-- 1. 顶部全局导航 Tab 与控制区 (严格对齐资产目录) -->
    <div class="data-category-page__top-nav">
      <!-- 左侧：主视图标签（数据分类） -->
      <div class="nav-tabs">
        <div class="nav-tab-item is-active">数据分类</div>
      </div>

      <!-- 右侧：全局搜索与筛选操作栏 -->
      <div class="nav-controls">
        <a-checkbox v-model:checked="statusOnlyEnabled" class="status-checkbox" @change="handleStatusCheckboxChange">
          仅看已生效
        </a-checkbox>

        <a-input
          v-model:value="searchKeyword"
          placeholder="请输入数据分类名称或描述"
          allow-clear
          class="global-search-input"
          @press-enter="onSearch"
          @change="onSearchChange"
        >
          <template #prefix>
            <SearchOutlined class="text-gray-400" />
          </template>
        </a-input>

        <!-- 高级筛选 Popover -->
        <CategoryFilterBar v-model:filter="advancedFilter" :grade-list="gradeList" @change="onAdvancedFilterChange" />

        <!-- 新建分类主按钮 -->
        <a-button type="primary" class="create-btn" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新建分类
        </a-button>

        <a-tooltip title="刷新列表">
          <a-button class="refresh-btn" @click="fetchList">
            <template #icon><RedoOutlined /></template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- 2. 主体骨架：YSplitPane (左树 + 右表) -->
    <div class="data-category-page__body">
      <YSplitPane :initial-width="260" :min-width="200" :max-width="400" collapsible class="split-pane-wrapper">
        <!-- 左侧：分类目录树面板 -->
        <template #left>
          <CategoryTreePanel
            :tree-data="rawTreeData"
            :selected-key="selectedKey"
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

        <!-- 右侧：数据分类清单展示区 -->
        <template #right>
          <div class="category-right-content">
            <!-- 统计 Header 看板 (对齐资产目录 AssetHeaderStats) -->
            <div class="category-header-stats">
              <div class="stats-left">
                <span class="system-title">{{ currentDirTitle }}</span>
                <span class="count-number">{{ displayTableData.length }}</span>
                <span class="count-unit">个数据分类</span>
                <a-tag
                  v-if="selectedNode?.visibility"
                  :color="selectedNode.visibility === 'PUBLIC' ? 'green' : 'purple'"
                  class="visibility-tag"
                >
                  {{ selectedNode.visibility === 'PUBLIC' ? '公开' : '机密' }}
                </a-tag>
                <a-tooltip title="统计当前分类目录下纳管的数据安全分类项目与对应分级保护策略">
                  <InfoCircleOutlined class="info-icon" />
                </a-tooltip>
              </div>
            </div>

            <!-- 7 列标准表格呈现区 (useTableHeight 自适应高度) -->
            <div ref="tableAreaRef" class="category-table-area">
              <YTable
                :columns="CATEGORY_COLUMNS"
                :data="displayTableData"
                :loading="loading"
                :pageable="true"
                :pagination="pagination"
                :row-config="{ isCurrent: true, isHover: true, useKey: true, keyField: 'id' }"
                :max-height="tableHeight"
                :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
                @page-change="handlePageChange"
              >
                <!-- 1. 数据分类/描述 (蓝色实体方形图标 + 链接 + 描述，严格对齐资产目录) -->
                <template #categoryName="{ row }">
                  <div class="category-name-cell">
                    <div class="category-icon-box">
                      <FolderFilled class="category-icon" />
                    </div>
                    <div class="category-info-box">
                      <a class="category-name-link" :title="row.categoryName" @click="openDetailDrawer(row)">
                        {{ row.categoryName }}
                      </a>
                      <div class="category-desc-sub" :title="row.description || row.categoryName">
                        {{ row.description || row.categoryName }}
                      </div>
                    </div>
                  </div>
                </template>

                <!-- 2. 分类缩写 -->
                <template #categoryCode="{ row }">
                  <span class="category-code-text">
                    {{ row.categoryCode && row.categoryCode !== '-' ? row.categoryCode.replace(/^CAT_/, '') : '—' }}
                  </span>
                </template>

                <!-- 3. 数据分级 (胶囊标签) -->
                <template #securityGradeName="{ row }">
                  <span
                    class="grade-pill-tag"
                    :style="{
                      color: getGradeTagStyle(row.sensitivityScore, getGradeCode(row)).color,
                      backgroundColor: getGradeTagStyle(row.sensitivityScore, getGradeCode(row)).bg,
                      border: `1px solid ${getGradeTagStyle(row.sensitivityScore, getGradeCode(row)).border}`,
                    }"
                  >
                    <SafetyCertificateOutlined style="font-size: 11px" />
                    <span>{{ getGradeCode(row) }}</span>
                  </span>
                </template>

                <!-- 4. 优先级 (盾牌标签) -->
                <template #priorityTitle>
                  <span class="inline-flex items-center gap-1">
                    <span>优先级</span>
                    <a-tooltip title="冲突仲裁优先级：分类优先级 (1最高) > 识别更新时间 > 分类修改时间">
                      <InfoCircleOutlined class="header-info-icon" />
                    </a-tooltip>
                  </span>
                </template>
                <template #priority="{ row }">
                  <a-tooltip title="冲突仲裁优先级：分类优先级 (1最高) > 识别更新时间 > 分类修改时间">
                    <span class="priority-shield-tag cursor-pointer">
                      <SafetyCertificateOutlined style="font-size: 10px" />
                      <span>{{ row.priority || 3 }}</span>
                    </span>
                  </a-tooltip>
                </template>

                <!-- 5. 生效字段数 (可点击跳转/查看清单) -->
                <template #activeFields="{ row }">
                  <a class="active-fields-link" @click="showActiveFields(row)">
                    <span>{{ row.activeFieldsCount || 0 }}</span>
                    <TableOutlined style="font-size: 12px; margin-left: 3px" />
                  </a>
                </template>

                <!-- 6. 生效状态 -->
                <template #statusTitle>
                  <span class="inline-flex items-center gap-1">
                    <span>生效状态</span>
                    <a-tooltip title="仅生效状态的数据分类可作为识别结果参与扫描与动态脱敏。">
                      <InfoCircleOutlined class="header-info-icon" />
                    </a-tooltip>
                  </span>
                </template>
                <template #status="{ row }">
                  <a-switch
                    :checked="row.status === 'ENABLED'"
                    size="small"
                    @change="checked => handleToggleStatus(row, checked as boolean)"
                  />
                </template>

                <!-- 7. 操作列 (图标按钮对齐资产目录 action-icon-btn) -->
                <template #action="{ row }">
                  <div class="category-actions">
                    <a-tooltip title="查看详情">
                      <a-button type="link" size="small" class="action-icon-btn" @click="openDetailDrawer(row)">
                        <ProfileOutlined />
                      </a-button>
                    </a-tooltip>
                    <a-tooltip title="编辑分类">
                      <a-button type="link" size="small" class="action-icon-btn" @click="openEditModal(row)">
                        <EditOutlined />
                      </a-button>
                    </a-tooltip>
                    <a-tooltip title="移动分类">
                      <a-button type="link" size="small" class="action-icon-btn" @click="openSingleMoveModal(row)">
                        <ExportOutlined />
                      </a-button>
                    </a-tooltip>
                    <a-dropdown :trigger="['click']">
                      <a-button type="link" size="small" class="action-icon-btn">
                        <MoreOutlined />
                      </a-button>
                      <template #overlay>
                        <a-menu>
                          <a-menu-item key="mask" @click="handleSetMasking(row)">
                            <SecurityScanOutlined style="margin-right: 6px" />设置脱敏
                          </a-menu-item>
                          <a-menu-divider />
                          <a-menu-item key="delete" danger @click="handleDeleteCategory(row)">
                            <DeleteOutlined style="margin-right: 6px" />删除分类
                          </a-menu-item>
                        </a-menu>
                      </template>
                    </a-dropdown>
                  </div>
                </template>

                <!-- 空态 -->
                <template #empty>
                  <div class="custom-empty-state">
                    <a-empty description="暂无匹配的数据分类记录" />
                  </div>
                </template>
              </YTable>
            </div>

            <!-- 底部浮动批量操作条 (选中时显示) -->
            <div v-if="selectedRowKeys.length > 0" class="floating-batch-bar">
              <div class="batch-bar-left">
                已选中 <strong class="highlight-count">{{ selectedRowKeys.length }}</strong> 项数据分类
              </div>
              <div class="batch-bar-actions">
                <a-button size="small" @click="batchMoveModalVisible = true">
                  <template #icon><ExportOutlined /></template>
                  批量移动 ({{ selectedRowKeys.length }})
                </a-button>
                <a-button size="small" @click="batchGradeModalVisible = true">
                  <template #icon><SafetyCertificateOutlined /></template>
                  指定数据分级 ({{ selectedRowKeys.length }})
                </a-button>
                <a-button size="small" @click="handleBatchEnable">
                  <template #icon><CheckCircleOutlined /></template>
                  批量开启
                </a-button>
                <a-button size="small" @click="handleBatchDisable">
                  <template #icon><StopOutlined /></template>
                  批量停用
                </a-button>
                <a-button size="small" @click="handleExport">
                  <template #icon><DownloadOutlined /></template>
                  导出分类
                </a-button>
                <a-popconfirm
                  :title="`确认批量删除选中的 ${selectedRowKeys.length} 个分类？`"
                  description="删除后将级联清除已关联的识别规则引用与脱敏策略！"
                  ok-text="确认删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="handleBatchDelete"
                >
                  <a-button type="primary" danger size="small">
                    <template #icon><DeleteOutlined /></template>
                    批量删除
                  </a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
        </template>
      </YSplitPane>
    </div>

    <!-- 弹窗与抽屉组件 -->
    <CategoryFormModal
      v-model:open="modalVisible"
      :is-edit="isEditMode"
      :edit-data="currentEditData"
      :grade-list="gradeList"
      :tree-data="rawTreeData"
      :current-tree-node-id="selectedKey"
      :submitting="submitting"
      @submit="handleModalSubmit"
    />

    <CategoryNodeModal
      v-model:open="nodeModalVisible"
      :mode="nodeModalMode"
      :active-parent-node="activeParentNode"
      :edit-node="editNode"
      :submitting="nodeSubmitting"
      @submit="handleNodeModalSubmit"
    />

    <CategoryDetailDrawer v-model:open="detailDrawerVisible" :category="activeCategoryDetail" />

    <CategoryBatchModal
      v-model:move-open="batchMoveModalVisible"
      v-model:grade-open="batchGradeModalVisible"
      :selected-count="selectedRowKeys.length"
      :tree-data="rawTreeData"
      :grade-list="gradeList"
      @move="handleBatchMove"
      @grade="handleBatchGrade"
    />

    <!-- 停用策略确认 Modal -->
    <a-modal
      v-model:open="disableModalVisible"
      title="停用数据分类"
      width="460px"
      ok-text="确认停用"
      cancel-text="取消"
      @ok="confirmDisable"
    >
      <div class="py-2">
        <p class="text-xs text-gray-600 mb-3">
          您正在停用分类【<strong>{{ pendingToggleCategory?.categoryName }}</strong
          >】。停用后将忽略该分类且不继续生成新的识别记录。请选择针对已生成的识别记录的处理策略：
        </p>
        <a-radio-group v-model:value="disablePolicy" class="w-full">
          <a-space direction="vertical" class="w-full">
            <a-radio value="RETAIN_TAGS">
              <span class="font-semibold text-gray-800">保留已有打标（推荐）</span>
              <div class="text-xs text-gray-500">已生成的识别结果保留并标识为“已停用”，脱敏暂不生效。</div>
            </a-radio>
            <a-radio value="DELETE_TAGS">
              <span class="font-semibold text-gray-800">同步删除打标</span>
              <div class="text-xs text-gray-500">同步清除当前分类已生成的所有识别记录，并重新仲裁识别结果。</div>
            </a-radio>
          </a-space>
        </a-radio-group>
      </div>
    </a-modal>

    <!-- 生效字段清单 Drawer -->
    <a-drawer
      v-model:open="activeFieldsDrawerVisible"
      :title="`分类【${activeFieldCategory?.categoryName || ''}】覆盖生效字段清单`"
      width="680px"
      placement="right"
    >
      <div v-if="activeFieldCategory" class="active-fields-content">
        <div class="bg-blue-50 p-3 rounded mb-3 border border-blue-100 text-xs text-gray-600">
          共在当前数据源中识别并生效于 <strong>{{ activeFieldsList.length }}</strong> 个表字段（匹配优先级:
          {{ activeFieldCategory.priority || 1 }}）。
        </div>
        <a-table
          :data-source="activeFieldsList"
          :loading="activeFieldsLoading"
          :columns="activeFieldColumns"
          size="small"
          :pagination="{ pageSize: 10 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'fieldName'">
              <span class="font-mono font-medium text-gray-900">{{ record.fieldName }}</span>
              <div class="text-xs text-gray-400">{{ record.fieldComment || '-' }}</div>
            </template>
            <template v-else-if="column.key === 'tableName'">
              <span class="font-mono text-xs text-gray-800">{{ record.tableName }}</span>
              <div class="text-xs text-gray-400">{{ record.dataSourceName }}</div>
            </template>
            <template v-else-if="column.key === 'matchRule'">
              <a-tag color="blue" class="text-xs">{{ record.matchRule }}</a-tag>
            </template>
          </template>
        </a-table>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message, Radio } from 'ant-design-vue';
import {
  SearchOutlined,
  RedoOutlined,
  PlusOutlined,
  FolderFilled,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  TableOutlined,
  ProfileOutlined,
  EditOutlined,
  ExportOutlined,
  MoreOutlined,
  DeleteOutlined,
  SecurityScanOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue';
import { YSplitPane, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { useDataCategoryTree } from './hooks/useDataCategoryTree';
import { useDataCategoryTable } from './hooks/useDataCategoryTable';
import { CATEGORY_COLUMNS, getGradeTagStyle } from './constant';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { DataCategoryVO, SecurityGradeVO, CategoryTreeNodeVO } from '@/api/generated/data-security/schemas';
import CategoryTreePanel from './components/CategoryTreePanel.vue';
import CategoryFilterBar, { type CategoryFilterState } from './components/CategoryFilterBar.vue';
import CategoryFormModal from './components/CategoryFormModal.vue';
import CategoryNodeModal from './components/CategoryNodeModal.vue';
import CategoryDetailDrawer from './components/CategoryDetailDrawer.vue';
import CategoryBatchModal from './components/CategoryBatchModal.vue';
import './style.less';

const ARadio = Radio;
const ARadioGroup = Radio.Group;

defineOptions({ name: 'DataCategoryPage' });

const api = getDataSecurityCenterAPIAPIApi();
const tableAreaRef = ref<HTMLElement>();
const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true });

const {
  treeLoading,
  treeData: rawTreeData,
  selectedKey,
  selectedNode,
  fetchTree,
  createNode,
  updateNode,
  deleteNode,
} = useDataCategoryTree();

const { loading, tableData, pagination, fetchList, query, handlePageChange, handleDelete } = useDataCategoryTable();

// 筛选状态
const statusOnlyEnabled = ref(false);
const searchKeyword = ref('');
const advancedFilter = ref<CategoryFilterState>({
  gradeId: undefined,
  priority: undefined,
  status: undefined,
  visibility: undefined,
  hasActiveFields: false,
});
const gradeList = ref<SecurityGradeVO[]>([]);
const selectedRowKeys = ref<number[]>([]);

// 目录标题
const currentDirTitle = computed(() => {
  if (!selectedNode.value || selectedKey.value === 0 || selectedKey.value === null) return '全部分类';
  return selectedNode.value.nodeName;
});

// 列表数据前端组合过滤
const displayTableData = computed(() => {
  return tableData.value.filter(row => {
    // 快捷状态过滤（仅看已生效）
    if (statusOnlyEnabled.value && row.status !== 'ENABLED') {
      return false;
    }

    // 高级筛选：生效状态
    if (advancedFilter.value.status && advancedFilter.value.status !== 'ALL') {
      if (row.status !== advancedFilter.value.status) return false;
    }

    // 高级筛选：数据分级
    if (advancedFilter.value.gradeId && advancedFilter.value.gradeId !== 'ALL') {
      if (String(row.securityGradeId) !== advancedFilter.value.gradeId) return false;
    }

    // 高级筛选：优先级
    if (advancedFilter.value.priority !== undefined) {
      if (row.priority !== advancedFilter.value.priority) return false;
    }

    // 高级筛选：仅看有生效字段
    if (advancedFilter.value.hasActiveFields) {
      if (!row.activeFieldsCount || row.activeFieldsCount <= 0) return false;
    }

    // 关键词过滤
    if (searchKeyword.value) {
      const kw = searchKeyword.value.trim().toLowerCase();
      const matchName = row.categoryName?.toLowerCase().includes(kw);
      const matchCode = row.categoryCode?.toLowerCase().includes(kw);
      const matchDesc = row.description?.toLowerCase().includes(kw);
      if (!matchName && !matchCode && !matchDesc) return false;
    }

    return true;
  });
});

const getGradeCode = (row: DataCategoryVO) => {
  if (row.securityGradeName) {
    if (row.securityGradeName.includes('L5')) return 'L5';
    if (row.securityGradeName.includes('L4')) return 'L4';
    if (row.securityGradeName.includes('L3')) return 'L3';
    if (row.securityGradeName.includes('L2')) return 'L2';
    if (row.securityGradeName.includes('L1')) return 'L1';
  }
  if (row.securityGradeId) {
    return `L${row.securityGradeId}`;
  }
  return 'L2';
};

const loadGrades = async () => {
  try {
    const res = await api.listSecurityGrades();
    gradeList.value = res.data || [];
  } catch (err: any) {
    message.error(err?.message || '加载安全分级失败');
  }
};

const onTreeSelect = (keys: any[], info: any) => {
  if (keys.length === 0 || keys[0] === 0) {
    selectedKey.value = 0;
    selectedNode.value = null;
    query({ treeNodeId: undefined, pageIndex: 1 });
  } else {
    selectedKey.value = keys[0];
    selectedNode.value = info?.node?.dataRef || info?.node || null;
    query({ treeNodeId: keys[0], pageIndex: 1 });
  }
};

const handleStatusCheckboxChange = () => {
  // displayTableData 响应式自动过滤
};

const onSearch = () => query({ keyword: searchKeyword.value || undefined, pageIndex: 1 });
const onSearchChange = () => {
  if (!searchKeyword.value) onSearch();
};
const onAdvancedFilterChange = () => {
  // displayTableData 响应式自动过滤
};

const onSelectChange = (keys: number[]) => {
  selectedRowKeys.value = keys;
};

// 分类增改
const modalVisible = ref(false);
const isEditMode = ref(false);
const submitting = ref(false);
const currentEditId = ref<number | null>(null);
const currentEditData = ref<DataCategoryVO | null>(null);

const openCreateModal = () => {
  isEditMode.value = false;
  currentEditId.value = null;
  currentEditData.value = null;
  modalVisible.value = true;
};

const openEditModal = (row: DataCategoryVO) => {
  isEditMode.value = true;
  currentEditId.value = row.id!;
  currentEditData.value = row;
  modalVisible.value = true;
};

const handleModalSubmit = async (values: any) => {
  submitting.value = true;
  try {
    const targetTreeNodeId =
      values.treeNodeId ||
      (selectedKey.value && selectedKey.value !== 0
        ? selectedKey.value
        : rawTreeData.value.length > 0
          ? rawTreeData.value[0].id
          : undefined);
    if (isEditMode.value && currentEditId.value) {
      await api.updateDataCategory(currentEditId.value, { ...values, treeNodeId: targetTreeNodeId });
      message.success('数据分类已更新');
    } else {
      await api.createDataCategory({ ...values, treeNodeId: targetTreeNodeId });
      message.success('数据分类创建成功');
    }
    modalVisible.value = false;
    fetchTree();
    fetchList();
  } catch (err: any) {
    message.error(err?.message || '保存数据分类失败');
  } finally {
    submitting.value = false;
  }
};

const handleDeleteCategory = async (row: DataCategoryVO) => {
  await handleDelete(row);
  fetchTree();
};

// 启停状态与策略
const disableModalVisible = ref(false);
const pendingToggleCategory = ref<DataCategoryVO | null>(null);
const disablePolicy = ref<'RETAIN_TAGS' | 'DELETE_TAGS'>('RETAIN_TAGS');

const handleToggleStatus = async (row: DataCategoryVO, checked: boolean) => {
  if (checked) {
    try {
      await api.changeDataCategoryStatus(row.id!, {
        status: 'ENABLED',
        disablePolicy: 'RETAIN_TAGS',
      });
      message.success(`分类【${row.categoryName}】已开启生效`);
      fetchList();
    } catch (err: any) {
      message.error(err?.message || '开启分类失败');
    }
  } else {
    pendingToggleCategory.value = row;
    disablePolicy.value = 'RETAIN_TAGS';
    disableModalVisible.value = true;
  }
};

const confirmDisable = async () => {
  if (!pendingToggleCategory.value) return;
  try {
    await api.changeDataCategoryStatus(pendingToggleCategory.value.id!, {
      status: 'DISABLED',
      disablePolicy: disablePolicy.value,
    });
    message.success(
      `分类【${pendingToggleCategory.value.categoryName}】已停用 (${
        disablePolicy.value === 'DELETE_TAGS' ? '已同步删除打标' : '已保留历史打标'
      })`
    );
    disableModalVisible.value = false;
    pendingToggleCategory.value = null;
    fetchList();
  } catch (err: any) {
    message.error(err?.message || '停用分类失败');
  }
};

// 目录节点操作
const nodeModalVisible = ref(false);
const nodeModalMode = ref<'ADD_ROOT' | 'ADD_SUB' | 'EDIT'>('ADD_ROOT');
const nodeSubmitting = ref(false);
const activeParentNode = ref<CategoryTreeNodeVO | null>(null);
const editNode = ref<CategoryTreeNodeVO | null>(null);

const openAddRootNodeModal = () => {
  nodeModalMode.value = 'ADD_ROOT';
  activeParentNode.value = null;
  editNode.value = null;
  nodeModalVisible.value = true;
};

const openAddSubNodeModal = (node: CategoryTreeNodeVO) => {
  nodeModalMode.value = 'ADD_SUB';
  activeParentNode.value = node;
  editNode.value = null;
  nodeModalVisible.value = true;
};

const openEditNodeModal = (node: CategoryTreeNodeVO) => {
  nodeModalMode.value = 'EDIT';
  activeParentNode.value = null;
  editNode.value = node;
  nodeModalVisible.value = true;
};

const openMoveNodeModal = (node: CategoryTreeNodeVO) => {
  message.info(`移动目录【${node.nodeName}】：可选择将其作为子目录或升级为一级目录。`);
  openEditNodeModal(node);
};

const handleNodeModalSubmit = async (form: any) => {
  nodeSubmitting.value = true;
  try {
    if (nodeModalMode.value === 'EDIT' && editNode.value?.id) {
      await updateNode(editNode.value.id, form);
    } else {
      const parentId = nodeModalMode.value === 'ADD_SUB' ? activeParentNode.value?.id : 0;
      await createNode({ parentId, ...form });
    }
    nodeModalVisible.value = false;
  } finally {
    nodeSubmitting.value = false;
  }
};

const handleDeleteNode = async (node: CategoryTreeNodeVO) => {
  await deleteNode(node.id!);
  fetchList();
};

// 详情抽屉
const detailDrawerVisible = ref(false);
const activeCategoryDetail = ref<DataCategoryVO | null>(null);
const openDetailDrawer = (row: DataCategoryVO) => {
  activeCategoryDetail.value = row;
  detailDrawerVisible.value = true;
};

// 生效字段抽屉
const activeFieldsDrawerVisible = ref(false);
const activeFieldCategory = ref<DataCategoryVO | null>(null);
const activeFieldsList = ref<any[]>([]);
const activeFieldsLoading = ref(false);

const showActiveFields = async (row: DataCategoryVO) => {
  activeFieldCategory.value = row;
  activeFieldsDrawerVisible.value = true;
  activeFieldsLoading.value = true;
  try {
    const res = await api.getActiveFields(row.id!);
    activeFieldsList.value = res.data || [];
  } catch (err: any) {
    message.error(err?.message || '加载生效字段清单失败');
  } finally {
    activeFieldsLoading.value = false;
  }
};

const activeFieldColumns = [
  { title: '字段名称 / 业务含义', key: 'fieldName', dataIndex: 'fieldName' },
  { title: '所在表与数据源', key: 'tableName', dataIndex: 'tableName' },
  { title: '命中识别规则', key: 'matchRule', dataIndex: 'matchRule' },
  { title: '识别置信度', key: 'confidence', dataIndex: 'confidence' },
  { title: '最新扫描时间', key: 'lastScanTime', dataIndex: 'lastScanTime' },
];

// 批量操作
const batchMoveModalVisible = ref(false);
const batchGradeModalVisible = ref(false);

const openSingleMoveModal = (row: DataCategoryVO) => {
  selectedRowKeys.value = [row.id!];
  batchMoveModalVisible.value = true;
};

const handleBatchMove = async (targetNodeId: number) => {
  try {
    await api.batchMove({ categoryIds: selectedRowKeys.value, targetTreeNodeId: targetNodeId });
    message.success(`已成功将 ${selectedRowKeys.value.length} 个分类移动至目标目录！`);
    batchMoveModalVisible.value = false;
    selectedRowKeys.value = [];
    fetchTree();
    fetchList();
  } catch (err: any) {
    message.error(err?.message || '批量移动分类失败');
  }
};

const handleBatchGrade = async (targetGradeId: number) => {
  try {
    await api.batchGrade({ categoryIds: selectedRowKeys.value, securityGradeId: targetGradeId });
    message.success(`已成功为 ${selectedRowKeys.value.length} 个分类批量指定安全分级！`);
    batchGradeModalVisible.value = false;
    selectedRowKeys.value = [];
    fetchList();
  } catch (err: any) {
    message.error(err?.message || '批量指定分级失败');
  }
};

const handleBatchEnable = async () => {
  try {
    await api.batchStatus({
      categoryIds: selectedRowKeys.value,
      status: 'ENABLED',
      disablePolicy: 'RETAIN_TAGS',
    });
    message.success(`已成功批量开启 ${selectedRowKeys.value.length} 个数据分类！`);
    selectedRowKeys.value = [];
    fetchList();
  } catch (err: any) {
    message.error(err?.message || '批量开启分类失败');
  }
};

const handleBatchDisable = async () => {
  try {
    await api.batchStatus({
      categoryIds: selectedRowKeys.value,
      status: 'DISABLED',
      disablePolicy: 'RETAIN_TAGS',
    });
    message.success(`已成功批量停用 ${selectedRowKeys.value.length} 个数据分类！`);
    selectedRowKeys.value = [];
    fetchList();
  } catch (err: any) {
    message.error(err?.message || '批量停用分类失败');
  }
};

const handleBatchDelete = async () => {
  try {
    await api.batchDelete({ categoryIds: selectedRowKeys.value });
    message.success(`已成功批量删除 ${selectedRowKeys.value.length} 个数据分类！`);
    selectedRowKeys.value = [];
    fetchTree();
    fetchList();
  } catch (err: any) {
    message.error(err?.message || '批量删除分类失败');
  }
};

const handleSetMasking = (row: DataCategoryVO) => {
  message.info(`即将为分类【${row.categoryName}】配置关联动态脱敏规则...`);
};

const handleExport = async () => {
  try {
    const res = await api.exportCategories(
      selectedKey.value && selectedKey.value !== 0 ? Number(selectedKey.value) : undefined,
      searchKeyword.value || undefined,
      undefined
    );
    const dataList = res.data || [];
    message.success(`已成功查询并导出 ${dataList.length} 条数据分类清单！`);
  } catch (err: any) {
    message.error(err?.message || '导出分类清单失败');
  }
};

onMounted(() => {
  loadGrades();
  fetchList();
});
</script>
