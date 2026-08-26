<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    width="920px"
    :confirm-loading="submitting"
    :destroy-on-close="true"
    :mask-closable="false"
    :centered="true"
    class="recognition-rule-form-modal"
  >
    <div class="modal-form-content">
      <a-spin :spinning="modalLoading" tip="正在加载规则配置...">
        <!-- 基础与核心配置 Formily 表单（包含分类和扫描动态插槽） -->
        <YFormily
          v-model="formData"
          :form="formInstance"
          :schema="formSchema"
          class="recognition-rule-formily"
        >
          <!-- 设置数据分类 Radio.Group 自定义插槽 -->
          <template #categoryScopeMode="{ onChange }">
            <a-radio-group
              v-model:value="formData.categoryScopeMode"
              @change="
                (e: any) => {
                  const val = e?.target?.value || e;
                  formData.categoryScopeMode = val;
                  onChange?.(val);
                }
              "
            >
              <a-radio value="ALL">全部分类</a-radio>
              <a-radio value="TREE_NODE">指定目录下所有分类</a-radio>
              <a-radio value="SPECIFIC">指定数据分类</a-radio>
            </a-radio-group>
          </template>

          <!-- 数据分类分级动态插槽（直接紧随设置数据分类单选框下方展开） -->
          <template #categoryDynamicSlot>
            <div class="category-dynamic-wrapper mt-1">
              <!-- 模式说明提示 -->
              <div class="category-mode-tip mb-3 text-xs text-gray-500">
                <span v-if="formData.categoryScopeMode === 'ALL'">
                  全部分类：指当前租户下所有生效的数据分类。
                </span>
                <span v-else-if="formData.categoryScopeMode === 'TREE_NODE'">
                  指定目录下所有分类：指定目录及其子目录下所有生效的数据分类。
                </span>
                <span v-else-if="formData.categoryScopeMode === 'SPECIFIC'">
                  指定数据分类：根据上级目录筛选当前目录及其子目录下所有生效的数据分类，如需增加数据分类，可单击新增一组分类添加多个目录。
                </span>
              </div>

              <!-- 1. 指定目录下所有分类 (TREE_NODE) 配置面板 -->
              <div v-if="formData.categoryScopeMode === 'TREE_NODE'" class="scope-box mb-4">
                <div class="condition-alert-header mb-3">
                  <div class="header-left">
                    <span class="header-title">选择分类目录</span>
                    <a-tag color="blue" class="rule-count-badge">
                      覆盖 {{ treeNodeCoveredCategoryCount }} 个生效数据分类
                    </a-tag>
                  </div>
                  <div class="header-right">
                    <InfoCircleOutlined class="tip-icon" />
                    <span class="tip-text">将自动包含所选目录及其所有子目录下生效的数据分类</span>
                  </div>
                </div>

                <div class="field-item">
                  <div class="field-label mb-1 text-xs text-gray-600">分类目录 <span class="text-red-500">*</span></div>
                  <a-tree-select
                    v-model:value="selectedTreeNodeIds"
                    :tree-data="categoryTreeData"
                    :field-names="{ label: 'nodeName', value: 'id', children: 'children' }"
                    placeholder="请选择分类目录（支持多选）"
                    tree-default-expand-all
                    multiple
                    allow-clear
                    show-search
                    tree-node-filter-prop="nodeName"
                    :dropdown-match-select-width="true"
                    :dropdown-style="{ maxHeight: '360px', overflowX: 'hidden' }"
                    style="width: 100%"
                  />
                </div>
              </div>

              <!-- 2. 指定数据分类 (SPECIFIC) 配置面板 -->
              <div v-if="formData.categoryScopeMode === 'SPECIFIC'" class="scope-box mb-4">
                <div class="condition-alert-header mb-3">
                  <div class="header-left">
                    <span class="header-title">数据分类分组配置</span>
                    <a-tag color="blue" class="rule-count-badge">
                      已配置 {{ specificGroups.length }} 组分类
                    </a-tag>
                  </div>
                  <div class="header-right">
                    <InfoCircleOutlined class="tip-icon" />
                    <span class="tip-text">可按上级目录逐组筛选并多选分类，支持添加多组</span>
                  </div>
                </div>

                <div class="specific-groups-list">
                  <div
                    v-for="(group, index) in specificGroups"
                    :key="group.id"
                    class="specific-group-card mb-3"
                  >
                    <div class="group-card-header">
                      <span class="group-badge">第 {{ index + 1 }} 组分类</span>
                      <a-button
                        v-if="specificGroups.length > 1"
                        type="text"
                        danger
                        size="small"
                        class="group-delete-btn"
                        @click="handleRemoveSpecificGroup(index)"
                      >
                        <template #icon><DeleteOutlined /></template>
                        删除该组
                      </a-button>
                    </div>

                    <a-row :gutter="12" class="group-card-body">
                      <a-col :span="10">
                        <div class="field-label mb-1 text-xs text-gray-600">上级目录 <span class="text-red-500">*</span></div>
                        <a-tree-select
                          v-model:value="group.treeNodeId"
                          :tree-data="categoryTreeData"
                          :field-names="{ label: 'nodeName', value: 'id', children: 'children' }"
                          placeholder="请选择上级目录"
                          tree-default-expand-all
                          allow-clear
                          show-search
                          tree-node-filter-prop="nodeName"
                          :dropdown-match-select-width="true"
                          :dropdown-style="{ maxHeight: '360px', overflowX: 'hidden' }"
                          style="width: 100%"
                          @change="handleGroupTreeNodeChange(group)"
                        />
                      </a-col>
                      <a-col :span="14">
                        <div class="field-label mb-1 text-xs text-gray-600 flex justify-between items-center">
                          <span>数据分类 <span class="text-red-500">*</span></span>
                          <a
                            v-if="getCategoryOptionsForGroup(group).length > 0"
                            class="text-xs text-blue-500 cursor-pointer"
                            @click="handleSelectAllInGroup(group)"
                          >
                            全选本目录 ({{ getCategoryOptionsForGroup(group).length }})
                          </a>
                        </div>
                        <a-select
                          v-model:value="group.categoryIds"
                          mode="multiple"
                          placeholder="请选择数据分类"
                          style="width: 100%"
                          allow-clear
                          show-search
                          :filter-option="filterCategoryOption"
                          :options="getCategoryOptionsForGroup(group)"
                          :disabled="!group.treeNodeId"
                          :dropdown-match-select-width="true"
                          :dropdown-style="{ maxHeight: '360px', overflowX: 'hidden' }"
                        />
                      </a-col>
                    </a-row>
                  </div>
                </div>

                <a-button
                  type="dashed"
                  block
                  class="add-group-btn"
                  @click="handleAddSpecificGroup"
                >
                  <PlusOutlined /> 新增一组分类
                </a-button>
              </div>
            </div>
          </template>

          <!-- 数据来源类型 Radio.Group 自定义插槽 -->
          <template #scanSourceType="{ onChange }">
            <a-radio-group
              v-model:value="formData.scanSourceType"
              @change="
                (e: any) => {
                  const val = e?.target?.value || e;
                  formData.scanSourceType = val;
                  onChange?.(val);
                }
              "
            >
              <a-radio value="DATASOURCE">数据源</a-radio>
            </a-radio-group>
          </template>

          <!-- 扫描范围动态插槽（直接紧随数据来源类型单选框下方展开） -->
          <template #scanDynamicSlot>
            <div class="scan-dynamic-wrapper mt-1">
              <!-- 数据源配置 -->
              <div class="scope-box mb-4">
                <div class="mb-3">
                  <div class="field-label mb-1 text-xs text-gray-600">选择数据源 <span class="text-red-500">*</span></div>
                  <a-select
                    v-model:value="datasourceScopeConfig.datasourceIds"
                    mode="multiple"
                    placeholder="请选择扫描数据源"
                    style="width: 100%"
                    :options="datasourceList"
                    allow-clear
                    show-search
                    :filter-option="filterDatasourceOption"
                  />
                </div>

                <div class="mb-3">
                  <div class="field-label mb-1 text-xs text-gray-600">数据范围 <span class="text-red-500">*</span></div>
                  <a-radio-group v-model:value="datasourceScopeConfig.tableScopeType">
                    <a-radio value="ALL_TABLES">全部表</a-radio>
                    <a-radio value="SPECIFIC_TABLES">指定表</a-radio>
                  </a-radio-group>
                </div>

                <!-- 指定表过滤条件 (使用 YConditionBuilder) -->
                <div
                  v-if="datasourceScopeConfig.tableScopeType === 'SPECIFIC_TABLES'"
                  class="mt-3 pt-3 border-t border-gray-100"
                >
                  <div class="condition-alert-header mb-3">
                    <div class="header-left">
                      <span class="header-title">指定表过滤规则配置</span>
                      <a-tag
                        :color="dsRuleCount > 10 ? 'error' : dsRuleCount === 10 ? 'warning' : 'blue'"
                        class="rule-count-badge"
                      >
                        {{ dsRuleCount }} / 10 个过滤条件
                      </a-tag>
                    </div>
                    <div class="header-right">
                      <InfoCircleOutlined class="tip-icon" />
                      <span class="tip-text">最多10个过滤条件，关系支持且/或最多2层，属于对象&lt;=500个，文本&lt;=256字</span>
                    </div>
                  </div>
                  <YConditionBuilder
                    ref="dsConditionRef"
                    v-model="dsFilterConditionGroup"
                    :max-depth="2"
                    :operator-options="datasourceAllOperatorOptions"
                    :get-operators="getDatasourceOperators"
                    :load-fields="loadDatasourceFields"
                    :strict-mode="false"
                  />
                </div>
              </div>
            </div>
          </template>
        </YFormily>
      </a-spin>
    </div>

    <template #footer>
      <a-button @click="visible = false">取消</a-button>
      <a-button type="primary" :loading="submitting || modalLoading" @click="handleSubmit">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import { InfoCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { createForm } from '@formily/core';
import { YFormily, YConditionBuilder, type ConditionGroup } from '@yss-ui/components';
import { GetConnectors } from '@/api';
import { recognitionRuleApi } from '@/api/recognitionRuleApi';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { CategoryTreeNodeVO, DataCategoryVO } from '@/api/generated/data-security/schemas';
import type { RecognitionRuleItem } from '../hooks/useRecognitionRuleTable';
import { useRecognitionCondition } from '../hooks/useRecognitionCondition';
import { createRecognitionRuleFormSchema } from '../schemas/recognitionRuleFormSchema';

defineOptions({ name: 'RecognitionRuleFormModal' });

const api = getDataSecurityCenterAPIAPIApi();

const emit = defineEmits<{
  (e: 'success', payload: any): void;
}>();

const visible = ref(false);
const submitting = ref(false);
const modalLoading = ref(false);
const mode = ref<'create' | 'edit' | 'clone'>('create');
const currentId = ref<number | null>(null);

const formInstance = createForm({
  validateFirst: false,
});

const formSchema = computed(() => createRecognitionRuleFormSchema());

const {
  datasourceAllOperatorOptions,
  loadDatasourceFields,
  getDatasourceOperators,
  createInitialDatasourceFilterCondition,
  normalizeDatasourceFilterCondition,
  countConditionRules,
  validateRecognitionCondition,
} = useRecognitionCondition();

const dsConditionRef = ref<any>(null);
const dsFilterConditionGroup = ref<ConditionGroup>(createInitialDatasourceFilterCondition());

const dsRuleCount = computed(() => countConditionRules(dsFilterConditionGroup.value));

const datasourceList = ref<Array<{ label: string; value: string }>>([]);
const categoryTreeData = ref<CategoryTreeNodeVO[]>([]);
const allActiveCategories = ref<DataCategoryVO[]>([]);

// 数据分类圈选状态
const selectedTreeNodeIds = ref<Array<number | string>>([]);

interface SpecificGroupItem {
  id: string;
  treeNodeId?: number | string | null;
  categoryIds: number[];
}

const specificGroups = ref<SpecificGroupItem[]>([
  { id: '1', treeNodeId: null, categoryIds: [] },
]);

function formatCategoryTreeNodes(nodes: any[]): CategoryTreeNodeVO[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map(n => ({
    ...n,
    id: String(n.id) as any,
    value: String(n.id),
    nodeName: n.nodeName,
    children: formatCategoryTreeNodes(n.children || []),
  }));
}

// 递归查找指定节点及其所有子节点的 ID（统一为字符串比较）
function collectSubNodeIds(nodeId: number | string, treeNodes: CategoryTreeNodeVO[]): Set<string> {
  const result = new Set<string>();
  function traverse(nodes: CategoryTreeNodeVO[], targetFound: boolean) {
    for (const node of nodes) {
      const isTarget = targetFound || String(node.id) === String(nodeId);
      if (isTarget) {
        if (node.id != null) {
          result.add(String(node.id));
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children, true);
        }
      } else if (node.children && node.children.length > 0) {
        traverse(node.children, false);
      }
    }
  }
  traverse(treeNodes, false);
  return result;
}

