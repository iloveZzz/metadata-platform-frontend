/** * 分级分类页（WU-FE-08，路由 /governance） * 仅负责组合 Hooks 与渲染视图模板（≤150 行），业务逻辑见 hooks/ 与
constant.ts； * 规则区/结果区/传播区拆分为 components/ 子组件。 */
<script setup lang="ts">
import { ref } from 'vue';
import { YButton, YCard, YssFormily } from '@yss-ui/components';
import { PlusOutlined } from '@ant-design/icons-vue';
import { useGovernance } from './hooks/useGovernance';
import { useRuleForm } from './hooks/useRuleForm';
import { useCorrectModal } from './hooks/useCorrectModal';
import GovernancePropagateZone from './components/PropagateZone.vue';
import GovernanceRulesZone from './components/RulesZone.vue';
import GovernanceResultsZone from './components/ResultsZone.vue';
import { createResultActionConfig, createRuleActionConfig } from './constant';
import type { YssFormilyExpose } from './type';

defineOptions({ name: 'GovernanceManage' });
const formRef = ref<YssFormilyExpose>();

const {
  loading,
  loadError,
  rules,
  results,
  propagating,
  togglingRuleId,
  propagateTask,
  propagateDescription,
  fetchOverview,
  handleToggleRule,
  handleCreateRule,
  handleConfirm,
  handleCorrect,
  handlePropagate,
} = useGovernance();
const {
  visible: ruleVisible,
  submitting: ruleSubmitting,
  editing: ruleEditing,
  schema: ruleSchema,
  initialValues: ruleInitialValues,
  openCreate,
  openEdit,
  close: closeRuleForm,
  handleSubmit: handleRuleSubmit,
} = useRuleForm({ formRef, onSubmit: handleCreateRule });
const {
  visible: correctVisible,
  submitting: correctSubmitting,
  target: correctTarget,
  correctedName: correctName,
  open: openCorrect,
  close: closeCorrect,
  handleSubmit: handleCorrectSubmit,
} = useCorrectModal({ onSubmit: handleCorrect });

const ruleActionConfig = createRuleActionConfig({ onCorrect: openEdit });
const resultActionConfig = createResultActionConfig({
  onConfirm: handleConfirm,
  onCorrect: openCorrect,
  onPropagate: handlePropagate,
  isPropagating: () => propagating.value,
});
</script>

<template>
  <div class="governance-page">
    <YCard class="governance-page__card" :bordered="false">
      <div class="governance-page__header">
        <div>
          <div class="governance-page__title">分级分类</div>
          <div class="governance-page__desc">
            PII / 敏感识别（内置规则 + 自定义正则 / 列名 / 字典），分类沿血缘自动传播（参考 Atlas 思路）
          </div>
        </div>
        <YButton type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新增规则
        </YButton>
      </div>

      <a-alert
        v-if="loadError"
        class="governance-page__error"
        type="error"
        show-icon
        message="加载失败"
        description="请检查网络或稍后重试"
      >
        <template #action>
          <YButton size="small" @click="fetchOverview">重试</YButton>
        </template>
      </a-alert>

      <GovernanceRulesZone
        :loading="loading"
        :rules="rules"
        :action-config="ruleActionConfig"
        :toggling-id="togglingRuleId"
        @toggle="handleToggleRule"
      />
      <GovernanceResultsZone :loading="loading" :results="results" :action-config="resultActionConfig" />
      <GovernancePropagateZone :propagating="propagating" :task="propagateTask" :description="propagateDescription" />
    </YCard>

    <a-drawer
      v-model:open="ruleVisible"
      :title="ruleEditing ? '修正规则' : '新增规则'"
      :width="480"
      :destroy-on-close="true"
      @close="closeRuleForm"
    >
      <YssFormily ref="formRef" :schema="ruleSchema" :initial-values="ruleInitialValues" />
      <template #footer>
        <div class="governance-page__drawer-footer">
          <YButton :loading="ruleSubmitting" type="primary" @click="handleRuleSubmit">{{
            ruleEditing ? '保存' : '创建'
          }}</YButton>
          <YButton :disabled="ruleSubmitting" @click="closeRuleForm">取消</YButton>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="correctVisible"
      title="修正候选分类"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="correctSubmitting"
      :ok-button-props="{ disabled: !correctName.trim() }"
      @ok="handleCorrectSubmit"
      @cancel="closeCorrect"
    >
      <div class="governance-page__correct-desc">
        将「{{ correctTarget?.assetName || correctTarget?.assetId }}.{{
          correctTarget?.columnName || ''
        }}」的候选分类修正为：
      </div>
      <a-input v-model:value="correctName" placeholder="输入修正后的分类名（如 内部 / 受限）" />
    </a-modal>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
