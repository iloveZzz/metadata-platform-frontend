<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑分类' : '新建分类'"
    :confirm-loading="submitting"
    width="75vw"
    :style="{ top: '5vh' }"
    :body-style="{ height: '70vh', overflowY: 'auto', padding: '16px 24px' }"
    ok-text="确定"
    cancel-text="取消"
    class="category-form-modal"
    @ok="handleOk"
  >
    <div class="category-formily-wrapper">
      <YFormily v-model="formData" :form="formInstance" :schema="schema" class="category-edit-form">
        <!-- 所属目录 TreeSelect 自定义插槽 -->
        <template #treeSelect="{ onChange }">
          <a-tree-select
            v-model:value="formData.treeNodeId"
            :tree-data="treeSelectData"
            :field-names="{ label: 'nodeName', value: 'id', children: 'children' }"
            placeholder="请选择所属目录"
            style="width: 100%"
            allow-clear
            tree-default-expand-all
            @change="
              (val: any) => {
                onChange?.(val);
              }
            "
          />
        </template>

        <!-- 识别特征多选自定义插槽（包含所有可用内置与自定义规则） -->
        <template #recognitionFeatures="{ onChange }">
          <a-select
            v-model:value="formData.recognitionFeatures"
            mode="multiple"
            :max-tag-count="4"
            placeholder="请选择识别特征"
            style="width: 100%"
            allow-clear
            show-search
            :filter-option="filterFeatureOption"
            :loading="featuresLoading"
            :options="featureOptions"
            @change="
              (val: any) => {
                onChange?.(val);
              }
            "
          >
            <template #option="{ label, ruleType, desc }">
              <div class="feature-select-option">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-gray-800">{{ label }}</span>
                  <a-tag :color="ruleType === 'BUILTIN' ? 'blue' : 'purple'" class="ml-2 text-xs">
                    {{ ruleType === 'BUILTIN' ? '内置' : '自定义' }}
                  </a-tag>
                </div>
                <div v-if="desc" class="text-xs text-gray-400 truncate mt-0.5" :title="desc">
                  {{ desc }}
                </div>
              </div>
            </template>
          </a-select>
        </template>

        <!-- 数据分类规则自定义插槽（6维扫描维度、且/或两层关系、最多5条规则） -->
        <template #categoryRules>
          <div class="category-rules-container">
            <CategoryConditionBuilder
              ref="ruleConditionRef"
              v-model="categoryRuleCondition"
              :max-depth="2"
              :max-rules="5"
            />
          </div>
        </template>
      </YFormily>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { createForm } from '@formily/core';
import { YFormily, type ConditionGroup } from '@yss-ui/components';
import { createCategoryFormSchema } from '../schemas/categoryFormSchema';
import CategoryConditionBuilder from './CategoryConditionBuilder.vue';
import {
  createInitialCategoryCondition,
  normalizeCategoryRuleGroup,
  serializeCategoryRuleGroup,
} from '../hooks/useCategoryRuleCondition';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type {
  DataCategoryVO,
  SecurityGradeVO,
  CategoryTreeNodeVO,
  SensitiveRuleVO,
} from '@/api/generated/data-security/schemas';

defineOptions({ name: 'CategoryFormModal' });

const api = getDataSecurityCenterAPIAPIApi();

const props = defineProps<{
  open: boolean;
  isEdit: boolean;
  editData?: DataCategoryVO | null;
  gradeList: SecurityGradeVO[];
  treeData: CategoryTreeNodeVO[];
  currentTreeNodeId?: number | string | null;
  submitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'submit', values: any): void;
}>();

const formInstance = createForm({
  validateFirst: false,
});

const visible = computed({
  get: () => props.open,
  set: val => emit('update:open', val),
});

const ruleConditionRef = ref<any>(null);
const categoryRuleCondition = ref<ConditionGroup>(createInitialCategoryCondition());

const featuresLoading = ref(false);
const featureList = ref<SensitiveRuleVO[]>([]);

const loadFeatures = async () => {
  featuresLoading.value = true;
  try {
    // 获取所有可用内置和自定义规则（状态为 ENABLED，分页足够大拉取全量可用特征）
    const res = await api.pageSensitiveRules({ pageIndex: 1, pageSize: 500, status: 'ENABLED' });
    featureList.value = (res as any)?.data || [];
  } catch (err) {
    console.error('加载识别特征列表失败:', err);
    featureList.value = [];
  } finally {
    featuresLoading.value = false;
  }
};

const featureOptions = computed(() => {
  return featureList.value.map(f => ({
    label: f.ruleName || '',
    value: f.ruleName || String(f.id),
    ruleType: (f as any).ruleType || 'CUSTOM',
    desc: f.description,
  }));
});

