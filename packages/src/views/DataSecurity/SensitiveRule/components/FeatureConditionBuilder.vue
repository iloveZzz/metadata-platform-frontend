<template>
  <div class="feature-condition-builder-wrapper" :class="{ 'is-disabled': disabled }">
    <YConditionBuilder
      ref="conditionBuilderRef"
      v-model="model"
      :max-depth="maxDepth"
      :operator-options="allOperatorOptions"
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
import { YConditionBuilder, type ConditionGroup } from '@yss-ui/components';
import { useFeatureCondition, allOperatorOptions } from '../hooks/useFeatureCondition';

defineOptions({ name: 'FeatureConditionBuilder' });

const model = defineModel<ConditionGroup>({ required: true });

withDefaults(
  defineProps<{
    disabled?: boolean;
    readonly?: boolean;
    maxDepth?: number;
    strictMode?: boolean;
  }>(),
  {
    disabled: false,
    readonly: false,
    maxDepth: 5,
    strictMode: true,
  }
);

const emit = defineEmits<{
  (e: 'validate', valid: boolean): void;
}>();

const { loadFields, getOperators, loadValues } = useFeatureCondition();

const conditionBuilderRef = ref<any>(null);

function handleValidate(valid: boolean) {
  emit('validate', valid);
}

function validate(): boolean {
  if (conditionBuilderRef.value && typeof conditionBuilderRef.value.validate === 'function') {
    return conditionBuilderRef.value.validate();
  }
  return true;
}

defineExpose({
  validate,
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
.feature-condition-builder-wrapper {
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
      padding: 0;

      .condition-item {
        margin-bottom: 8px;

        .field-select {
          min-width: 150px;
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
