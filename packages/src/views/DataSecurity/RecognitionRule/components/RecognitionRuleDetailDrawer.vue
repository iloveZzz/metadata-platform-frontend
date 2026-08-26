<template>
  <a-drawer v-model:open="visible" title="识别规则详情" width="680px" :destroy-on-close="true" placement="right">
    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-container">
        <!-- 基础信息 -->
        <a-descriptions title="基础配置" :column="2" bordered size="small">
          <a-descriptions-item label="规则名称" :span="2">
            <span class="font-medium text-blue-600">{{ detail.ruleName }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="优先级">
            <a-tag color="orange">优先级 {{ detail.priority ?? 10 }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="生效状态">
            <a-tag :color="detail.status === 'ENABLED' ? 'processing' : 'default'">
              {{ detail.status === 'ENABLED' ? '已生效' : '已停用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="负责人">
            {{ detail.owner || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="已识别打标字段数">
            {{ detail.taggedFieldsCount ?? 0 }} 个
          </a-descriptions-item>
          <a-descriptions-item label="血缘自动继承">
            {{ detail.lineageInheritanceEnabled ? '是' : '否' }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ detail.updatedAt || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="规则说明" :span="2">
            {{ detail.description || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- 数据分类分级配置 -->
        <div class="mt-4">
          <h4 class="section-title">数据分类圈选</h4>
          <div class="config-box">
            <div class="mb-2">
              <strong>圈选模式：</strong>
              <a-tag :color="getCategoryModeTagColor(detail.categoryScopeMode)">
                {{ formatCategoryMode(detail.categoryScopeMode) }}
              </a-tag>
            </div>

            <!-- ALL 模式 -->
            <div v-if="detail.categoryScopeMode === 'ALL' || !detail.categoryScopeMode" class="category-detail-panel">
              <div class="text-sm text-gray-600 py-1">
                包含当前租户下所有已生效的数据分类。
              </div>
            </div>

            <!-- TREE_NODE 模式 -->
            <div v-else-if="detail.categoryScopeMode === 'TREE_NODE'" class="category-detail-panel">
              <div class="panel-sub-title mb-2 text-xs font-semibold text-gray-700">所选分类目录：</div>
              <div class="tree-nodes-list mb-3 flex flex-wrap gap-2">
                <a-tag
                  v-for="nodeId in getParsedTreeNodeIds(detail.categoryScopeConfig)"
                  :key="nodeId"
                  color="cyan"
                  class="node-tag"
                >
                  <FolderOutlined class="mr-1" />
                  {{ getTreeNodeName(nodeId) }}
                </a-tag>
                <span v-if="getParsedTreeNodeIds(detail.categoryScopeConfig).length === 0" class="text-xs text-gray-400">
                  未指定目录
                </span>
              </div>

              <div class="panel-sub-title mb-1 text-xs font-semibold text-gray-700">覆盖生效数据分类：</div>
              <div class="categories-list flex flex-wrap gap-1">
                <a-tag
                  v-for="cat in getCoveredCategories(detail.categoryScopeConfig)"
                  :key="cat.id"
                  color="blue"
                  class="cat-tag"
                >
                  {{ cat.categoryName }}
                  <span v-if="cat.securityGradeName" class="text-xs opacity-80">({{ cat.securityGradeName }})</span>
                </a-tag>
                <span v-if="getCoveredCategories(detail.categoryScopeConfig).length === 0" class="text-xs text-gray-400">
                  当前目录下暂无生效数据分类
                </span>
              </div>
            </div>

            <!-- SPECIFIC 模式 -->
            <div v-else-if="detail.categoryScopeMode === 'SPECIFIC'" class="category-detail-panel">
              <div class="specific-groups-view space-y-3">
                <div
                  v-for="(group, idx) in getParsedSpecificGroups(detail.categoryScopeConfig)"
                  :key="idx"
                  class="detail-group-card p-2 bg-white rounded border border-gray-200"
                >
                  <div class="group-header text-xs font-semibold text-blue-600 mb-1 flex items-center">
                    <span class="mr-2">第 {{ idx + 1 }} 组</span>
                    <a-tag color="cyan" size="small">
                      <FolderOutlined class="mr-1" />
                      {{ getTreeNodeName(group.treeNodeId) }}
                    </a-tag>
                  </div>
                  <div class="group-categories flex flex-wrap gap-1 mt-1">
                    <a-tag
                      v-for="catId in group.categoryIds"
                      :key="catId"
                      color="geekblue"
                      size="small"
                    >
                      {{ getCategoryName(catId) }}
                    </a-tag>
                    <span v-if="!group.categoryIds || group.categoryIds.length === 0" class="text-xs text-gray-400">
                      未选择数据分类
                    </span>
                  </div>
                </div>
                <span v-if="getParsedSpecificGroups(detail.categoryScopeConfig).length === 0" class="text-xs text-gray-400">
                  未配置数据分类分组
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 扫描范围配置 -->
        <div class="mt-4">
          <h4 class="section-title">扫描范围配置</h4>
          <div class="config-box">
            <div class="mb-2 flex items-center gap-2">
              <strong>数据来源类型：</strong>
              <a-tag :color="detail.scanSourceType === 'COMPUTE_ENGINE' ? 'purple' : 'cyan'">
                {{ detail.scanSourceType === 'COMPUTE_ENGINE' ? '计算源' : '数据源' }}
              </a-tag>
            </div>

            <!-- 数据源扫描配置展示 -->
            <div v-if="detail.scanSourceType === 'DATASOURCE'" class="category-detail-panel">
              <div class="mb-2">
                <span class="text-xs font-semibold text-gray-700 mr-2">扫描数据源：</span>
                <span v-if="getParsedDatasourceIds(detail.datasourceScopeConfig).length === 0" class="text-xs text-gray-400">
                  未指定数据源
                </span>
                <div v-else class="inline-flex flex-wrap gap-1 mt-1">
                  <a-tag
                    v-for="dsId in getParsedDatasourceIds(detail.datasourceScopeConfig)"
                    :key="dsId"
                    color="cyan"
                    size="small"
                  >
                    {{ dsId }}
                  </a-tag>
                </div>
              </div>

              <div class="mb-2">
                <span class="text-xs font-semibold text-gray-700 mr-2">数据范围：</span>
                <a-tag :color="getParsedTableScopeType(detail.datasourceScopeConfig) === 'ALL_TABLES' ? 'blue' : 'green'" size="small">
                  {{ getParsedTableScopeType(detail.datasourceScopeConfig) === 'ALL_TABLES' ? '全部表' : '指定表' }}
                </a-tag>
              </div>

              <!-- 指定表过滤条件树 -->
              <div
                v-if="getParsedTableScopeType(detail.datasourceScopeConfig) === 'SPECIFIC_TABLES'"
                class="specific-filter-tree mt-2 pt-2 border-t border-gray-100"
              >
                <div class="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>指定表过滤条件：</span>
                  <a-tag color="blue" size="small">
                    关系：{{ getParsedDsLogicalOp(detail.datasourceScopeConfig) === 'OR' ? '或 (OR)' : '且 (AND)' }}
                  </a-tag>
                </div>
                <div class="space-y-1.5 mt-2">
                  <div
                    v-for="(rule, rIdx) in getParsedDsFilterRules(detail.datasourceScopeConfig)"
                    :key="rIdx"
                    class="filter-rule-row flex items-center gap-2 p-1.5 bg-gray-50 rounded border border-gray-100 text-xs"
                  >
                    <a-tag color="geekblue" size="small">{{ getDsFieldLabel(rule.field) }}</a-tag>
                    <a-tag color="orange" size="small">{{ getDsOperatorLabel(rule.operator) }}</a-tag>
                    <span class="rule-val-preview text-gray-800 font-medium truncate max-w-xs">
                      {{ formatRuleValue(rule.value) }}
                    </span>
                  </div>
                  <div v-if="getParsedDsFilterRules(detail.datasourceScopeConfig).length === 0" class="text-xs text-gray-400">
                    未配置过滤条件
                  </div>
                </div>
              </div>
            </div>

            <!-- 计算源扫描配置展示 -->
            <div v-else-if="detail.scanSourceType === 'COMPUTE_ENGINE'" class="category-detail-panel">
              <div class="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                <span>计算源规则配置：</span>
                <a-tag color="purple" size="small">
                  关系：{{ getParsedComputeLogicalOp(detail.computeScopeConfig) === 'OR' ? '或 (OR)' : '且 (AND)' }}
                </a-tag>
              </div>
              <div class="space-y-1.5 mt-2">
                <div
                  v-for="(rule, cIdx) in getParsedComputeRules(detail.computeScopeConfig)"
                  :key="cIdx"
                  class="filter-rule-row flex items-center gap-2 p-1.5 bg-gray-50 rounded border border-gray-100 text-xs"
                >
                  <a-tag color="purple" size="small">{{ getComputeFieldLabel(rule.field) }}</a-tag>
                  <a-tag color="orange" size="small">{{ getComputeOperatorLabel(rule.operator) }}</a-tag>
                  <span class="rule-val-preview text-gray-800 font-medium truncate max-w-xs">
                    {{ formatRuleValue(rule.value) }}
                  </span>
                </div>
                <div v-if="getParsedComputeRules(detail.computeScopeConfig).length === 0" class="text-xs text-gray-400">
                  未配置计算源规则
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
    <template #footer>
      <div style="text-align: right">
        <a-button @click="visible = false">关闭</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FolderOutlined } from '@ant-design/icons-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { CategoryTreeNodeVO, DataCategoryVO } from '@/api/generated/data-security/schemas';
import type { RecognitionRuleItem } from '../hooks/useRecognitionRuleTable';

const api = getDataSecurityCenterAPIAPIApi();

const visible = ref(false);
const loading = ref(false);
const detail = ref<RecognitionRuleItem | null>(null);

const categoryTreeData = ref<CategoryTreeNodeVO[]>([]);
const allActiveCategories = ref<DataCategoryVO[]>([]);

const loadMeta = async () => {
  try {
    const [treeRes, catRes] = await Promise.all([
      api.getCategoryTree().catch(() => ({ data: [] })),
      api.pageDataCategories({ pageIndex: 1, pageSize: 1000 }).catch(() => ({ data: [] })),
    ]);
    categoryTreeData.value = (treeRes as any)?.data || [];
    allActiveCategories.value = (catRes as any)?.data || [];
  } catch (err) {
    console.error('加载详情元数据失败', err);
  }
};

function formatCategoryMode(mode?: string) {
  switch (mode) {
    case 'ALL':
      return '全部分类（当前租户下所有生效分类）';
    case 'TREE_NODE':
      return '指定目录下所有分类';
    case 'SPECIFIC':
      return '指定数据分类';
    default:
      return mode || '-';
  }
}

function getCategoryModeTagColor(mode?: string) {
  switch (mode) {
    case 'ALL':
      return 'blue';
    case 'TREE_NODE':
      return 'green';
    case 'SPECIFIC':
      return 'purple';
    default:
      return 'default';
  }
}

function findNodeNameInTree(nodes: CategoryTreeNodeVO[], targetId: number | string): string | null {
  for (const node of nodes) {
    if (String(node.id) === String(targetId)) {
      return node.nodeName || String(node.id);
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeNameInTree(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function getTreeNodeName(nodeId?: number | string | null): string {
  if (!nodeId) return '未指定目录';
  return findNodeNameInTree(categoryTreeData.value, nodeId) || `目录 ID: ${nodeId}`;
}

function getCategoryName(catId: number): string {
  const cat = allActiveCategories.value.find(c => c.id === catId);
  if (cat) {
    return cat.securityGradeName ? `${cat.categoryName} (${cat.securityGradeName})` : (cat.categoryName || `分类 ID: ${catId}`);
  }
  return `分类 ID: ${catId}`;
}

function getParsedTreeNodeIds(cfg: any): Array<number | string> {
  if (!cfg) return [];
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    return parsed?.treeNodeIds || (parsed?.treeNodeId ? [parsed.treeNodeId] : []);
  } catch {
    return [];
  }
}

function collectSubNodeIds(nodeId: number | string, treeNodes: CategoryTreeNodeVO[]): Set<string> {
  const result = new Set<string>();
  function traverse(nodes: CategoryTreeNodeVO[], targetFound: boolean) {
    for (const node of nodes) {
      const isTarget = targetFound || String(node.id) === String(nodeId);
      if (isTarget) {
        result.add(String(node.id));
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

function getCoveredCategories(cfg: any): DataCategoryVO[] {
  const nodeIds = getParsedTreeNodeIds(cfg);
  if (nodeIds.length === 0) return [];
  const allSubIds = new Set<string>();
  nodeIds.forEach(id => {
    const sub = collectSubNodeIds(id, categoryTreeData.value);
    sub.forEach(sid => allSubIds.add(sid));
  });
  return allActiveCategories.value.filter(c => c.treeNodeId != null && allSubIds.has(String(c.treeNodeId)));
}

function getParsedSpecificGroups(cfg: any): Array<{ treeNodeId?: number; categoryIds: number[] }> {
  if (!cfg) return [];
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    return parsed?.groups || [];
  } catch {
    return [];
  }
}

// 扫描范围辅助解析
function getParsedDatasourceIds(cfg: any): string[] {
  if (!cfg) return [];
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    return parsed?.datasourceIds || [];
  } catch {
    return [];
  }
}

function getParsedTableScopeType(cfg: any): string {
  if (!cfg) return 'ALL_TABLES';
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    return parsed?.tableScopeType || 'ALL_TABLES';
  } catch {
    return 'ALL_TABLES';
  }
}

function getParsedDsLogicalOp(cfg: any): string {
  if (!cfg) return 'AND';
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    const filter = parsed?.filterConfig || parsed;
    return filter?.logicalOp || filter?.filterLogic || 'AND';
  } catch {
    return 'AND';
  }
}

function getParsedDsFilterRules(cfg: any): Array<{ field: string; operator: string; value: any }> {
  if (!cfg) return [];
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    const filter = parsed?.filterConfig || parsed;
    const rules: Array<{ field: string; operator: string; value: any }> = [];

    function extract(node: any) {
      if (!node) return;
      if (node.type === 'LEAF' || (!node.children && !node.filters && !node.rules)) {
        rules.push({
          field: node.field || node.targetType || 'TABLE_NAME',
          operator: node.operator || node.matchType || 'PREFIX',
          value: node.value,
        });
      } else {
        const children = node.children || node.filters || node.rules || [];
        for (const child of children) {
          extract(child);
        }
      }
    }
    extract(filter);
    return rules;
  } catch {
    return [];
  }
}

function getParsedComputeLogicalOp(cfg: any): string {
  if (!cfg) return 'AND';
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    return parsed?.logicalOp || parsed?.logic || 'AND';
  } catch {
    return 'AND';
  }
}

function getParsedComputeRules(cfg: any): Array<{ field: string; operator: string; value: any }> {
  if (!cfg) return [];
  try {
    const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    const rules: Array<{ field: string; operator: string; value: any }> = [];

    function extract(node: any) {
      if (!node) return;
      if (node.type === 'LEAF' || (!node.children && !node.rules)) {
        rules.push({
          field: node.field || node.targetType || 'PROJECT',
          operator: node.operator || node.matchType || 'IN',
          value: node.value,
        });
      } else {
        const children = node.children || node.rules || [];
        for (const child of children) {
          extract(child);
        }
      }
    }
    extract(parsed);
    return rules;
  } catch {
    return [];
  }
}

function getDsFieldLabel(field: string): string {
  switch (field) {
    case 'TABLE_NAME':
      return '表全名';
    case 'TABLE_COMMENT':
      return '表描述';
    case 'DB_SCHEMA':
    case 'DB_NAME':
    case 'SCHEMA_NAME':
      return 'db/schema';
    case 'TAG':
      return '资产清单标签';
    default:
      return field;
  }
}

function getDsOperatorLabel(op: string): string {
  switch (op) {
    case 'PREFIX':
      return '前缀匹配';
    case 'SUFFIX':
      return '后缀匹配';
    case 'CONTAINS':
      return '包含';
    case 'IN':
      return '属于';
    case 'TAG_ANY':
      return '包含任一';
    case 'TAG_ALL':
      return '包含所有';
    default:
      return op;
  }
}

function getComputeFieldLabel(field: string): string {
  switch (field) {
    case 'PROJECT':
      return '项目';
    case 'DATA_DOMAIN':
      return '数据板块';
    case 'TABLE':
      return '数据表';
    default:
      return field;
  }
}

function getComputeOperatorLabel(op: string): string {
  switch (op) {
    case 'IN':
      return '属于';
    case 'NOT_IN':
      return '不属于';
    case 'CONTAINS':
      return '包含';
    case 'NOT_CONTAINS':
      return '不包含';
    case 'REGEX':
      return '正则表达式';
    case 'REGEX_INSENSITIVE':
      return '正则大小写兼容';
    case 'ALL':
      return '全部';
    default:
      return op;
  }
}

function formatRuleValue(val: any): string {
  if (val === undefined || val === null || val === '') return '-';
  if (Array.isArray(val)) return val.join(', ');
  return String(val);
}

function open(data: RecognitionRuleItem) {
  detail.value = data;
  visible.value = true;
  loadMeta();
}

defineExpose({ open });
</script>

<style scoped lang="less">
.detail-container {
  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1f2329;
  }

  .config-box {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 12px;

    .category-detail-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 10px 12px;
      margin-top: 8px;
    }

    .json-preview {
      margin-top: 8px;
      background: #ffffff;
      border: 1px solid #e5e6eb;
      border-radius: 4px;
      padding: 8px 12px;
      max-height: 240px;
      overflow-y: auto;

      pre {
        margin: 0;
        font-family: monospace;
        font-size: 12px;
        color: #333;
      }
    }
  }
}
</style>