// 计算指定目录下所有分类模式所覆盖的分类数量
const treeNodeCoveredCategoryCount = computed(() => {
  if (selectedTreeNodeIds.value.length === 0) return 0;
  const allTargetNodeIds = new Set<string>();
  selectedTreeNodeIds.value.forEach(id => {
    const subIds = collectSubNodeIds(id, categoryTreeData.value);
    subIds.forEach(subId => allTargetNodeIds.add(String(subId)));
  });
  return allActiveCategories.value.filter(c => c.treeNodeId != null && allTargetNodeIds.has(String(c.treeNodeId))).length;
});

function handleAddSpecificGroup() {
  specificGroups.value.push({
    id: String(Date.now() + Math.random()),
    treeNodeId: null,
    categoryIds: [],
  });
}

function handleRemoveSpecificGroup(index: number) {
  if (specificGroups.value.length > 1) {
    specificGroups.value.splice(index, 1);
  }
}

function handleGroupTreeNodeChange(group: SpecificGroupItem) {
  if (!group.treeNodeId) {
    group.categoryIds = [];
    return;
  }
  const allowedIds = new Set(getCategoryOptionsForGroup(group).map(opt => opt.value));
  group.categoryIds = group.categoryIds.filter(id => allowedIds.has(id));
}

function getCategoryOptionsForGroup(group: SpecificGroupItem) {
  if (!group.treeNodeId) return [];
  const subNodeIds = collectSubNodeIds(group.treeNodeId, categoryTreeData.value);
  const matched = allActiveCategories.value.filter(
    c => c.treeNodeId != null && subNodeIds.has(String(c.treeNodeId))
  );
  return matched.map(c => ({
    label: c.securityGradeName ? `${c.categoryName} (${c.securityGradeName})` : c.categoryName,
    value: c.id!,
  }));
}

