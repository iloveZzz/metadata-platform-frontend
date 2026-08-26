<!--
  术语认证弹窗（状态矩阵 §2 术语认证弹窗）
  防篡改二次确认：认证将标记术语为「已认证」并写入认证人/认证时间至不可变审计记录；
  已认证术语内容变更后需重新认证（SB-02，认证失效回退草稿）。
-->
<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TermRow } from '../type';

defineOptions({ name: 'CertifyModal' });

const props = defineProps<{
  open: boolean;
  term: TermRow | null;
  submitting: boolean;
  operatorName: string;
}>();

const emit = defineEmits<{
  confirm: [note: string];
  cancel: [];
}>();

const note = ref('');

watch(
  () => props.open,
  v => {
    if (v) note.value = '';
  }
);
</script>

<template>
  <a-modal
    :open="open"
    :title="term ? `认证术语「${term.name}」` : '认证术语'"
    :confirm-loading="submitting"
    :mask-closable="false"
    @cancel="emit('cancel')"
  >
    <a-alert
      type="warning"
      show-icon
      class="certify-modal__alert"
      message="防篡改确认"
      description="认证将把术语标记为「已认证」并写入认证人 / 认证时间至不可变审计记录，不支持匿名篡改；已认证术语内容变更后需重新认证（SB-02 认证变更语义）。"
    />
    <a-descriptions size="small" :column="1" bordered>
      <a-descriptions-item label="操作对象">{{ term?.name ?? '—' }}</a-descriptions-item>
      <a-descriptions-item label="动作">term.certify（POST /api/semantic/terms/{id}/certify）</a-descriptions-item>
      <a-descriptions-item label="操作人">{{ operatorName }}</a-descriptions-item>
    </a-descriptions>
    <a-form layout="vertical" class="certify-modal__note">
      <a-form-item label="操作备注（写入审计，可选）">
        <a-input v-model:value="note" placeholder="例如：口径定义已复核，认证为正式来源" allow-clear />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-space>
        <a-button :disabled="submitting" @click="emit('cancel')">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="emit('confirm', note)"> 确认认证 </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
.certify-modal__alert {
  margin-bottom: 16px;
}
.certify-modal__note {
  margin-top: 16px;
  margin-bottom: 0;
}
</style>
