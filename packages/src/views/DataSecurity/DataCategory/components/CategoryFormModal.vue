<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑分类' : '新建分类'"
    :confirm-loading="submitting"
    width="680px"
    ok-text="确定"
    cancel-text="取消"
    class="category-form-modal"
    @ok="handleOk"
  >
    <div class="category-formily-wrapper py-2">
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
      </YFormily>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { createForm } from '@formily/core';
import { YFormily } from '@yss-ui/components';
import { createCategoryFormSchema } from '../schemas/categoryFormSchema';
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

const featureList = ref<SensitiveRuleVO[]>([]);

const loadFeatures = async () => {
  try {
    const res = await api.pageSensitiveRules({ pageIndex: 1, pageSize: 100 });
    featureList.value = (res as any)?.data || [];
  } catch (err) {
    featureList.value = [];
  }
};

const featureOptions = computed(() => {
  return featureList.value.map(f => ({
    label: f.ruleName || '',
    value: f.ruleName || String(f.id),
    desc: f.description,
  }));
});

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

watch(
  () => props.open,
  val => {
    if (val) {
      loadFeatures();
      if (props.isEdit && props.editData) {
        const initial = {
          categoryName: props.editData.categoryName || '',
          categoryCode: props.editData.categoryCode || '',
          description: props.editData.description || '',
          treeNodeId:
            props.editData.treeNodeId ||
            (props.currentTreeNodeId && props.currentTreeNodeId !== 0 ? props.currentTreeNodeId : undefined),
          securityGradeId:
            props.editData.securityGradeId || (props.gradeList.length > 0 ? props.gradeList[0].id : undefined),
          recognitionFeatures: (props.editData as any).recognitionFeatures || [],
          priority: props.editData.priority || 3,
        };
        formData.value = { ...initial };
        formInstance.setValues(initial);
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
          recognitionFeatures: [],
          priority: 3,
        };
        formData.value = { ...initial };
        formInstance.setValues(initial);
      }
      formInstance.clearErrors();
    }
  }
);

const handleOk = async () => {
  try {
    // 仅同步来自外部插槽选择器的 treeNodeId，不覆盖用户已在表单输入框内输入的字段
    if (formData.value.treeNodeId !== undefined) {
      formInstance.setValues({ treeNodeId: formData.value.treeNodeId });
    }

    const values = await formInstance.submit();
    emit('submit', {
      ...(values as any),
      treeNodeId: (values as any)?.treeNodeId ?? formData.value.treeNodeId,
      securityGradeId: (values as any)?.securityGradeId ?? formData.value.securityGradeId,
    });
  } catch (err: any) {
    console.warn('Formily validation unpassed:', err);
  }
};
</script>

<style scoped lang="less">
.category-formily-wrapper {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 6px;
}
</style>