function handleSelectAllInGroup(group: SpecificGroupItem) {
  const options = getCategoryOptionsForGroup(group);
  group.categoryIds = options.map(opt => opt.value);
}

function filterCategoryOption(input: string, option: any) {
  return (option?.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0;
}

function filterDatasourceOption(input: string, option: any) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase());
}

const formData = reactive({
  ruleName: '',
  description: '',
  priority: 10,
  lineageInheritanceEnabled: false,
  categoryScopeMode: 'ALL',
  scanSourceType: 'DATASOURCE',
});

const datasourceScopeConfig = reactive({
  datasourceIds: [] as string[],
  tableScopeType: 'ALL_TABLES',
});

const modalTitle = computed(() => {
  switch (mode.value) {
    case 'create':
      return '新建识别规则';
    case 'edit':
      return '编辑识别规则';
    case 'clone':
      return '克隆识别规则';
    default:
      return '新建识别规则';
  }
});

async function open(modalMode: 'create' | 'edit' | 'clone', row?: RecognitionRuleItem) {
  mode.value = modalMode;
  visible.value = true;
  modalLoading.value = true;

  try {
    // 并行获取数据源列表、分类目录树、全量数据分类与最新详情
    const [connRes, treeRes, catRes, detailRes] = await Promise.all([
      GetConnectors().catch(() => ({ data: [] })),
      api.getCategoryTree().catch(() => ({ data: [] })),
      api.pageDataCategories({ pageIndex: 1, pageSize: 1000, status: 'ENABLED' as any }).catch(() => ({ data: [] })),
      modalMode !== 'create' && row?.id ? recognitionRuleApi.getDetail(row.id).catch(() => null) : Promise.resolve(null),
    ]);

    datasourceList.value = ((connRes as any)?.data || []).map((conn: any) => ({
      label: conn.name || String(conn.id),
      value: String(conn.id),
    }));

    categoryTreeData.value = formatCategoryTreeNodes((treeRes as any)?.data || []);
    allActiveCategories.value = (catRes as any)?.data || [];

    const activeRow: RecognitionRuleItem | undefined = (detailRes as any)?.data || row;

    if (modalMode === 'create' || !activeRow) {
      currentId.value = null;
      formData.ruleName = '';
      formData.description = '';
      formData.priority = 10;
      formData.lineageInheritanceEnabled = false;
      formData.categoryScopeMode = 'ALL';
      formData.scanSourceType = 'DATASOURCE';
      selectedTreeNodeIds.value = [];
      specificGroups.value = [{ id: '1', treeNodeId: null, categoryIds: [] }];
      dsFilterConditionGroup.value = createInitialDatasourceFilterCondition();
      datasourceScopeConfig.datasourceIds = [];
      datasourceScopeConfig.tableScopeType = 'ALL_TABLES';
    } else {
      currentId.value = activeRow.id;
      formData.ruleName = modalMode === 'clone' ? `${activeRow.ruleName}_COPY`.slice(0, 12) : activeRow.ruleName;
      formData.description = activeRow.description || '';
      formData.priority = activeRow.priority || 10;
      formData.lineageInheritanceEnabled = activeRow.lineageInheritanceEnabled ?? false;
      formData.categoryScopeMode = activeRow.categoryScopeMode || 'ALL';
      formData.scanSourceType = 'DATASOURCE';

      // 解析 categoryScopeConfig 并规范化为字符串 ID
      try {
        if (activeRow.categoryScopeConfig) {
          const catCfg =
            typeof activeRow.categoryScopeConfig === 'string'
              ? JSON.parse(activeRow.categoryScopeConfig)
              : activeRow.categoryScopeConfig;

          if (formData.categoryScopeMode === 'TREE_NODE') {
            const rawNodeIds = catCfg.treeNodeIds || (catCfg.treeNodeId ? [catCfg.treeNodeId] : []);
            selectedTreeNodeIds.value = Array.isArray(rawNodeIds) ? rawNodeIds.map(String) : [String(rawNodeIds)];
            specificGroups.value = [{ id: '1', treeNodeId: null, categoryIds: [] }];
          } else if (formData.categoryScopeMode === 'SPECIFIC') {
            selectedTreeNodeIds.value = [];
            if (catCfg.groups && Array.isArray(catCfg.groups) && catCfg.groups.length > 0) {
              specificGroups.value = catCfg.groups.map((g: any, idx: number) => ({
                id: String(Date.now() + idx),
                treeNodeId: g.treeNodeId != null ? String(g.treeNodeId) : null,
                categoryIds: (g.categoryIds || []).map((cid: any) => typeof cid === 'number' ? cid : Number(cid) || cid),
              }));
            } else {
              specificGroups.value = [{ id: '1', treeNodeId: null, categoryIds: [] }];
            }
          } else {
            selectedTreeNodeIds.value = [];
            specificGroups.value = [{ id: '1', treeNodeId: null, categoryIds: [] }];
          }
        } else {
          selectedTreeNodeIds.value = [];
          specificGroups.value = [{ id: '1', treeNodeId: null, categoryIds: [] }];
        }
      } catch {
        selectedTreeNodeIds.value = [];
        specificGroups.value = [{ id: '1', treeNodeId: null, categoryIds: [] }];
      }

      // 解析 datasourceScopeConfig 并规范化数据源 ID 为字符串
      if (activeRow.datasourceScopeConfig) {
        const cfg =
          typeof activeRow.datasourceScopeConfig === 'string'
            ? JSON.parse(activeRow.datasourceScopeConfig)
            : activeRow.datasourceScopeConfig;
        datasourceScopeConfig.datasourceIds = (cfg.datasourceIds || []).map(String);
        datasourceScopeConfig.tableScopeType = cfg.tableScopeType || 'ALL_TABLES';
        dsFilterConditionGroup.value = normalizeDatasourceFilterCondition(cfg.filterConfig || cfg);
      } else {
        datasourceScopeConfig.datasourceIds = [];
        datasourceScopeConfig.tableScopeType = 'ALL_TABLES';
        dsFilterConditionGroup.value = createInitialDatasourceFilterCondition();
      }
    }

    // 同步初始化值至 Formily 实例
    formInstance.setValues({
      ruleName: formData.ruleName,
      description: formData.description,
      priority: formData.priority,
      categoryScopeMode: formData.categoryScopeMode,
      scanSourceType: formData.scanSourceType,
    });
    formInstance.clearErrors();
  } catch (err) {
    console.error('初始化识别规则表单失败', err);
  } finally {
    modalLoading.value = false;
  }
}

