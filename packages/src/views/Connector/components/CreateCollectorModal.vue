<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { YButton } from '@yss-ui/components';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import { GetConnectors, PostCollectors } from '@/api';
import { customInstance } from '@/api/mutator';
import { customMessage } from '@/utils';
import type { CollectorTaskFormState, DatasourceCatalogItem, RemoteDatasourceItem } from '../type';

defineOptions({ name: 'CreateCollectorModal' });

interface Props {
  open: boolean;
  selectedCatalogItem: DatasourceCatalogItem | null;
  catalogList: DatasourceCatalogItem[];
  editingRecord?: any | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'success'): void;
}>();

const isEdit = computed(() => !!props.editingRecord?.id);
const modalTitle = computed(() => (isEdit.value ? '编辑采集任务' : '新建采集任务'));

const currentStep = ref(0);
const submitting = ref(false);

const remoteDatasources = ref<RemoteDatasourceItem[]>([]);
const sourceSystemOptions = ref<{ label: string; value: string }[]>([]);
const databaseOptions = ref<{ label: string; value: string }[]>([]);
const fetchingDatabases = ref(false);

const fetchRemoteDatasources = async () => {
  try {
    const res = await GetConnectors();
    const list = (res?.data ?? []) as any[];
    remoteDatasources.value = list.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type || 'MySQL',
      host: item.host ? `${item.host}:${item.port || 3306}` : item.name,
    }));
  } catch {
    remoteDatasources.value = [];
  }
};

const fetchSourceSystems = async () => {
  try {
    const res = await customInstance<{ data?: Array<{ code?: string; name?: string; label?: string }> }>({
      url: '/api/connectors/systems',
      method: 'GET',
    });
    const list = (res?.data ?? []) as any[];
    sourceSystemOptions.value = list.map(item => ({
      label: item.label || `${item.name} (${item.code})`,
      value: item.code || item.name,
    }));
  } catch {
    sourceSystemOptions.value = [];
  }
};

const fetchDatabases = async (datasourceId?: string) => {
  if (!datasourceId) {
    databaseOptions.value = [];
    return;
  }
  fetchingDatabases.value = true;
  try {
    const res = await customInstance<{ data?: string[] }>({
      url: `/api/connectors/${datasourceId}/databases`,
      method: 'GET',
    });
    const list = (res?.data ?? []) as string[];
    databaseOptions.value = list.map(db => ({
      label: db,
      value: db,
    }));
  } catch {
    databaseOptions.value = [];
  } finally {
    fetchingDatabases.value = false;
  }
};

const PERIOD_OPTIONS = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
];

const WEEKDAY_OPTIONS = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
];

const MONTHDAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  label: `${i + 1} 日`,
  value: i + 1,
}));

const formState = reactive<CollectorTaskFormState>({
  name: '',
  description: '',
  datasourceType: 'MySQL',
  datasourceId: undefined,
  scopeType: 'all',
  selectedDatabases: [],
  objectTypes: ['TABLE_COLUMN_VIEW'],
  sourceSystem: undefined,
  // 步骤 2：策略配置
  scheduleType: 'cron',
  periodType: 'day',
  scheduleTime: '05:35',
  selectedWeekDays: [1],
  selectedMonthDay: 1,
  cronExpression: '0 35 5 * * ?',
  retryEnabled: true,
  retryCount: 1,
  retryInterval: 5,
  resourceCu: 1.0,
  resourceGroup: '租户默认资源组',
  mode: 'incremental',
  strategy: 'ignore',
  autoClassify: true,
});

// 计算 Cron 表达式
const computedCron = computed(() => {
  if (formState.scheduleType === 'manual') {
    return 'manual';
  }
  const timeStr = formState.scheduleTime || '05:35';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr || '5', 10);
  const min = parseInt(minStr || '35', 10);

  if (formState.periodType === 'day') {
    return `0 ${min} ${hour} * * ?`;
  }
  if (formState.periodType === 'week') {
    const days = formState.selectedWeekDays?.length ? formState.selectedWeekDays.join(',') : '1';
    return `0 ${min} ${hour} ? * ${days}`;
  }
  if (formState.periodType === 'month') {
    const day = formState.selectedMonthDay || 1;
    return `0 ${min} ${hour} ${day} * ?`;
  }
  return `0 ${min} ${hour} * * ?`;
});

