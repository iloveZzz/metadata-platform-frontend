<template>
  <div class="category-condition-builder-wrapper" :class="{ 'is-disabled': disabled }">
    <YConditionBuilder
      ref="conditionBuilderRef"
      v-model="model"
      :max-depth="maxDepth"
      :operator-options="categoryAllOperatorOptions"
      :get-operators="getOperators"
      :load-fields="loadFields"
      :load-values="loadValues"
      :disabled="disabled"
      :strict-mode="strictMode"
      @validate="handleValidate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { YConditionBuilder, type ConditionGroup } from '@yss-ui/components';
import {
  useCategoryRuleCondition,
  categoryAllOperatorOptions,
  countCategoryRules,
} from '../hooks/useCategoryRuleCondition';

defineOptions({ name: 'CategoryConditionBuilder' });

const model = defineModel<ConditionGroup>({ required: true });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    readonly?: boolean;
    maxDepth?: number;
    strictMode?: boolean;
    maxRules?: number;
  }>(),
  {
    disabled: false,
    readonly: false,
    maxDepth: 2,
    strictMode: true,
    maxRules: 5,
  }
);

const emit = defineEmits<{
  (e: 'validate', valid: boolean): void;
}>();

const { loadFields, getOperators, loadValues } = useCategoryRuleCondition();

const conditionBuilderRef = ref<any>(null);

function handleValidate(valid: boolean) {
  emit('validate', valid);
}

function validate(): boolean {
  const total = countCategoryRules(model.value);
  if (total < 1) {
    message.error('至少需要配置 1 条数据分类规则');
    return false;
  }
  if (total > (props.maxRules || 5)) {
    message.error(`数据分类规则最多支持配置 ${props.maxRules || 5} 条，当前已配置 ${total} 条`);
    return false;
  }
  if (conditionBuilderRef.value && typeof conditionBuilderRef.value.validate === 'function') {
    return conditionBuilderRef.value.validate();
  }
  return true;
}

defineExpose({
  validate,
  getRuleCount: () => countCategoryRules(model.value),
  getValue: () => conditionBuilderRef.value?.getValue?.() || model.value,
  setValue: (v: ConditionGroup) => {
    if (conditionBuilderRef.value?.setValue) {
      conditionBuilderRef.value.setValue(v);
    } else {
      model.value = v;
    }
  },
});
</script>

<style scoped lang="less">
.category-condition-builder-wrapper {
  width: 100%;
  border-radius: 6px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  padding: 12px 16px;
  box-sizing: border-box;

  &.is-disabled {
    background: #fbfbfb;
    opacity: 0.9;
  }

  :deep(.condition-builder) {
    .condition-group {
      background: transparent;

      &.is-root.has-multiple-conditions {
        padding-left: 48px !important;
      }

      .condition-item {
        margin-bottom: 8px;

        .field-select {
          min-width: 160px;
        }

        .operator-select {
          min-width: 160px;
        }

        .value-input {
          flex: 1;
          min-width: 220px;
        }
      }
    }
  }
}
</style>
