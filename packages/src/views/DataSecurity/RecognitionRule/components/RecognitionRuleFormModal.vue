<template>
  <a-modal
    v-model:open="visible"
    :title="modalTitle"
    width="900px"
    :confirm-loading="submitting"
    :destroy-on-close="true"
    :mask-closable="false"
    :centered="true"
    class="recognition-rule-form-modal"
  >
    <div class="modal-form-content">
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <!-- 1. 基础配置 -->
        <div class="form-section-title">基础配置</div>
        <a-row :gutter="20">
          <a-col :span="12">
            <a-form-item label="识别规则名称" name="ruleName" required>
              <a-input
                v-model:value="formData.ruleName"
                placeholder="包含中文、字母、数字、下划线，不超过12个字符"
                :maxlength="12"
                show-count
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="优先级 (1-100)" name="priority">
              <a-input-number
                v-model:value="formData.priority"
                :min="1"
                :max="100"
                style="width: 100%"
                placeholder="10"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="识别规则说明" name="description" class="mb-4">
          <a-textarea
            v-model:value="formData.description"
            placeholder="自定义识别规则备注信息。不超过128个字符。"
            :rows="3"
            :maxlength="128"
            show-count
          />
        </a-form-item>

        <!-- 2. 扫描范围 -->
        <div class="form-section-title">扫描范围</div>
        <a-form-item label="数据来源类型" required class="mb-3">
          <a-radio-group v-model:value="formData.scanSourceType">
            <a-radio value="COMPUTE_ENGINE">计算源</a-radio>
            <a-radio value="DATASOURCE">数据源</a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- 计算源配置 (使用 YConditionBuilder) -->
        <div v-if="formData.scanSourceType === 'COMPUTE_ENGINE'" class="scope-box mb-4">
          <div class="condition-alert-header mb-3">
            <div class="header-left">
              <span class="header-title">规则关系配置</span>
              <a-tag
                :color="computeRuleCount > 5 ? 'error' : computeRuleCount === 5 ? 'warning' : 'blue'"
                class="rule-count-badge"
              >
                {{ computeRuleCount }} / 5 条规则
              </a-tag>
            </div>
            <div class="header-right">
              <InfoCircleOutlined class="tip-icon" />
              <span class="tip-text">规则最多5条，关系最多2层，板块/项目&lt;=100个</span>
            </div>
          </div>
          <YConditionBuilder
            ref="computeConditionRef"
            v-model="computeConditionGroup"
            :max-depth="2"
            :operator-options="computeAllOperatorOptions"
            :get-operators="getComputeOperators"
            :load-fields="loadComputeFields"
            :strict-mode="false"
          />
        </div>

        <!-- 数据源配置 -->
        <div v-if="formData.scanSourceType === 'DATASOURCE'" class="scope-box mb-4">
          <a-form-item label="选择数据源" required class="mb-3">
            <a-select
              v-model:value="formData.datasourceScopeConfig.datasourceIds"
              mode="tags"
              placeholder="请选择或输入扫描数据源 ID"
            >
              <a-select-option v-for="ds in datasourceList" :key="ds.value" :value="ds.value">
                {{ ds.label }} ({{ ds.value }})
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="数据范围" required class="mb-3">
            <a-radio-group v-model:value="formData.datasourceScopeConfig.tableScopeType">
              <a-radio value="ALL_TABLES">全部表</a-radio>
              <a-radio value="SPECIFIC_TABLES">指定表</a-radio>
            </a-radio-group>
          </a-form-item>

          <!-- 指定表过滤条件 (使用 YConditionBuilder) -->
          <div
            v-if="formData.datasourceScopeConfig.tableScopeType === 'SPECIFIC_TABLES'"
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
                <span class="tip-text">最多10个过滤条件，属于对象&lt;=500个</span>
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
      </a-form>
    </div>

    <template #footer>
      <a-button @click="visible = false">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import { YConditionBuilder, type ConditionGroup } from '@yss-ui/components';
import { GetConnectors } from '@/api';
import type { RecognitionRuleItem } from '../hooks/useRecognitionRuleTable';
import { useRecognitionCondition } from '../hooks/useRecognitionCondition';

defineOptions({ name: 'RecognitionRuleFormModal' });

const emit = defineEmits<{
  (e: 'success', payload: any): void;
}>();

const visible = ref(false);
const submitting = ref(false);
const mode = ref<'create' | 'edit' | 'clone'>('create');
const currentId = ref<number | null>(null);
const formRef = ref();

const {
  computeAllOperatorOptions,
  datasourceAllOperatorOptions,
  loadComputeFields,
  getComputeOperators,
  loadDatasourceFields,
  getDatasourceOperators,
  createInitialComputeCondition,
  createInitialDatasourceFilterCondition,
  normalizeComputeCondition,
  normalizeDatasourceFilterCondition,
  countConditionRules,
  validateRecognitionCondition,
} = useRecognitionCondition();

const computeConditionRef = ref<any>(null);
const dsConditionRef = ref<any>(null);
const computeConditionGroup = ref<ConditionGroup>(createInitialComputeCondition());
const dsFilterConditionGroup = ref<ConditionGroup>(createInitialDatasourceFilterCondition());

