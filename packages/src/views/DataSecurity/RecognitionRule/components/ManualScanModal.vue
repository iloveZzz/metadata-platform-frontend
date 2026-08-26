<template>
  <a-modal
    v-model:open="visible"
    title="手动规则扫描"
    width="640px"
    :confirm-loading="submitting"
    :destroy-on-close="true"
    :mask-closable="false"
    @ok="handleSubmit"
    @cancel="visible = false"
  >
    <a-alert
      type="info"
      show-icon
      message="触发手动扫描将立即下发调度任务，扫描所选范围并根据规则生成识别打标。"
      class="mb-4"
    />

    <a-form layout="vertical">
      <a-form-item label="扫描范围" required>
        <a-radio-group v-model:value="form.scanScopeType">
          <a-radio value="ALL_DB">全库扫描</a-radio>
          <a-radio value="SPECIFIC_PROJECT">指定项目扫描</a-radio>
          <a-radio value="SPECIFIC_DATASOURCE">指定数据源扫描</a-radio>
          <a-radio value="SPECIFIC_TABLES">指定表扫描 (≤ 10张)</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item v-if="form.scanScopeType !== 'ALL_DB'" :label="targetLabel" required>
        <a-select
          v-model:value="form.targetIdentifiers"
          mode="tags"
          :placeholder="`请输入${targetLabel}并回车添加`"
          :max-tag-count="10"
        />
      </a-form-item>

      <a-form-item label="规则执行范围" required>
        <a-radio-group v-model:value="form.ruleScope">
          <a-radio value="ENABLED_ONLY">仅生效规则</a-radio>
          <a-radio value="ALL">全部规则（含未生效规则）</a-radio>
        </a-radio-group>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';

const emit = defineEmits<{
  (e: 'success', data: any): void;
}>();

const visible = ref(false);
const submitting = ref(false);

const form = reactive({
  scanScopeType: 'ALL_DB',
  targetIdentifiers: [] as string[],
  ruleScope: 'ENABLED_ONLY',
});

const targetLabel = computed(() => {
  switch (form.scanScopeType) {
    case 'SPECIFIC_PROJECT':
      return '目标项目';
    case 'SPECIFIC_DATASOURCE':
      return '目标数据源';
    case 'SPECIFIC_TABLES':
      return '目标数据表 (最多10张)';
    default:
      return '目标对象';
  }
});

function open() {
  form.scanScopeType = 'ALL_DB';
  form.targetIdentifiers = [];
  form.ruleScope = 'ENABLED_ONLY';
  visible.value = true;
}

function handleSubmit() {
  if (form.scanScopeType !== 'ALL_DB' && form.targetIdentifiers.length === 0) {
    message.warning(`请填写${targetLabel.value}`);
    return;
  }
  if (form.scanScopeType === 'SPECIFIC_TABLES' && form.targetIdentifiers.length > 10) {
    message.warning('指定表扫描最多选择10张表');
    return;
  }

  emit('success', { ...form });
  visible.value = false;
}

defineExpose({ open });
</script>