async function handleSubmit() {
  try {
    if (formData.categoryScopeMode !== undefined) {
      formInstance.setValues({ categoryScopeMode: formData.categoryScopeMode });
    }
    if (formData.scanSourceType !== undefined) {
      formInstance.setValues({ scanSourceType: formData.scanSourceType });
    }
    const values = await formInstance.submit();
    if (values) {
      formData.ruleName = (values as any).ruleName || formData.ruleName;
      formData.priority = (values as any).priority ?? formData.priority;
      formData.description = (values as any).description ?? formData.description;
      formData.categoryScopeMode = formData.categoryScopeMode || (values as any).categoryScopeMode;
      formData.scanSourceType = formData.scanSourceType || (values as any).scanSourceType;
    }
  } catch (err) {
    message.warning('请完善表单必填项');
    console.warn('Formily validation unpassed:', err);
    return;
  }

  // 1. 深度校验数据分类分级
  let categoryScopeConfig: any = {};
  if (formData.categoryScopeMode === 'TREE_NODE') {
    if (selectedTreeNodeIds.value.length === 0) {
      message.warning('请选择至少一个分类目录');
      return;
    }
    categoryScopeConfig = {
      treeNodeIds: selectedTreeNodeIds.value,
    };
  } else if (formData.categoryScopeMode === 'SPECIFIC') {
    if (specificGroups.value.length === 0) {
      message.warning('请至少添加一组数据分类配置');
      return;
    }
    for (let i = 0; i < specificGroups.value.length; i++) {
      const g = specificGroups.value[i];
      if (!g.treeNodeId) {
        message.warning(`第 ${i + 1} 组分类配置未选择上级目录`);
        return;
      }
      if (!g.categoryIds || g.categoryIds.length === 0) {
        message.warning(`第 ${i + 1} 组分类配置未选择数据分类`);
        return;
      }
    }
    categoryScopeConfig = {
      groups: specificGroups.value.map(g => ({
        treeNodeId: g.treeNodeId,
        categoryIds: g.categoryIds,
      })),
    };
  }

  // 2. 深度校验数据源规则
  if (datasourceScopeConfig.datasourceIds.length === 0) {
    message.warning('请选择至少一个数据源');
    return;
  }
  if (datasourceScopeConfig.tableScopeType === 'SPECIFIC_TABLES') {
    if (dsConditionRef.value?.validate) {
      dsConditionRef.value.validate();
    }
    const dsCheck = validateRecognitionCondition(dsFilterConditionGroup.value, 'DATASOURCE');
    if (!dsCheck.valid) {
      message.warning(dsCheck.message || '指定表过滤规则配置不符合要求');
      return;
    }
  }

  submitting.value = true;
  try {
    const payload = {
      ruleName: formData.ruleName,
      description: formData.description,
      priority: formData.priority,
      lineageInheritanceEnabled: false,
      categoryScopeMode: formData.categoryScopeMode as any,
      categoryScopeConfig,
      scanSourceType: formData.scanSourceType as any,
      datasourceScopeConfig: {
        datasourceIds: datasourceScopeConfig.datasourceIds,
        tableScopeType: datasourceScopeConfig.tableScopeType,
        filterConfig: dsFilterConditionGroup.value,
      },
    };

    emit('success', {
      mode: mode.value,
      id: currentId.value,
      data: payload,
    });
    visible.value = false;
  } finally {
    submitting.value = false;
  }
}

