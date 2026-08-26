<template>
  <div class="masking-rule-page">
    <!-- 顶部导航与操作栏 -->
    <div class="top-page-header">
      <div class="header-layout">
        <div class="page-main-tabs">
          <a-tabs v-model:active-key="activeTabKey" @change="onTabChange">
            <a-tab-pane key="dynamic" tab="动态脱敏规则" />
            <a-tab-pane key="static" tab="静态脱敏" />
          </a-tabs>
        </div>

        <div class="header-actions">
          <a-button @click="openDefaultPolicyModal"> 默认脱敏策略 </a-button>
          <a-button type="primary" @click="openCreateDrawer">
            <template #icon><PlusOutlined /></template>
            新建动态脱敏规则
          </a-button>
          <a-tooltip title="刷新列表">
            <a-button @click="() => fetchList()">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </a-tooltip>
        </div>
      </div>
    </div>

    <!-- 当激活为动态脱敏规则时的主视图 -->
    <template v-if="activeTabKey === 'dynamic'">
      <!-- ① 规则介绍卡片 (可折叠收起) -->
      <MaskingIntroBanner />

      <YCard class-name="page-card content-card" :bordered="false">
        <!-- ② 筛选及搜索区 -->
        <div class="filter-search-section">
          <div class="search-row">
            <a-input-search
              v-model:value="searchKeyword"
              placeholder="请输入脱敏规则名称或数据分类搜索"
              allow-clear
              class="search-input"
              @search="handleSearch"
            />
            <a-button type="link" size="small" @click="openMaskEvalModal">
              <template #icon><ThunderboltOutlined /></template>
              脱敏效果试算
            </a-button>
          </div>

          <div class="filter-type-row">
            <div class="flex items-center">
              <span class="type-label">脱敏类型</span>
              <div class="type-radios">
                <button class="type-pill-btn" :class="{ active: selectedRuleType === '' }" @click="selectType('')">
                  全部
                </button>
                <button
                  class="type-pill-btn"
                  :class="{ active: selectedRuleType === 'MASK' }"
                  @click="selectType('MASK')"
                >
                  遮盖掩码
                </button>
                <button
                  class="type-pill-btn"
                  :class="{ active: selectedRuleType === 'HASH' }"
                  @click="selectType('HASH')"
                >
                  哈希脱敏
                </button>
                <button
                  class="type-pill-btn"
                  :class="{ active: selectedRuleType === 'CRYPTO' }"
                  @click="selectType('CRYPTO')"
                >
                  加密
                </button>
                <button
                  class="type-pill-btn"
                  :class="{ active: selectedRuleType === 'OTHER' }"
                  @click="selectType('OTHER')"
                >
                  其它
                </button>
              </div>
            </div>

            <div class="expand-toggle" @click="isFilterExpanded = !isFilterExpanded">
              <DownOutlined v-if="!isFilterExpanded" />
              <UpOutlined v-else />
            </div>
          </div>

          <!-- 展开更多过滤项 -->
          <div v-show="isFilterExpanded" class="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4">
            <a-select
              v-model:value="selectedCategoryId"
              placeholder="按数据分类筛选"
              style="width: 240px"
              allow-clear
              @change="handleSearch"
            >
              <a-select-option v-for="c in categoryList" :key="c.id" :value="c.id">
                {{ c.categoryName }}
              </a-select-option>
            </a-select>

            <a-select
              v-model:value="selectedScene"
              placeholder="按应用场景筛选"
              style="width: 180px"
              allow-clear
              @change="handleSearch"
            >
              <a-select-option value="WRITE_DEV_TABLE">写开发表</a-select-option>
              <a-select-option value="DATA_QUERY">数据查询</a-select-option>
            </a-select>
          </div>
        </div>

        <!-- ③ 动态脱敏规则列表表格 (YTable) -->
        <div ref="tableRef" class="table-container">
          <YTable
            :data="tableData"
            :columns="columns"
            :loading="loading"
            pageable
            :pagination="pagination"
            :max-height="tableHeight"
            @page-change="handlePageChange"
          >
            <!-- 1. 规则名称列 -->
            <template #ruleName="{ row }">
              <div class="rule-name-cell">
                <span class="rule-name-title">{{ row.ruleName }}</span>
                <span v-if="row.description" class="rule-sub-text">{{ row.description }}</span>
              </div>
            </template>

            <!-- 2. 数据分类列 -->
            <template #categoryName="{ row }">
              <div class="flex items-center text-gray-700">
                <FolderOutlined style="margin-right: 6px; color: var(--ant-primary-color, #1677ff)" />
                <span>{{ row.categoryName || getCategoryName(row.categoryId) }}</span>
              </div>
            </template>

            <!-- 3. 脱敏算法列 -->
            <template #algorithmType="{ row }">
              <a-space size="small">
                <a-tag :color="getAlgorithmTagColor(row.algorithmType)">
                  {{ formatAlgorithmLabel(row.algorithmType, row.subAlgorithm) }}
                </a-tag>
              </a-space>
            </template>

            <!-- 4. 应用场景列 -->
            <template #applyScene="{ row }">
              <div class="scene-tag-box">
                <span v-if="(row.applyScene || '').includes('WRITE_DEV_TABLE')" class="scene-item dev-table">
                  <span class="dot"></span>写开发表
                </span>
                <span v-if="(row.applyScene || '').includes('DATA_QUERY')" class="scene-item data-query">
                  <span class="dot"></span>数据查询
                </span>
                <span v-if="!row.applyScene" class="scene-item"> <span class="dot"></span>数据查询 (默认) </span>
              </div>
            </template>

            <!-- 5. 负责人列 -->
            <template #owner="{ row }">
              <span class="text-gray-700">{{ row.owner || '安全管理员' }}</span>
            </template>

            <!-- 6. 生效状态 Switch 列 -->
            <template #statusHeader>
              <span>生效状态</span>
              <a-tooltip title="决定当前脱敏规则是否生效，关闭则不会进行脱敏，开启后脱敏规则立即生效">
                <QuestionCircleOutlined style="margin-left: 4px; color: #8c8c8c; cursor: pointer" />
              </a-tooltip>
            </template>
            <template #status="{ row }">
              <a-switch
                :checked="row.status === 'ENABLED' || row.status === 'ACTIVE'"
                size="small"
                checked-children="开"
                un-checked-children="关"
                @change="(checked: any) => handleToggleStatus(row, !!checked)"
              />
            </template>

            <!-- 7. 操作列 -->
            <template #action="{ row }">
              <a-space size="small">
                <a-tooltip title="编辑规则">
                  <a-button type="link" size="small" @click="openEditDrawer(row)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                </a-tooltip>

                <a-tooltip title="转交负责人">
                  <a-button type="link" size="small" @click="openTransferModal(row)">
                    <template #icon><UserSwitchOutlined /></template>
                  </a-button>
                </a-tooltip>

                <a-popconfirm
                  title="删除动态脱敏规则后，将会对应用本规则的所有数据的动态脱敏进行删除，请谨慎操作。"
                  ok-text="确认删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="handleDelete(row)"
                >
                  <a-tooltip title="删除">
                    <a-button type="link" danger size="small">
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>

                <a-dropdown :trigger="['click']">
                  <a-button type="link" size="small">
                    <template #icon><MoreOutlined /></template>
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item @click="openViewDrawer(row as any)"> 查看脱敏算法参数 </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </YTable>
        </div>
      </YCard>
    </template>

    <!-- 静态脱敏 Tab 视图 -->
    <template v-else-if="activeTabKey === 'static'">
      <StaticMaskingView />
    </template>

    <!-- 新建 / 编辑 / 查看 动态脱敏规则 抽屉 -->
    <MaskingRuleDrawer
      v-model:visible="drawerVisible"
      :is-edit="isEditMode"
      :readonly="isReadOnlyMode"
      :initial-data="selectedRowForEdit"
      :category-list="categoryList"
      @success="handleDrawerSuccess"
    />

    <!-- 默认脱敏策略 弹窗 -->
    <DefaultPolicyModal v-model:visible="defaultPolicyVisible" />

    <!-- 转交负责人 弹窗 -->
    <TransferOwnerModal
      v-model:visible="transferModalVisible"
      :target-rule="selectedRowForTransfer"
      @success="() => fetchList()"
    />

    <!-- 脱敏算法试算工作台 弹窗 -->
    <a-modal
      v-model:open="maskEvalModalVisible"
      title="动态脱敏计算引擎 - 实时评估试算"
      :confirm-loading="evaluating"
      width="720px"
      @ok="handleRunMaskEval"
    >
      <div class="mt-4">
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="数据源标识" required>
                <a-input v-model:value="evalForm.datasourceId" placeholder="例如：ds_mysql_prod" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="数据表名" required>
                <a-input v-model:value="evalForm.tableName" placeholder="例如：t_user_info" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="输入样本 JSON 数据行集合" required>
            <a-textarea v-model:value="evalForm.rawRowsJson" :rows="4" />
          </a-form-item>
        </a-form>

        <div v-if="evalResultRows.length > 0" class="sim-eval-box">
          <div class="text-xs font-bold text-gray-700 mb-2">脱敏运算输出结果 (安全遮盖/加密/哈希后数据):</div>
          <pre class="bg-gray-900 text-green-400 p-2 rounded text-xs overflow-x-auto">{{
            JSON.stringify(evalResultRows, null, 2)
          }}</pre>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
  UserSwitchOutlined,
  MoreOutlined,
  QuestionCircleOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons-vue';
