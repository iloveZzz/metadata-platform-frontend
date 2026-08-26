<!--
  新建术语弹窗（原型 §CreateTermModal）
  保存为草稿（SL-001）；名称重复由后端 422 TERM_NAME_DUPLICATE 兜底（mutator 统一提示）。
  owner 必填（SB-01：语义对象自带，创建必填）。
-->
<script setup lang="ts">
import { reactive } from 'vue';
import type { TermCreateValues } from '../type';

defineOptions({ name: 'CreateTermModal' });

defineProps<{
  open: boolean;
  submitting: boolean;
}>();

const emit = defineEmits<{
  confirm: [values: TermCreateValues];
  cancel: [];
}>();

const form = reactive({
  name: '',
  aliases: [] as string[],
  definition: '',
  description: '',
  owner: undefined as string | undefined,
});

const OWNER_OPTIONS = [
  { label: '李工', value: '李工' },
  { label: '王工', value: '王工' },
  { label: '赵工', value: '赵工' },
];

const reset = () => {
  form.name = '';
  form.aliases = [];
  form.definition = '';
  form.description = '';
  form.owner = undefined;
};

const submit = () => {
  if (!form.name.trim() || !form.definition.trim() || !form.owner) return;
  emit('confirm', {
    name: form.name.trim(),
    aliases: form.aliases,
    definition: form.definition.trim(),
    description: form.description.trim() || undefined,
    owner: form.owner,
  });
};
</script>

<template>
  <a-modal
    :open="open"
    title="新建术语"
    :confirm-loading="submitting"
    :mask-closable="false"
    width="560"
    :after-close="reset"
    @cancel="emit('cancel')"
    @ok="submit"
  >
    <a-form layout="vertical">
      <a-form-item label="术语名称" required>
        <a-input v-model:value="form.name" placeholder="如：退款金额" />
      </a-form-item>
      <a-form-item label="别名">
        <a-select
          v-model:value="form.aliases"
          mode="tags"
          :token-separators="[',', '，']"
          placeholder="输入别名后回车，如：退款额"
        />
      </a-form-item>
      <a-form-item label="定义" required>
        <a-textarea v-model:value="form.definition" :rows="3" placeholder="业务概念的精确定义" />
      </a-form-item>
      <a-form-item label="描述">
        <a-textarea v-model:value="form.description" :rows="2" placeholder="补充说明（可选）" />
      </a-form-item>
      <a-form-item label="负责人" required>
        <a-select v-model:value="form.owner" placeholder="请选择负责人" :options="OWNER_OPTIONS" />
      </a-form-item>
      <a-alert
        type="info"
        show-icon
        message="保存为草稿：新建术语默认进入草稿状态，认证后方可成为正式口径来源（SL-001）。负责人字段归属 SB-01（语义对象自带）已确认。"
      />
    </a-form>
  </a-modal>
</template>