const filterFeatureOption = (input: string, option: any) => {
  const label = (option?.label || '').toLowerCase();
  const desc = (option?.desc || '').toLowerCase();
  const query = input.toLowerCase();
  return label.includes(query) || desc.includes(query);
};

const gradeOptions = computed(() => {
  return props.gradeList.map(g => ({
    label: `${g.gradeCode} - ${g.gradeName}`,
    value: g.id!,
  }));
});

const schema = computed(() => {
  return createCategoryFormSchema(gradeOptions.value, featureOptions.value);
});

const treeSelectData = computed(() => {
  return props.treeData;
});

const formData = ref({
  categoryName: '',
  categoryCode: '',
  description: '',
  treeNodeId: undefined as number | string | undefined,
  securityGradeId: undefined as number | string | undefined,
  recognitionFeatures: [] as string[],
  priority: 3,
});

function cleanRecognitionFeatures(rawFeatures?: any, scanConfig?: any): string[] {
  let list: string[] = [];
  if (Array.isArray(rawFeatures)) {
    list = rawFeatures;
  } else if (scanConfig) {
    let parsed: any = scanConfig;
    if (typeof scanConfig === 'string') {
      try {
        parsed = JSON.parse(scanConfig);
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
      if (f.includes('type:') || f.includes('id:') || f.includes('logicalOp:') || f.includes('children:') || f.includes('scanType:') || f.includes('matchMode:')) return false;
      return true;
    });
}

watch(
  () => props.open,
  val => {
    if (val) {
      loadFeatures();
      if (props.isEdit && props.editData) {
        const cleanedFeats = cleanRecognitionFeatures(
          props.editData.recognitionFeatures,
          props.editData.scanDimensionConfig
        );
        const initial = {
          categoryName: props.editData.categoryName || '',
          categoryCode: props.editData.categoryCode || '',
          description: props.editData.description || '',
          treeNodeId:
            props.editData.treeNodeId ||
            (props.currentTreeNodeId && props.currentTreeNodeId !== 0 ? props.currentTreeNodeId : undefined),
          securityGradeId:
            props.editData.securityGradeId || (props.gradeList.length > 0 ? props.gradeList[0].id : undefined),
          recognitionFeatures: cleanedFeats,
          priority: props.editData.priority || 3,
        };
        formData.value = { ...initial };
        formInstance.setValues(initial);
        categoryRuleCondition.value = normalizeCategoryRuleGroup(props.editData.scanDimensionConfig);
      } else {
        const initial = {
          categoryName: '',
          categoryCode: '',
          description: '',
          treeNodeId:
            props.currentTreeNodeId && props.currentTreeNodeId !== 0
              ? props.currentTreeNodeId
              : props.treeData.length > 0
                ? props.treeData[0].id
                : undefined,
          securityGradeId: props.gradeList.length > 0 ? props.gradeList[0].id : undefined,
          recognitionFeatures: [] as string[],
          priority: 3,
        };
        formData.value = { ...initial };
        formInstance.setValues(initial);
        categoryRuleCondition.value = createInitialCategoryCondition();
      }
      formInstance.clearErrors();
    }
  }
);

const handleOk = async () => {
  try {
    // 校验数据分类规则
    if (ruleConditionRef.value && typeof ruleConditionRef.value.validate === 'function') {
      const isValid = ruleConditionRef.value.validate();
      if (!isValid) {
        return;
      }
    }

    const cleanFeatures = cleanRecognitionFeatures(formData.value.recognitionFeatures);

    // 仅同步来自外部插槽选择器的 treeNodeId 与 recognitionFeatures，不覆盖用户已在表单输入框内输入的字段
    if (formData.value.treeNodeId !== undefined) {
      formInstance.setValues({ treeNodeId: formData.value.treeNodeId });
    }
    formInstance.setValues({ recognitionFeatures: cleanFeatures });

    const values = await formInstance.submit();
    let scanDimensionConfigJson: any = serializeCategoryRuleGroup(categoryRuleCondition.value);

    try {
      const parsedGroup = JSON.parse(scanDimensionConfigJson);
      if (cleanFeatures.length > 0) {
        parsedGroup.recognitionFeatures = cleanFeatures;
      }
      scanDimensionConfigJson = JSON.stringify(parsedGroup);
    } catch {}

    emit('submit', {
      ...(values as any),
      treeNodeId: (values as any)?.treeNodeId ?? formData.value.treeNodeId,
      securityGradeId: (values as any)?.securityGradeId ?? formData.value.securityGradeId,
      recognitionFeatures: cleanFeatures,
      scanDimensionConfig: scanDimensionConfigJson,
    });
  } catch (err: any) {
    console.warn('Formily validation unpassed:', err);
  }
};
</script>

<style scoped lang="less">
.category-formily-wrapper {
  padding-right: 6px;
}

.feature-select-option {
  padding: 2px 0;
}

.category-rules-container {
  width: 100%;
}
</style>