// 计算“最近的生成时间”
const nextExecutionTime = computed(() => {
  if (formState.scheduleType === 'manual') {
    return '手动触发（即时执行）';
  }
  const timeStr = formState.scheduleTime || '05:35';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr || '5', 10);
  const min = parseInt(minStr || '35', 10);

  const now = new Date();
  const target = new Date();
  target.setHours(hour, min, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d} ${hh}:${mm}:00`;
});

// 当弹窗唤起或选中卡片变化时初始化表单
watch(
  () => [props.open, props.selectedCatalogItem, props.editingRecord],
  async ([isOpen]) => {
    if (isOpen) {
      await fetchRemoteDatasources();
      await fetchSourceSystems();
      currentStep.value = 0;

      if (props.editingRecord) {
        const rec = props.editingRecord;
        formState.name = rec.name || '';
        formState.description = rec.description || '';
        formState.datasourceType = rec.datasourceType || props.selectedCatalogItem?.id || 'MySQL';
        formState.datasourceId = rec.connectorId || undefined;
        formState.sourceSystem = rec.sourceSystem || undefined;
        formState.scopeType = (rec.scopeType as any) || 'all';
        if (Array.isArray(rec.selectedDatabases)) {
          formState.selectedDatabases = rec.selectedDatabases;
        } else if (typeof rec.selectedDatabases === 'string' && rec.selectedDatabases.trim()) {
          formState.selectedDatabases = rec.selectedDatabases
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        } else {
          formState.selectedDatabases = [];
        }
        formState.mode = rec.mode || 'FULL';
        formState.strategy = rec.strategy || 'OVERWRITE';
        formState.autoClassify = rec.autoClassify !== false;
        formState.retryEnabled = rec.retryEnabled !== false;
        formState.retryCount = rec.retryCount ?? 1;
        formState.retryInterval = rec.retryInterval ?? 5;
        formState.resourceCu = rec.resourceCu ?? 1.0;

        if (rec.schedule === 'manual') {
          formState.scheduleType = 'manual';
        } else {
          formState.scheduleType = 'cron';
        }

        if (formState.datasourceId) {
          await fetchDatabases(formState.datasourceId);
        }
      } else {
        const initialType = props.selectedCatalogItem?.id || 'MySQL';
        formState.datasourceType = initialType;
        formState.name = `${props.selectedCatalogItem?.name || initialType}-元数据采集`;
        formState.description = '';
        formState.sourceSystem = undefined;
        formState.scopeType = 'all';
        formState.selectedDatabases = [];
        formState.scheduleType = 'cron';
        formState.periodType = 'day';
        formState.scheduleTime = '05:35';
        formState.retryEnabled = true;
        formState.retryCount = 1;
        formState.retryInterval = 5;
        formState.resourceCu = 1.0;

        // 自动查找该类型下首个可用数据源
        const hit = remoteDatasources.value.find(
          d => (d.type || '').trim().toLowerCase() === initialType.trim().toLowerCase()
        );
        formState.datasourceId = hit ? hit.id : undefined;
      }
    }
  },
  { immediate: true }
);

// 当前类型下的可用数据源选项
const availableDsOptions = computed(() => {
  const currentType = (formState.datasourceType || '').trim().toLowerCase();
  return remoteDatasources.value
    .filter(d => (d.type || '').trim().toLowerCase() === currentType)
    .map(d => ({ label: `${d.name} (${d.host})`, value: d.id }));
});

const filterSourceSystemOption = (input: string, option: any) => {
  const label = String(option?.label || '').toLowerCase();
  const value = String(option?.value || '').toLowerCase();
  const kw = input.toLowerCase();
  return label.includes(kw) || value.includes(kw);
};

const getDsName = (id?: string) => {
  if (!id) return '';
  const hit = remoteDatasources.value.find(d => d.id === id);
  return hit ? hit.name : id;
};

const handleScopeTypeChange = (type: 'all' | 'custom') => {
  formState.scopeType = type;
};

const handleScheduleTypeChange = (type: 'manual' | 'cron') => {
  formState.scheduleType = type;
};

const handleTypeChange = (type: any) => {
  const typeStr = String(type || '')
    .trim()
    .toLowerCase();
  const hit = remoteDatasources.value.find(d => (d.type || '').trim().toLowerCase() === typeStr);
  formState.datasourceId = hit ? hit.id : undefined;
  formState.selectedDatabases = [];
};

// 监听数据源选择，智能联动推荐来源系统并动态拉取 Database 库表元数据（允许用户手动覆盖）
watch(
  () => formState.datasourceId,
  async newDsId => {
    if (!newDsId) {
      databaseOptions.value = [];
      return;
    }
    await fetchDatabases(newDsId);
    const hitDs = remoteDatasources.value.find(d => d.id === newDsId);
    if (hitDs && !formState.sourceSystem) {
      const nameLower = (hitDs.name || '').toLowerCase();
      const hitSys = sourceSystemOptions.value.find(
        sys =>
          nameLower.includes(sys.value.toLowerCase()) ||
          nameLower.includes(sys.label.split(' ')[0].toLowerCase()) ||
          nameLower.includes(sys.label.toLowerCase())
      );
      if (hitSys) {
        formState.sourceSystem = hitSys.value;
      }
    }
  }
);

const handleClose = () => {
  emit('update:open', false);
};

const handleViewDs = () => {
  customMessage.info(`查看数据源 [${getDsName(formState.datasourceId)}] 详情（来自数据源服务）`);
};

const handleNext = () => {
  if (!formState.name?.trim()) {
    customMessage.warning('请输入采集任务名称');
    return;
  }
  if (!formState.datasourceId) {
    customMessage.warning('请选择数据源');
    return;
  }
  if (formState.scopeType === 'custom' && (!formState.selectedDatabases || formState.selectedDatabases.length === 0)) {
    customMessage.warning('请选择需要采集的指定 Database');
    return;
  }
  if (!formState.sourceSystem) {
    customMessage.warning('请选择来源系统');
    return;
  }
  currentStep.value = 1;
};

const handlePrev = () => {
  currentStep.value = 0;
};

const handleComplete = async () => {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const finalSchedule = computedCron.value;
    const payload = {
      name: formState.name,
      connectorId: formState.datasourceId || formState.datasourceType,
      schedule: finalSchedule,
      mode: formState.mode,
      strategy: formState.strategy,
      autoClassify: formState.autoClassify,
      description: formState.description,
      datasourceType: formState.datasourceType,
      sourceSystem: formState.sourceSystem,
      scopeType: formState.scopeType,
      selectedDatabases: Array.isArray(formState.selectedDatabases)
        ? formState.selectedDatabases.join(',')
        : formState.selectedDatabases || '',
      retryEnabled: formState.retryEnabled,
      retryCount: formState.retryCount,
      retryInterval: formState.retryInterval,
    };

    if (isEdit.value && props.editingRecord?.id) {
      await customInstance({
        url: `/api/collectors/${props.editingRecord.id}`,
        method: 'PUT',
        data: {
          ...payload,
          id: props.editingRecord.id,
        },
      });
      customMessage.success(`采集任务「${formState.name}」已成功更新`);
    } else {
      await PostCollectors(payload as any);
      customMessage.success(`采集任务「${formState.name}」已成功创建并就绪`);
    }
    emit('update:open', false);
    emit('success');
  } catch {
    // 拦截器已统一提示错误
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <a-modal
    :open="props.open"
    :title="modalTitle"
    width="75%"
    wrap-class-name="collector-modal-custom"
    :footer="null"
    :destroy-on-close="true"
    centered
    @cancel="handleClose"
  >
    <!-- 步骤导航条 -->
    <div class="create-collector-steps">
      <a-steps :current="currentStep" size="small">
        <a-step title="采集配置" />
        <a-step title="采集策略" />
      </a-steps>
    </div>

    <!-- 步骤 1：采集配置 -->
    <div v-show="currentStep === 0" class="create-collector-body">
      <a-form layout="horizontal" :label-col="{ style: { width: '120px' } }" :wrapper-col="{ style: { flex: 1 } }">
        <a-form-item label="采集任务名称" required>
          <a-input v-model:value="formState.name" placeholder="请输入任务名称" />
        </a-form-item>

        <a-form-item label="采集任务描述">
          <a-textarea
            v-model:value="formState.description"
            placeholder="请输入采集任务描述"
            :rows="3"
            :maxlength="1000"
            show-count
          />
        </a-form-item>

        <a-form-item label="数据来源" required>
          <div class="source-radio-row">
            <a-radio :checked="true">数据源</a-radio>
          </div>
          <div class="source-select-group">
            <a-select v-model:value="formState.datasourceType" class="source-type-select" @change="handleTypeChange">
              <a-select-option v-for="item in props.catalogList" :key="item.id" :value="item.id">
                关系型数据库 / {{ item.name }}
              </a-select-option>
            </a-select>

            <a-select
              v-model:value="formState.datasourceId"
              class="source-instance-select"
              placeholder="请选择数据源"
              :options="availableDsOptions"
              :not-found-content="'该类型下暂无可调用的数据源实例'"
            />

            <YButton
              type="link"
              size="small"
              class="view-link-btn"
              :disabled="!formState.datasourceId"
              @click="handleViewDs"
            >
              查看
            </YButton>
          </div>
        </a-form-item>

        <a-form-item label="采集范围" required>
          <div class="scope-radio-group">
            <!-- 选项 1：全部 Database -->
            <div class="scope-option-row">
              <a-radio
                name="scopeTypeGroup"
                :checked="formState.scopeType === 'all'"
                @change="handleScopeTypeChange('all')"
              >
                全部 Database
              </a-radio>
              <a-tooltip title="每次采集前，根据数据源配置动态获取所有有查询权限的Database进行采集">
                <InfoCircleOutlined class="tooltip-icon" />
              </a-tooltip>
              <span class="scope-explain-text">每次采集前，根据数据源配置动态获取所有有查询权限的Database进行采集</span>
            </div>

            <!-- 选项 2：指定 Database -->
            <div class="scope-option-row scope-option-row--custom">
              <a-radio
                name="scopeTypeGroup"
                :checked="formState.scopeType === 'custom'"
                @change="handleScopeTypeChange('custom')"
              >
                指定 Database
              </a-radio>
              <a-tooltip title="仅采集所选中的一个或多个具体 Database">
                <InfoCircleOutlined class="tooltip-icon" />
              </a-tooltip>
              <a-select
                v-model:value="formState.selectedDatabases"
                mode="multiple"
                placeholder="请选择Database"
                class="scope-db-select"
                :options="databaseOptions"
                :loading="fetchingDatabases"
                :disabled="formState.scopeType !== 'custom' || !formState.datasourceId"
                :max-tag-count="4"
                allow-clear
                @focus="handleScopeTypeChange('custom')"
              />
            </div>
          </div>
        </a-form-item>

        <a-form-item label="采集对象类型" required>
          <a-checkbox-group v-model:value="formState.objectTypes">
            <a-checkbox value="TABLE_COLUMN_VIEW">表/字段/视图</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <a-form-item required>
          <template #label>
            <span>
              来源系统
              <a-tooltip title="请选择元数据所属的数据源服务业务系统名录，便于资产分类与血缘追溯">
                <InfoCircleOutlined class="tooltip-icon" />
              </a-tooltip>
            </span>
          </template>
          <a-select
            v-model:value="formState.sourceSystem"
            placeholder="请选择来源系统"
            :options="sourceSystemOptions"
            show-search
            allow-clear
            :filter-option="filterSourceSystemOption"
          />
        </a-form-item>
      </a-form>
    </div>

    <!-- 步骤 2：采集策略 -->
    <div v-show="currentStep === 1" class="create-collector-body">
      <a-form layout="horizontal" :label-col="{ style: { width: '130px' } }" :wrapper-col="{ style: { flex: 1 } }">
        <!-- 调度周期 -->
        <a-form-item label="调度周期" required>
          <div class="schedule-radio-group">
            <a-radio
              name="scheduleTypeGroup"
              :checked="formState.scheduleType === 'manual'"
              @change="handleScheduleTypeChange('manual')"
            >
              手动触发（单次）
            </a-radio>
            <a-radio
              name="scheduleTypeGroup"
              :checked="formState.scheduleType === 'cron'"
              @change="handleScheduleTypeChange('cron')"
            >
              定时调度
            </a-radio>
          </div>

          <div v-if="formState.scheduleType === 'cron'" class="cron-schedule-wrapper">
            <div class="period-control-row">
              <a-select v-model:value="formState.periodType" class="period-type-select" :options="PERIOD_OPTIONS" />

              <a-select
                v-if="formState.periodType === 'week'"
                v-model:value="formState.selectedWeekDays"
                mode="multiple"
                placeholder="请选择周几"
                class="period-extra-select"
                :options="WEEKDAY_OPTIONS"
              />

              <a-select
                v-if="formState.periodType === 'month'"
                v-model:value="formState.selectedMonthDay"
                placeholder="请选择日期"
                class="period-extra-select"
                :options="MONTHDAY_OPTIONS"
              />

              <a-time-picker
                v-model:value="formState.scheduleTime"
                value-format="HH:mm"
                format="HH:mm"
                placeholder="请选择时间"
                class="period-time-picker"
              />

              <span class="cron-expression-badge">cron 表达式 {{ computedCron }}</span>
            </div>

            <div class="next-schedule-hint">最近的生成时间 <span class="dot">•</span> {{ nextExecutionTime }}</div>
          </div>
        </a-form-item>

        <!-- 采集模式 -->
        <a-form-item label="采集模式" required>
          <a-select v-model:value="formState.mode">
            <a-select-option value="incremental">增量（仅采集变更表与字段）</a-select-option>
            <a-select-option value="full">全量（重新比对全库资产）</a-select-option>
          </a-select>
        </a-form-item>

        <!-- 覆盖策略 -->
        <a-form-item label="覆盖策略" required>
          <a-select v-model:value="formState.strategy">
            <a-select-option value="ignore">忽略（仅新增/更新，不覆盖已变更字段）</a-select-option>
            <a-select-option value="overwrite">覆盖已变更资产</a-select-option>
            <a-select-option value="abort-on-failure">失败即中止</a-select-option>
          </a-select>
        </a-form-item>

        <!-- 失败重试 -->
        <a-form-item label="失败重试">
          <div class="retry-switch-row">
            <a-switch v-model:checked="formState.retryEnabled" />
          </div>

          <div v-if="formState.retryEnabled" class="retry-config-row">
            <div class="retry-config-item">
              <span class="sub-required-label">重试次数</span>
              <a-input-number v-model:value="formState.retryCount" :min="1" :max="5" class="retry-number-input" />
            </div>

            <div class="retry-config-item">
              <span class="sub-required-label">重试间隔 (分钟)</span>
              <a-input-number v-model:value="formState.retryInterval" :min="1" :max="60" class="retry-number-input" />
            </div>
          </div>
        </a-form-item>

        <!-- 自动识别敏感分类 -->
        <a-form-item label="自动识别敏感分类">
          <div class="classify-switch-row">
            <a-switch v-model:checked="formState.autoClassify" />
            <span class="switch-tip">采集完成后自动调用安全规则引擎识别敏感数据并打标</span>
          </div>
        </a-form-item>
      </a-form>
    </div>

    <!-- 底部按钮操作栏 -->
    <div class="create-collector-footer">
      <YButton @click="handleClose">取消</YButton>
      <YButton v-if="currentStep === 1" @click="handlePrev">上一步</YButton>
      <YButton v-if="currentStep === 0" type="primary" @click="handleNext">下一步</YButton>
      <YButton v-if="currentStep === 1" type="primary" :loading="submitting" @click="handleComplete">
        完成创建
      </YButton>
    </div>
  </a-modal>
</template>

<style scoped lang="less">
.create-collector-steps {
  max-width: 520px;
  margin: 0 auto 24px auto;
}

.create-collector-body {
  height: calc(65vh - 200px);
  min-height: 360px;
  max-height: calc(65vh - 200px);
  overflow-y: auto;
  padding-right: 12px;

  /* 细滚动条美化 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 3px;
  }
}

.source-radio-row {
  margin-bottom: 8px;
}

.source-select-group {
  display: flex;
  gap: 12px;
  align-items: center;

  .source-type-select {
    width: 320px;
    min-width: 260px;
    flex-shrink: 0;
  }

  .source-instance-select {
    flex: 1;
    min-width: 260px;
  }

  .view-link-btn {
    padding: 0 4px;
    flex-shrink: 0;
  }
}

.scope-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.scope-option-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;

  &--custom {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;

    .scope-db-select {
      flex: 1;
      min-width: 280px;
      margin-left: 8px;
    }
  }
}

.scope-explain-text {
  font-size: 13px;
  color: #4b5563;
  margin-left: 6px;
}

.tooltip-icon {
  color: #9ca3af;
  cursor: help;
  margin-left: 2px;
}

.schedule-radio-group {
  margin-bottom: 12px;
  display: block;
}

.cron-schedule-wrapper {
  margin-top: 4px;
  background: #f9fafb;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.period-control-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .period-type-select {
    width: 80px;
    flex-shrink: 0;
  }

  .period-extra-select {
    min-width: 140px;
    flex-shrink: 0;
  }

  .period-time-picker {
    width: 120px;
    flex-shrink: 0;
  }

  .cron-expression-badge {
    font-size: 13px;
    color: #4b5563;
    font-family: monospace;
    margin-left: 8px;
  }
}

.next-schedule-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;

  .dot {
    font-weight: bold;
    margin: 0 4px;
    color: #9ca3af;
  }
}

.retry-switch-row {
  line-height: 32px;
}

.retry-config-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 10px;
  background: #f9fafb;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.retry-config-item {
  display: flex;
  align-items: center;
  gap: 8px;

  .sub-required-label {
    font-size: 13px;
    color: #374151;

    &::before {
      content: '* ';
      color: #ff4d4f;
    }
  }

  .retry-number-input {
    width: 100px;
  }
}

.classify-switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 32px;
}

.switch-tip {
  font-size: 12px;
  color: #6b7280;
}

.create-collector-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