import { YCard, YTable, type YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { useMaskingRuleTable } from './hooks/useMaskingRuleTable';
import MaskingIntroBanner from './components/MaskingIntroBanner.vue';
import MaskingRuleDrawer from './components/MaskingRuleDrawer.vue';
import DefaultPolicyModal from './components/DefaultPolicyModal.vue';
import TransferOwnerModal from './components/TransferOwnerModal.vue';
import StaticMaskingView from './components/StaticMaskingView.vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { MaskingRuleVO, DataCategoryVO } from '@/api/generated/data-security/schemas';
import './style.less';

defineOptions({ name: 'MaskingRulePage' });

const api = getDataSecurityCenterAPIAPIApi();
const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

const { loading, tableData, pagination, fetchList, query, handlePageChange, handleDelete, handleToggleStatus } =
  useMaskingRuleTable();

const activeTabKey = ref('dynamic');
const searchKeyword = ref('');
const selectedRuleType = ref('');
const selectedCategoryId = ref<number | undefined>(undefined);
const selectedScene = ref<string | undefined>(undefined);
const isFilterExpanded = ref(false);

const categoryList = ref<DataCategoryVO[]>([]);

const columns: YTableColumn[] = [
  { title: '脱敏规则名称', field: 'ruleName', minWidth: 200, slots: { default: 'ruleName' } },
  { title: '数据分类', field: 'categoryName', width: 220, slots: { default: 'categoryName' } },
  { title: '脱敏算法', field: 'algorithmType', width: 170, slots: { default: 'algorithmType' } },
  { title: '应用场景', field: 'applyScene', width: 180, slots: { default: 'applyScene' } },
  { title: '负责人', field: 'owner', width: 130, slots: { default: 'owner' } },
  { title: '更新时间', field: 'updatedAt', width: 160 },
  {
    title: '生效状态',
    field: 'status',
    width: 110,
    align: 'center',
    slots: { header: 'statusHeader', default: 'status' },
  },
  {
    title: '操作',
    field: 'action',
    width: 140,
    align: 'center',
    fixed: 'right',
    slots: { default: 'action' },
  },
];

const getAlgorithmTagColor = (type?: string) => {
  switch (type) {
    case 'MASK':
      return 'blue';
    case 'HASH':
      return 'purple';
    case 'CRYPTO':
      return 'green';
    case 'OTHER':
      return 'orange';
    default:
      return 'default';
  }
};

const formatAlgorithmLabel = (type?: string, sub?: string) => {
  if (sub) {
    if (sub.includes('KEYWORD')) return '关键字替换';
    if (sub.includes('CUSTOM')) return '自定义掩码';
    if (sub.includes('SHA256')) return '加盐SHA256';
    if (sub.includes('SHA384')) return '加盐SHA384';
    if (sub.includes('MD5')) return '加盐MD5';
    if (sub.includes('SHA512')) return '加盐SHA512';
    if (sub.includes('FPE')) return 'FPE保留格式加密';
    if (sub.includes('NULL')) return '置空 (NULL)';
    if (sub.includes('NO_MASK')) return '不脱敏';
  }
  switch (type) {
    case 'MASK':
      return '遮盖掩码';
    case 'HASH':
      return '哈希脱敏';
    case 'CRYPTO':
      return '加密脱敏';
    case 'OTHER':
      return '其它';
    default:
      return type || '遮盖掩码';
  }
};

const getCategoryName = (categoryId?: number) => {
  const item = categoryList.value.find(c => c.id === categoryId);
  return item ? item.categoryName : '通用分类';
};

const selectType = (type: string) => {
  selectedRuleType.value = type;
  handleSearch();
};

const handleSearch = () => {
  query({
    keyword: searchKeyword.value,
    ruleType: selectedRuleType.value,
    categoryId: selectedCategoryId.value,
    applyScene: selectedScene.value || undefined,
    pageIndex: 1,
  });
};

const onTabChange = () => {
  // tab 切换
};

const loadMetadata = async () => {
  try {
    const catRes = await api.pageDataCategories({ pageIndex: 1, pageSize: 200 });
    categoryList.value = (catRes as any)?.data || [];
  } catch (err: any) {
    console.error('加载分类元数据失败', err);
  }
};

// 抽屉管理
const drawerVisible = ref(false);
const isEditMode = ref(false);
const isReadOnlyMode = ref(false);
const selectedRowForEdit = ref<MaskingRuleVO | null>(null);

const openCreateDrawer = () => {
  isEditMode.value = false;
  isReadOnlyMode.value = false;
  selectedRowForEdit.value = null;
  drawerVisible.value = true;
};

const openEditDrawer = (row: MaskingRuleVO) => {
  isEditMode.value = true;
  isReadOnlyMode.value = false;
  selectedRowForEdit.value = row;
  drawerVisible.value = true;
};

const openViewDrawer = (row: MaskingRuleVO) => {
  isEditMode.value = false;
  isReadOnlyMode.value = true;
  selectedRowForEdit.value = row;
  drawerVisible.value = true;
};

const handleDrawerSuccess = () => {
  fetchList();
};

// 默认脱敏策略弹窗
const defaultPolicyVisible = ref(false);
const openDefaultPolicyModal = () => {
  defaultPolicyVisible.value = true;
};

// 转交负责人弹窗
const transferModalVisible = ref(false);
const selectedRowForTransfer = ref<MaskingRuleVO | null>(null);

const openTransferModal = (row: MaskingRuleVO) => {
  selectedRowForTransfer.value = row;
  transferModalVisible.value = true;
};

// 脱敏试算弹窗
const maskEvalModalVisible = ref(false);
const evaluating = ref(false);
const evalForm = reactive({
  datasourceId: 'ds_mysql_prod',
  tableName: 't_user_info',
  rawRowsJson: JSON.stringify(
    [
      { user_id: 1001, phone: '13812345678', id_card: '110101199003072345', name: '李四' },
      { user_id: 1002, phone: '13987654321', id_card: '310115199208154567', name: '王五' },
    ],
    null,
    2
  ),
});
const evalResultRows = ref<any[]>([]);

const openMaskEvalModal = () => {
  evalResultRows.value = [];
  maskEvalModalVisible.value = true;
};

const handleRunMaskEval = async () => {
  try {
    const rawRows = JSON.parse(evalForm.rawRowsJson);
    evaluating.value = true;
    const res = await api.evaluateMaskQuery({
      datasourceId: evalForm.datasourceId,
      tableName: evalForm.tableName,
      rawRows,
    });
    evalResultRows.value = res.data?.maskedRows || [];
    message.success('脱敏试算完成，命中脱敏规则并安全转换');
  } catch (err: any) {
    message.error(err.message || '脱敏试算失败，请检查样本 JSON');
  } finally {
    evaluating.value = false;
  }
};

onMounted(() => {
  loadMetadata();
});
</script>