const computeRuleCount = computed(() => countConditionRules(computeConditionGroup.value));
const dsRuleCount = computed(() => countConditionRules(dsFilterConditionGroup.value));

const datasourceList = ref<Array<{ label: string; value: string }>>([]);

const loadMetadata = async () => {
  try {
    const connRes = await GetConnectors().catch(() => ({ data: [] }));
    datasourceList.value = ((connRes as any)?.data || []).map((conn: any) => ({
      label: conn.name || conn.id,
      value: conn.id,
    }));
  } catch (err) {
    console.error('加载识别规则数据源元数据失败', err);
  }
};

const formData = reactive({
  ruleName: '',
  description: '',
  priority: 10,
  lineageInheritanceEnabled: false,
  categoryScopeMode: 'ALL',
  categoryScopeConfig: {},
  scanSourceType: 'COMPUTE_ENGINE',
  computeScopeConfig: {} as any,
  datasourceScopeConfig: {
    datasourceIds: [] as string[],
    tableScopeType: 'ALL_TABLES',
    filterConfig: {} as any,
  },
});

const formRules: Record<string, any> = {
  ruleName: [
    { required: true, message: '请输入识别规则名称', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]{1,12}$/,
      message: '包含中文、字母、数字、下划线，不超过12个字符',
      trigger: 'blur',
    },
  ],
  description: [{ max: 128, message: '说明不能超过128个字符', trigger: 'blur' }],
};

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

function open(modalMode: 'create' | 'edit' | 'clone', row?: RecognitionRuleItem) {
  loadMetadata();
  mode.value = modalMode;
  visible.value = true;

  if (modalMode === 'create') {
    currentId.value = null;
    formData.ruleName = '';
    formData.description = '';
    formData.priority = 10;
    formData.lineageInheritanceEnabled = false;
    formData.categoryScopeMode = 'ALL';
    formData.categoryScopeConfig = {};
    formData.scanSourceType = 'COMPUTE_ENGINE';
    computeConditionGroup.value = createInitialComputeCondition();
    dsFilterConditionGroup.value = createInitialDatasourceFilterCondition();
    formData.datasourceScopeConfig = {
      datasourceIds: [],
      tableScopeType: 'ALL_TABLES',
      filterConfig: dsFilterConditionGroup.value,
    };
  } else if (row) {
    currentId.value = row.id;
    formData.ruleName = modalMode === 'clone' ? `${row.ruleName}_COPY`.slice(0, 12) : row.ruleName;
    formData.description = row.description || '';
    formData.priority = row.priority || 10;
    formData.lineageInheritanceEnabled = row.lineageInheritanceEnabled ?? false;
    formData.categoryScopeMode = 'ALL';
    formData.categoryScopeConfig = {};
    formData.scanSourceType = row.scanSourceType || 'COMPUTE_ENGINE';

    if (row.computeScopeConfig) {
      computeConditionGroup.value = normalizeComputeCondition(row.computeScopeConfig);
    }
    if (row.datasourceScopeConfig) {
      const cfg =
        typeof row.datasourceScopeConfig === 'string'
          ? JSON.parse(row.datasourceScopeConfig)
          : row.datasourceScopeConfig;
      formData.datasourceScopeConfig.datasourceIds = cfg.datasourceIds || [];
      formData.datasourceScopeConfig.tableScopeType = cfg.tableScopeType || 'ALL_TABLES';
      dsFilterConditionGroup.value = normalizeDatasourceFilterCondition(cfg.filterConfig || cfg);
    }
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  // 1. 深度校验计算源规则
  if (formData.scanSourceType === 'COMPUTE_ENGINE') {
    if (computeConditionRef.value?.validate) {
      computeConditionRef.value.validate();
    }
    const computeCheck = validateRecognitionCondition(computeConditionGroup.value, 'COMPUTE_ENGINE');
    if (!computeCheck.valid) {
      message.warning(computeCheck.message || '计算源规则配置不符合要求');
      return;
    }
  }

  // 2. 深度校验数据源规则
  if (formData.scanSourceType === 'DATASOURCE') {
    if (formData.datasourceScopeConfig.datasourceIds.length === 0) {
      message.warning('请选择至少一个数据源');
      return;
    }
    if (formData.datasourceScopeConfig.tableScopeType === 'SPECIFIC_TABLES') {
      if (dsConditionRef.value?.validate) {
        dsConditionRef.value.validate();
      }
      const dsCheck = validateRecognitionCondition(dsFilterConditionGroup.value, 'DATASOURCE');
      if (!dsCheck.valid) {
        message.warning(dsCheck.message || '指定表过滤规则配置不符合要求');
        return;
      }
    }
  }

  submitting.value = true;
  try {
    const payload = {
      ruleName: formData.ruleName,
      description: formData.description,
      priority: formData.priority,
      lineageInheritanceEnabled: false,
      categoryScopeMode: 'ALL' as any,
      categoryScopeConfig: {},
      scanSourceType: formData.scanSourceType as any,
      computeScopeConfig: computeConditionGroup.value,
      datasourceScopeConfig: {
        datasourceIds: formData.datasourceScopeConfig.datasourceIds,
        tableScopeType: formData.datasourceScopeConfig.tableScopeType,
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
          padding: 6px 0 6px 6px;
          position: relative;

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
