<!--
  术语弃用弹窗（状态矩阵 §2 术语弃用弹窗）
  级联影响检查（SB-09）：有效挂接展示规则 / 关联同义词组处理；弃用后术语可查看与回溯（SL-001）。
  挂接数据源为切片 04 交接（GET /api/semantic/attachments），本切片传入行内可见信息，
  后端以 409 校验 + 审计兜底。
-->
<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TermRow } from '../type';

defineOptions({ name: 'DeprecateModal' });

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
    :title="term ? `弃用术语「${term.name}」` : '弃用术语'"
    :confirm-loading="submitting"
    :mask-closable="false"
    @cancel="emit('cancel')"
  >
    <a-alert type="warning" show-icon class="deprecate-modal__alert" message="级联影响检查（SB-09）">
      <template #description>
        该术语当前挂接信息由挂接切片交接（切片 04，本切片暂不展示挂接数）；
        <template v-if="term?.synonymSetId">已关联同义词组（{{ term.synonymSetId }}，切片 03 交接）。</template>
        <template v-else>未关联同义词组。</template>
        已弃用术语的挂接展示与同义词组处理规则按 SB-09（弃用不级联删除，既有挂接保留展示、不可新挂接）。
        弃用后术语可查看与回溯（SL-001）。
      </template>
    </a-alert>
    <a-descriptions size="small" :column="1" bordered>
      <a-descriptions-item label="流转">
        草稿 / 已认证 → 已弃用（POST /api/semantic/terms/{id}/certify，弃用动作）
      </a-descriptions-item>
      <a-descriptions-item label="操作人">{{ operatorName }}</a-descriptions-item>
    </a-descriptions>
    <a-form layout="vertical" class="deprecate-modal__note">
      <a-form-item label="操作备注（写入审计，可选）">
        <a-input v-model:value="note" placeholder="例如：口径已失效，标记弃用并保留历史可查" allow-clear />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-space>
        <a-button :disabled="submitting" @click="emit('cancel')">取消</a-button>
        <a-button danger type="primary" :loading="submitting" @click="emit('confirm', note)"> 确认弃用 </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
.deprecate-modal__alert {
  margin-bottom: 16px;
}
.deprecate-modal__note {
  margin-top: 16px;
  margin-bottom: 0;
}
</style>
