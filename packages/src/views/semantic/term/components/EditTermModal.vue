<!--
  编辑术语弹窗（原型 §EditTermModal）
  乐观锁 version 由 hook 注入；已认证术语内容变更后认证失效退回草稿需重新认证（SB-02 术语侧）。
-->
<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { TermRow, TermCreateValues } from '../type';

defineOptions({ name: 'EditTermModal' });

const props = defineProps<{
  open: boolean;
  term: TermRow | null;
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

watch(
  () => props.open,
  v => {
    if (v && props.term) {
      form.name = props.term.name ?? '';
      form.aliases = props.term.aliases ?? [];
      form.definition = props.term.definition ?? '';
      form.description = props.term.description ?? '';
      form.owner = props.term.owner ?? undefined;
    }
  },
  { immediate: true }
);

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
    :title="term ? `编辑术语「${term.name}」` : '编辑术语'"
    :confirm-loading="submitting"
    :mask-closable="false"
    width="560"
    @cancel="emit('cancel')"
    @ok="submit"
  >
    <a-alert
      v-if="term?.status === 'certified'"
      type="warning"
      show-icon
      class="edit-term-modal__alert"
      message="已认证术语内容变更"
      description="已认证术语内容变更后认证失效退回草稿，需重新认证（SB-02 术语侧，与口径认证变更语义一致）。"
    />
    <a-form layout="vertical">
      <a-form-item label="术语名称" required>
        <a-input v-model:value="form.name" />
      </a-form-item>
      <a-form-item label="别名">
        <a-select v-model:value="form.aliases" mode="tags" :token-separators="[',', '，']" />
      </a-form-item>
      <a-form-item label="定义" required>
        <a-textarea v-model:value="form.definition" :rows="3" />
      </a-form-item>
      <a-form-item label="描述">
        <a-textarea v-model:value="form.description" :rows="2" />
      </a-form-item>
      <a-form-item label="负责人" required>
        <a-select v-model:value="form.owner" :options="OWNER_OPTIONS" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="less">
.edit-term-modal__alert {
  margin-bottom: 16px;
}
</style>
