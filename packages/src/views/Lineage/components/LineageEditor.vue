/** * 人工补录血缘编辑器（WU-FE-06，抽屉） * 上游/下游资产远程搜索选择（schema onSearch 走 scope）+
类型/置信度/备注（YssFormily JSON Schema）。 * 提交 emit submit(values) 由 useLineageEditor 处理（本地环预检 +
CYCLE/CONFLICT 定制提示）； * 脏表单关闭前确认（状态矩阵「血缘编辑器-表单已修改」）。 */
<script setup lang="ts">
import { Modal } from 'ant-design-vue';
import { YButton, YssFormily } from '@yss-ui/components';
import type { Form } from '@formily/core';
import { createLineageEditorSchema } from '../constant';
import type { CycleConflictItem, LineageEditorFormValues } from '../type';

const props = defineProps<{
  visible: boolean;
  /** 中心资产名称（抽屉信息区展示） */
  centerName?: string;
  /** 提交中（禁用保存/关闭） */
  submitting?: boolean;
  /** 表单已修改（关闭/离开前提醒） */
  dirty?: boolean;
  /** Formily Form 实例（useLineageEditor 外部创建：脏标记 effects + scope 动态 enum） */
  form: Form;
  /** Formily 表达式作用域（远程搜索回调） */
  scope: Record<string, any>;
  /** CYCLE 环冲突提示（定位冲突边） */
  cycleError: CycleConflictItem | null;
  /** CONFLICT 图版本冲突提示（刷新图谱拿最新 token 后重试） */
  conflictError: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', values: LineageEditorFormValues): void;
}>();

defineOptions({ name: 'LineageEditor' });

const schema = createLineageEditorSchema();

/** 关闭（X/遮罩/ESC/取消）：脏表单先确认 */
const handleClose = () => {
  if (props.submitting) return;
  if (props.dirty) {
    Modal.confirm({
      title: '离开确认',
      content: '血缘补录尚未保存，离开将丢失已填写内容。',
      okText: '离开',
      cancelText: '留下',
      onOk: () => emit('close'),
    });
    return;
  }
  emit('close');
};

/** 保存：表单校验通过后提交（校验失败由表单自身展示字段级错误） */
const handleSave = async () => {
  if (props.submitting) return;
  try {
    await props.form.submit();
  } catch {
    return;
  }
  const values = props.form.values as LineageEditorFormValues;
  if (!values?.fromAssetId || !values?.toAssetId) return;
  emit('submit', values);
};
</script>

<template>
  <a-drawer :open="visible" title="人工补录血缘" :width="480" @close="handleClose">
    <a-alert
      v-if="centerName"
      type="info"
      show-icon
      class="lineage-editor__alert"
      :message="`中心资产：${centerName}`"
      description="补录血缘默认标记「人工-高」置信度；成环将被阻断，并发修改通过图版本 token 防冲突。"
    />

    <a-alert
      v-if="cycleError"
      type="error"
      show-icon
      class="lineage-editor__alert"
      message="环检测失败（CYCLE）"
      :description="cycleError.message"
    />

    <a-alert
      v-if="conflictError"
      type="warning"
      show-icon
      class="lineage-editor__alert"
      message="图版本冲突（CONFLICT）"
      description="血缘图谱已被其他用户更新，已为你刷新最新图谱；请确认最新连线后重新提交。"
    />

    <YssFormily :form="form" :schema="schema" :scope="scope" />

    <template #footer>
      <div class="lineage-editor__footer">
        <YButton type="primary" :loading="submitting" @click="handleSave">保存</YButton>
        <YButton :disabled="submitting" @click="handleClose">取消</YButton>
      </div>
    </template>
  </a-drawer>
</template>

<style scoped lang="less">
@import '../style.less';
</style>
