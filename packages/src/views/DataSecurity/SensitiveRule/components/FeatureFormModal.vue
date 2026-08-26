<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    width="860px"
    :confirm-loading="submitting"
    :destroy-on-close="true"
    :mask-closable="false"
    class="feature-form-modal"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="modal-body-container">
      <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
        <!-- 1. 特征名称 -->
        <a-form-item label="特征名称" name="ruleName" required>
          <span v-if="mode === 'view'" class="readonly-text font-medium">{{ formData.ruleName }}</span>
          <a-input
            v-else
            v-model:value="formData.ruleName"
            placeholder="请填写识别特征的名称，名称唯一，最多输入128字符"
            :maxlength="128"
            show-count
          />
        </a-form-item>

        <!-- 2. 特征条件 -->
        <a-form-item label="特征条件" required class="condition-form-item">
          <div class="condition-tip-alert mb-2">
            <span class="tip-dot">●</span>
            至少配置一条规则。如需添加规则，请单击
            <strong>+添加规则</strong> 按钮。最多配置50条规则，且最多配置5层关系。过滤条件之间的关系可配置为“且”、“或”。
          </div>

          <FeatureConditionBuilder
            ref="conditionBuilderRef"
            v-model="formData.conditionGroup"
            :disabled="mode === 'view'"
            :max-depth="5"
          />
        </a-form-item>

        <!-- 3. 描述 -->
        <a-form-item label="描述" name="description">
          <span v-if="mode === 'view'" class="readonly-text">{{ formData.description || '-' }}</span>
          <a-textarea
            v-else
            v-model:value="formData.description"
            placeholder="请填写识别特征相关使用场景的描述。不超过1000个字符。"
            :rows="3"
            :maxlength="1000"
            show-count
          />
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <a-space>
        <a-button @click="handleCancel">{{ mode === 'view' ? '关闭' : '取消' }}</a-button>
        <a-button v-if="mode !== 'view'" type="primary" :loading="submitting" @click="handleSubmit"> 确定 </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import FeatureConditionBuilder from './FeatureConditionBuilder.vue';
import { useFeatureCondition } from '../hooks/useFeatureCondition';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { SensitiveRuleVO } from '@/api/generated/data-security/schemas';

defineOptions({ name: 'FeatureFormModal' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { createInitialCondition, normalizeConditionGroup, countConditionRules } = useFeatureCondition();

const api = getDataSecurityCenterAPIAPIApi();
const visible = ref(false);
const submitting = ref(false);
const mode = ref<'create' | 'edit' | 'clone' | 'view'>('create');
const currentId = ref<number | null>(null);
const formRef = ref();
const conditionBuilderRef = ref<any>(null);

const formData = reactive({
  ruleName: '',
  description: '',
  priority: 10,
  ruleType: 'CUSTOM',
  conditionGroup: createInitialCondition(),
});

const rules: Record<string, any> = {
  ruleName: [
    { required: true, message: '请填写识别特征的名称', trigger: 'blur' },
    { max: 128, message: '特征名称最多输入128字符', trigger: 'blur' },
  ],
  description: [{ max: 1000, message: '描述不超过1000个字符', trigger: 'blur' }],
};

const modalTitle = computed(() => {
  switch (mode.value) {
    case 'create':
      return '添加特征';
    case 'edit':
      return '编辑特征';
    case 'clone':
      return '克隆特征';
    case 'view':
      return '查看特征';
    default:
      return '添加特征';
  }
});

function open(modalMode: 'create' | 'edit' | 'clone' | 'view', row?: SensitiveRuleVO | any) {
  mode.value = modalMode;
  visible.value = true;
  submitting.value = false;

  if (modalMode === 'create') {
    currentId.value = null;
    formData.ruleName = '';
    formData.description = '';
    formData.priority = 10;
    formData.ruleType = 'CUSTOM';
    formData.conditionGroup = createInitialCondition();
  } else if (row) {
    currentId.value = row.id || null;
    formData.ruleName = modalMode === 'clone' ? `${row.ruleName || ''}_COPY` : row.ruleName || '';
    formData.description = row.description || '';
    formData.priority = row.priority || 10;
    formData.ruleType = modalMode === 'clone' ? 'CUSTOM' : row.ruleType || 'CUSTOM';

    // 解析并规范化 featureConfig
    if (row.featureConfig) {
      try {
        const config = typeof row.featureConfig === 'string' ? JSON.parse(row.featureConfig) : row.featureConfig;
        formData.conditionGroup = normalizeConditionGroup(config);
      } catch {
        formData.conditionGroup = createInitialCondition();
      }
    } else {
      formData.conditionGroup = createInitialCondition();
    }
  }
}

function handleCancel() {
  visible.value = false;
}

async function handleSubmit() {
  if (mode.value === 'view') {
    visible.value = false;
    return;
  }

  try {
    await formRef.value?.validate();
  } catch (formErr) {
    console.warn('Form validation failed:', formErr);
    return;
  }

  // 触发 YConditionBuilder 条件校验
  if (conditionBuilderRef.value?.validate) {
    const isConditionValid = conditionBuilderRef.value.validate();
    if (!isConditionValid) {
      message.error('请填写特征条件中的匹配规则内容与操作符');
      return;
    }
  }

  // 获取最新的条件组数据
  const currentCondition = conditionBuilderRef.value?.getValue?.() || formData.conditionGroup;

  // 校验规则数
  const total = countConditionRules(currentCondition);
  if (total === 0) {
    message.warning('至少配置一条识别规则');
    return;
  }
  if (total > 50) {
    message.warning('最多配置50条规则');
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      ruleName: formData.ruleName,
      description: formData.description,
      priority: formData.priority,
      ruleType: formData.ruleType,
      categoryScopeMode: 'ALL' as any,
      scanScopeType: 'DATASOURCE' as any,
      featureConfig: currentCondition,
    };

    if (mode.value === 'create' || mode.value === 'clone') {
      await api.createSensitiveRule(payload as any);
      message.success(mode.value === 'clone' ? '特征克隆成功' : '识别特征添加成功');
    } else if (mode.value === 'edit' && currentId.value) {
      await api.updateSensitiveRule(currentId.value, payload as any);
      message.success('识别特征更新成功');
    }

    visible.value = false;
    emit('success');
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

defineExpose({ open });
</script>

<style scoped lang="less">
.feature-form-modal {
  .modal-body-container {
    max-height: 68vh;
    overflow-y: auto;
    padding: 4px 8px;

    .condition-tip-alert {
      font-size: 12px;
      color: #666;
      background: #f6f8fa;
      padding: 6px 12px;
      border-radius: 4px;
      border-left: 3px solid #1677ff;

      .tip-dot {
        color: #1677ff;
        margin-right: 4px;
      }
    }

    .readonly-text {
      color: #262626;
      font-size: 14px;
      display: inline-block;
      padding: 4px 0;
    }
  }
}
</style>
