<template>
  <a-drawer
    v-model:open="visible"
    title="数据分类详情与特征配置"
    width="75vw"
    :style="{ minWidth: '720px' }"
    class="category-detail-drawer"
    placement="right"
  >
    <div v-if="category" class="category-detail-content">
      <a-descriptions title="基础属性" :column="2" size="small" bordered class="mb-4">
        <a-descriptions-item label="分类名称" :span="2">
          <span class="font-bold text-base text-gray-900">{{ category.categoryName }}</span>
          <a-tag color="geekblue" class="ml-2">{{ category.categoryCode }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="所属目录" :span="2">
          <a-typography-text code>{{ category.treeNodeName || '/ 根目录' }}</a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="绑定安全分级">
          <a-tag :color="getGradeTagColor(category.sensitivityScore)">
            {{ category.securityGradeName || '未定级' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="仲裁优先级">
          <a-tag :color="getPriorityTagColor(category.priority)"> 优先级: {{ category.priority || 3 }} </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="生效状态">
          <a-badge
            :status="category.status === 'ENABLED' ? 'success' : 'default'"
            :text="category.status === 'ENABLED' ? '生效中' : '已停用'"
          />
        </a-descriptions-item>
        <a-descriptions-item label="停用策略">
          {{ category.disablePolicy === 'DELETE_TAGS' ? '同步清除打标' : '保留已有打标' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务描述" :span="2">
          <div class="text-xs text-gray-600">{{ category.description || '无' }}</div>
        </a-descriptions-item>
        <a-descriptions-item label="绑定识别特征" :span="2">
          <div
            v-if="displayRecognitionFeatures.length > 0"
            class="flex flex-wrap gap-1"
          >
            <a-tag v-for="feat in displayRecognitionFeatures" :key="feat" color="blue" class="text-xs">
              {{ feat }}
            </a-tag>
          </div>
          <span v-else class="text-xs text-gray-400">未配置自动扫描特征</span>
        </a-descriptions-item>
        <a-descriptions-item label="数据分类规则" :span="2">
          <div v-if="parsedRules.length > 0" class="space-y-1.5">
            <div
              v-for="(rule, idx) in parsedRules"
              :key="idx"
              class="rule-item-badge p-2 rounded bg-gray-50 border border-gray-100 text-xs flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <a-tag color="blue" class="m-0 text-xs">{{ rule.fieldLabel }}</a-tag>
                <span class="text-gray-500 font-medium">{{ rule.operatorLabel }}</span>
                <span class="font-semibold text-gray-800 font-mono">{{ rule.valueDisplay }}</span>
              </div>
              <a-tag v-if="rule.threshold" color="orange" class="m-0 text-xs">阈值 {{ rule.threshold }}%</a-tag>
            </div>
          </div>
          <span v-else class="text-xs text-gray-400">未配置高级扫描分类规则</span>
        </a-descriptions-item>
      </a-descriptions>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getGradeTagColor } from '@/utils';
import { getPriorityTagColor } from '../constant';
import {
  categoryScanFieldOptions,
  categoryOperatorsByField,
  normalizeCategoryRuleGroup,
} from '../hooks/useCategoryRuleCondition';
import type { ConditionGroup } from '@yss-ui/components';
import type { DataCategoryVO } from '@/api/generated/data-security/schemas';

defineOptions({ name: 'CategoryDetailDrawer' });

const props = defineProps<{
  open: boolean;
  category?: DataCategoryVO | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const visible = computed({
  get: () => props.open,
  set: val => emit('update:open', val),
});

const displayRecognitionFeatures = computed(() => {
  if (!props.category) return [];
  let list: string[] = [];
  if (Array.isArray(props.category.recognitionFeatures)) {
    list = props.category.recognitionFeatures;
  } else if (props.category.scanDimensionConfig) {
    let parsed: any = props.category.scanDimensionConfig;
    if (typeof props.category.scanDimensionConfig === 'string') {
      try {
        parsed = JSON.parse(props.category.scanDimensionConfig);
      } catch {}
    }
    if (parsed && Array.isArray(parsed.recognitionFeatures)) {
      list = parsed.recognitionFeatures;
    }
  }
  return list
    .map(f => String(f || '').trim())
    .filter(f => {
      if (!f) return false;
      if (f.startsWith('{') || f.startsWith('}') || f.startsWith('[') || f.startsWith(']')) return false;
      if (f.includes('type:') || f.includes('id:') || f.includes('logicalOp:') || f.includes('children:')) return false;
      return true;
    });
});

const parsedRules = computed(() => {
  if (!props.category?.scanDimensionConfig) return [];
  const group: ConditionGroup = normalizeCategoryRuleGroup(props.category.scanDimensionConfig);
  const result: Array<{ fieldLabel: string; operatorLabel: string; valueDisplay: string; threshold?: number }> = [];

  function extractLeaves(node: any) {
    if (!node) return;
    if (node.type === 'LEAF') {
      const fieldOpt = categoryScanFieldOptions.find(f => f.value === node.field);
      const fieldLabel = fieldOpt ? fieldOpt.label : node.field;
      const opList = categoryOperatorsByField[node.field] || [];
      const opOpt = opList.find(o => o.value === node.operator);
      const operatorLabel = opOpt ? opOpt.label : node.operator;
      const valueDisplay = Array.isArray(node.value) ? node.value.join(', ') : String(node.value || '-');
      result.push({
        fieldLabel,
        operatorLabel,
        valueDisplay,
        threshold: node.threshold,
      });
    } else if (node.type === 'GROUP' && Array.isArray(node.children)) {
      node.children.forEach(extractLeaves);
    }
  }

  extractLeaves(group);
  return result;
});
</script>

<style scoped lang="less">
:deep(.ant-drawer-content-wrapper) {
  min-width: 720px !important;
}

.category-detail-content {
  padding: 4px 0;
}
</style>