defineExpose({ open });
</script>

<style scoped lang="less">
.recognition-rule-form-modal {
  :deep(.ant-modal-content) {
    border-radius: 8px;
    overflow: hidden;
  }

  :deep(.ant-modal-header) {
    margin-bottom: 0;
    padding: 16px 24px;
    border-bottom: 1px solid #f0f0f0;
  }

  :deep(.ant-modal-body) {
    padding: 18px 24px 12px;
    overflow: hidden;
  }

  :deep(.ant-modal-footer) {
    margin-top: 0;
    padding: 12px 24px;
    border-top: 1px solid #f0f0f0;
  }

  .modal-form-content {
    max-height: calc(85vh - 130px);
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;

    /* 滚动条美化 */
    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: #e2e4e8;
      border-radius: 3px;
      &:hover {
        background: #c5c8ce;
      }
    }

    .form-section-title {
      font-size: 14px;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.88);
      margin: 16px 0 12px;

      &:first-child {
        margin-top: 0;
      }
    }

    .category-mode-tip {
      color: #64748b;
      line-height: 1.5;
    }

    .specific-groups-list {
      .specific-group-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 14px;

        .group-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px dashed #f0f0f0;

          .group-badge {
            font-size: 12px;
            font-weight: 600;
            color: #1677ff;
            background: #e6f4ff;
            padding: 2px 8px;
            border-radius: 4px;
          }

          .group-delete-btn {
            padding: 0 4px;
            height: auto;
            font-size: 12px;
          }
        }
      }
    }

    .add-group-btn {
      border-style: dashed;
      color: #1677ff;
      border-color: #91caff;
      &:hover {
        color: #4096ff;
        border-color: #4096ff;
      }
    }

    .scope-box {
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
      padding: 12px 14px;
      box-sizing: border-box;

      .condition-alert-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        background: #f0f5ff;
        border: 1px solid #d6e4ff;
        border-left: 3px solid #1677ff;
        border-radius: 4px;
        padding: 8px 12px;

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;

          .header-title {
            font-size: 13px;
            font-weight: 600;
            color: #1f2329;
          }

          .rule-count-badge {
            margin-right: 0;
            font-size: 12px;
            border-radius: 10px;
          }
        }

        .header-right {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #64748b;

          .tip-icon {
            color: #1677ff;
            margin-right: 4px;
          }

          .tip-text {
            font-weight: 400;
          }
        }
      }

      :deep(.condition-builder) {
        width: 100%;
        box-sizing: border-box;

        .condition-group {
          background: transparent;
          position: relative;

          // 核心修复：根条件组存在多条条件时，确保左侧留足 48px 空间，容纳垂直线与“且/或”徽章
          &.is-root {
            padding: 4px 0;

            &.has-multiple-conditions {
              padding-left: 48px !important;
            }
          }

          // 子条件组支持嵌套缩进与边框
          &:not(.is-root) {
            margin: 6px 0 6px 32px;
            padding: 8px 12px;
            background: #ffffff;
            border: 1px solid #f0f0f0;
            border-radius: 6px;
          }

          .condition-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;

            &:last-child {
              margin-bottom: 0;
            }

            .field-select {
              min-width: 130px;
            }

            .operator-select {
              min-width: 130px;
            }

            .value-input {
              flex: 1;
              min-width: 180px;
            }
          }
        }
      }
    }
  }
}
</style>

<style lang="less">
/* 下拉浮层基础保障样式：防止横向溢出与滚动条，保持 Ant Design 原生树节点排版 */
.ant-select-dropdown,
.ant-tree-select-dropdown {
  overflow-x: hidden !important;

  .ant-select-tree {
    overflow-x: hidden !important;

    .ant-select-tree-list-holder-inner {
      overflow-x: hidden !important;
    }
  }
}
</style>

