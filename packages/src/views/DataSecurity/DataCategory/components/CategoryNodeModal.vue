<template>
  <a-modal
    v-model:open="visible"
    :title="title"
    :confirm-loading="submitting"
    width="540px"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleOk"
  >
    <div class="category-node-formily-wrapper py-2">
      <!-- 提示上级目录 -->
      <div
        v-if="mode === 'ADD_SUB'"
        class="bg-blue-50 p-2.5 rounded mb-3 text-xs text-gray-700 flex items-center border border-blue-100"
      >
        <span class="text-gray-500 mr-2">目标上级目录:</span>
        <strong class="text-blue-700">{{ activeParentNode?.nodeName || '根目录' }}</strong>
      </div>

      <YFormily v-model="formData" :form="formInstance" :schema="schema" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { createForm } from '@formily/core';
import { YFormily } from '@yss-ui/components';
import { createCategoryNodeSchema } from '../schemas/categoryNodeSchema';
import type { CategoryTreeNodeVO } from '@/api/generated/data-security/schemas';

defineOptions({ name: 'CategoryNodeModal' });

const props = defineProps<{
  open: boolean;
  mode: 'ADD_ROOT' | 'ADD_SUB' | 'EDIT';
  activeParentNode?: CategoryTreeNodeVO | null;
  editNode?: CategoryTreeNodeVO | null;
  submitting: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'submit', form: { nodeName: string; visibility: any; description: string; admins: string[] }): void;
}>();

const formInstance = createForm({
  validateFirst: false,
});
const schema = createCategoryNodeSchema();

const visible = computed({
  get: () => props.open,
  set: val => emit('update:open', val),
});

const title = computed(() => {
  if (props.mode === 'ADD_ROOT') return '新建分类根目录';
  if (props.mode === 'ADD_SUB') return '添加子分类目录';
  return '编辑目录属性与权限';
});

const formData = ref({
  nodeName: '',
  visibility: 'PUBLIC',
  admins: [] as string[],
  description: '',
});

watch(
  () => props.open,
  val => {
    if (val) {
      if (props.mode === 'EDIT' && props.editNode) {
        const initial = {
          nodeName: props.editNode.nodeName || '',
          visibility: props.editNode.visibility || 'PUBLIC',
          admins: props.editNode.admins || [],
          description: props.editNode.description || '',
        };
        formData.value = { ...initial };
        formInstance.setValues(initial);
      } else {
        const initial = {
          nodeName: '',
          visibility: 'PUBLIC',
          admins: [],
          description: '',
        };
        formData.value = { ...initial };
        formInstance.setValues(initial);
      }
      formInstance.clearErrors();
    }
  }
);

const handleOk = async () => {
  try {
    formInstance.setValues({
      nodeName: formData.value.nodeName,
      visibility: formData.value.visibility,
      admins: formData.value.admins,
      description: formData.value.description,
    });
    const values = await formInstance.submit();
    emit('submit', {
      ...formData.value,
      ...(values as any),
    });
  } catch (err: any) {
    console.warn('Node form validation unpassed:', err);
  }
};
</script>

<style scoped lang="less">
.category-node-formily-wrapper {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
