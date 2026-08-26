<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { addManualColumnEdgeApi, type ColumnLineageManualCmd } from '@/api/columnLineage';

defineOptions({ name: 'ColumnLineageManualModal' });

const props = defineProps<{
  visible: boolean;
  centerAssetId: string;
  centerAssetName?: string;
  availableNodes?: Array<{ assetId: string; assetName: string; columnName: string }>;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'success'): void;
}>();

const formRef = ref();
const submitting = ref(false);
const cycleErrorMessage = ref<string | null>(null);

const form = reactive<ColumnLineageManualCmd>({
  fromAssetId: '',
  fromColumnId: '',
  toAssetId: '',
  toColumnId: '',
  transformExpr: '',
  exprType: 'DIRECT',
  remark: '',
});

const rules = {
  fromAssetId: [{ required: true, message: '请选择上游资产' }],
  fromColumnId: [{ required: true, message: '请输入上游字段名' }],
  toAssetId: [{ required: true, message: '请选择下游资产' }],
  toColumnId: [{ required: true, message: '请输入下游字段名' }],
};

watch(
  () => props.visible,
  v => {
    if (v) {
      cycleErrorMessage.value = null;
      form.fromAssetId = '';
      form.fromColumnId = '';
      form.toAssetId = props.centerAssetId;
      form.toColumnId = '';
      form.transformExpr = '';
      form.exprType = 'DIRECT';
      form.remark = '';
    }
  }
);

const handleCancel = () => {
  emit('update:visible', false);
};

const handleOk = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  cycleErrorMessage.value = null;

  try {
    const res = await addManualColumnEdgeApi(form);
    if (res && res.success) {
      message.success('字段级血缘人工补录成功');
      emit('update:visible', false);
      emit('success');
    }
  } catch (err: any) {
    if (err?.code === 'lineage.cycle' || err?.message?.includes('CYCLE') || err?.message?.includes('环')) {
      cycleErrorMessage.value = err?.message || '补录此血缘边将导致循环依赖闭环 (CYCLE 409)，系统已阻断保存！';
    } else {
      message.error(err?.message || '字段血缘补录失败');
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <a-modal
    :open="visible"
    title="人工补录字段级血缘"
    :confirm-loading="submitting"
    width="580px"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-alert v-if="cycleErrorMessage" type="error" show-icon :message="cycleErrorMessage" style="margin-bottom: 16px" />

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="上游资产 ID" name="fromAssetId">
            <a-input v-model:value="form.fromAssetId" placeholder="例如: ods_orders" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="上游字段名" name="fromColumnId">
            <a-input v-model:value="form.fromColumnId" placeholder="例如: amount" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="下游资产 ID" name="toAssetId">
            <a-input v-model:value="form.toAssetId" placeholder="例如: dwd_orders" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="下游字段名" name="toColumnId">
            <a-input v-model:value="form.toColumnId" placeholder="例如: order_amt" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="表达式类型" name="exprType">
            <a-select v-model:value="form.exprType">
              <a-select-option value="DIRECT">直接映射 (DIRECT)</a-select-option>
              <a-select-option value="COMPUTED">计算派生 (COMPUTED)</a-select-option>
              <a-select-option value="AGGREGATE">聚合计算 (AGGREGATE)</a-select-option>
              <a-select-option value="MANUAL">人工指定 (MANUAL)</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="转换 SQL 表达式" name="transformExpr">
            <a-input v-model:value="form.transformExpr" placeholder="例如: sum(amount)" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="补录备注说明" name="remark">
        <a-textarea v-model:value="form.remark" :rows="2" placeholder="填写业务口径与补录原因..." />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
