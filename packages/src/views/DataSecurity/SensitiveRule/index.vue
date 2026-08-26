<template>
  <div class="recognition-feature-page">
    <YCard class-name="page-card content-card" :bordered="false">
      <!-- 顶部标题与操作筛选栏（完全对齐设计图） -->
      <div class="feature-page-header">
        <div class="header-title-area">
          <span class="page-title">识别特征</span>
          <a-tooltip title="管理敏感数据识别特征，支持内置规则与自定义多维度扫描条件。">
            <QuestionCircleOutlined class="title-help-icon" />
          </a-tooltip>
        </div>

        <div class="header-filter-area">
          <!-- 1. 特征类型筛选下拉 -->
          <a-select
            v-model:value="filterType"
            placeholder="请选择特征类型"
            style="width: 160px"
            allow-clear
            @change="onFilterChange"
          >
            <a-select-option :value="undefined">全部特征类型</a-select-option>
            <a-select-option value="BUILTIN">内置</a-select-option>
            <a-select-option value="CUSTOM">自定义</a-select-option>
          </a-select>

          <!-- 2. 特征名称搜索框 -->
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="请输入特征名称"
            style="width: 220px"
            allow-clear
            @search="onSearch"
          />

          <!-- 3. 新建特征按钮 -->
          <a-button type="primary" class="create-btn" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            新建特征
          </a-button>

          <!-- 4. 刷新按钮 -->
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
          @page-change="handlePageChange"
        >
          <!-- 特征名称列 -->
          <template #ruleName="{ row }">
            <span class="feature-name-cell font-medium">{{ row.ruleName || '-' }}</span>
          </template>

          <!-- 描述列 -->
          <template #description="{ row }">
            <span class="feature-desc-cell">{{ row.description || '-' }}</span>
          </template>

          <!-- 类型列 -->
          <template #ruleType="{ row }">
            <span v-if="row.ruleType === 'BUILTIN'" class="type-text builtin-text">内置</span>
            <span v-else class="type-text custom-text">自定义</span>
          </template>

          <!-- 最近更新人 -->
          <template #owner="{ row }">
            <span>{{ row.updatedBy || row.owner || '-' }}</span>
          </template>

          <!-- 最近更新时间 -->
          <template #updatedAt="{ row }">
            <span>{{ row.updatedAt || '-' }}</span>
          </template>

          <!-- 操作列 -->
          <template #action="{ row }">
            <div class="action-buttons-wrapper">
              <!-- 查看 -->
              <a-tooltip title="查看">
                <a-button type="link" class="action-icon-btn" @click="handleView(row)">
                  <template #icon><FileSearchOutlined /></template>
                </a-button>
              </a-tooltip>

              <!-- 编辑 -->
              <a-tooltip :title="row.ruleType === 'BUILTIN' ? '内置特征仅支持查看，请克隆后修改' : '编辑'">
                <a-button
                  type="link"
                  class="action-icon-btn"
                  :disabled="row.ruleType === 'BUILTIN'"
                  @click="handleEdit(row)"
                >
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>

              <!-- 克隆 -->
              <a-tooltip title="克隆">
                <a-button type="link" class="action-icon-btn" @click="handleCloneFeature(row)">
                  <template #icon><CopyOutlined /></template>
                </a-button>
              </a-tooltip>

              <!-- 删除 -->
              <template v-if="row.ruleType === 'BUILTIN'">
                <a-tooltip title="内置特征受系统保护，不可删除">
                  <a-button type="link" class="action-icon-btn" disabled>
                    <template #icon><DeleteOutlined /></template>
                  </a-button>
                </a-tooltip>
              </template>
              <template v-else>
                <a-popconfirm
                  title="确定删除此识别特征？"
                  description="删除后，当前识别特征会从已经引用的相关识别任务中自动删除，请谨慎操作。"
                  ok-text="确定删除"
                  cancel-text="取消"
                  ok-type="danger"
                  @confirm="handleDelete(row)"
                >
                  <a-tooltip title="删除">
                    <a-button type="link" danger class="action-icon-btn">
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </template>
            </div>
          </template>
        </YTable>
      </div>
    </YCard>

    <!-- 特征 新增 / 编辑 / 克隆 / 查看 对话框 -->
    <FeatureFormModal ref="formModalRef" @success="handleModalSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  PlusOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  FileSearchOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { YCard, YTable, type YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { useSensitiveRuleTable, type RecognitionFeatureItem } from './hooks/useSensitiveRuleTable';
import FeatureFormModal from './components/FeatureFormModal.vue';
import './style.less';

defineOptions({ name: 'RecognitionFeaturePage' });

const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });
const formModalRef = ref();

const { loading, tableData, pagination, query, handlePageChange, handleDelete } = useSensitiveRuleTable();

const searchKeyword = ref('');
const filterType = ref<string | undefined>(undefined);

const columns: YTableColumn[] = [
  { title: '特征名称', field: 'ruleName', width: 240, slots: { default: 'ruleName' } },
  { title: '描述', field: 'description', minWidth: 200, slots: { default: 'description' } },
  { title: '类型', field: 'ruleType', width: 140, slots: { default: 'ruleType' } },
  { title: '最近更新人', field: 'owner', width: 160, slots: { default: 'owner' } },
  { title: '最近更新时间', field: 'updatedAt', width: 200, slots: { default: 'updatedAt' } },
  { title: '操作', field: 'action', width: 180, align: 'center', fixed: 'right', slots: { default: 'action' } },
];

const onSearch = () => {
  query({
    keyword: searchKeyword.value || undefined,
    ruleType: filterType.value,
    pageIndex: 1,
  });
};

const onFilterChange = () => {
  onSearch();
};

const handleRefresh = () => {
  query({});
};

const handleCreate = () => {
  formModalRef.value?.open('create');
};

const handleView = (row: RecognitionFeatureItem) => {
  formModalRef.value?.open('view', row);
};

const handleEdit = (row: RecognitionFeatureItem) => {
  formModalRef.value?.open('edit', row);
};

const handleCloneFeature = (row: RecognitionFeatureItem) => {
  formModalRef.value?.open('clone', row);
};

const handleModalSuccess = () => {
  query({});
};
</script>
