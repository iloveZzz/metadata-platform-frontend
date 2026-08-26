/**
 * 分级分类页 - 新增/修正规则抽屉表单 Hook
 * 修正=预填表单新建修正副本（后端 configure 为新增/修正合一的 POST，无规则更新端点，偏离登记）；
 * 编辑回填由 openEdit 设置 initialValues，配合抽屉 destroy-on-close 重建表单。
 */
import { computed, ref, type Ref } from 'vue';
import { createRuleFormSchema } from '../constant';
import type { ClassRuleItem, RuleFormValues, YssFormilyExpose } from '../type';

export function useRuleForm({
  formRef,
  onSubmit,
}: {
  formRef: Ref<YssFormilyExpose | undefined>;
  onSubmit: (values: RuleFormValues) => Promise<boolean>;
}) {
  const visible = ref(false);
  const submitting = ref(false);
  const editing = ref(false);
  const initialValues = ref<Record<string, any>>({ enabled: true });

  const schema = computed(() => createRuleFormSchema());

  const openCreate = () => {
    editing.value = false;
    initialValues.value = { enabled: true, type: 'regex' };
    visible.value = true;
  };

  const openEdit = (row: ClassRuleItem) => {
    editing.value = true;
    initialValues.value = {
      name: row.name,
      type: row.type,
      pattern: row.pattern ?? '',
      enabled: row.enabled,
    };
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const handleSubmit = async () => {
    if (submitting.value) return;
    try {
      // 触发 YssFormily 校验；校验失败会 reject，字段级错误由表单自身展示
      await formRef.value?.submit();
    } catch {
      return;
    }
    const values = formRef.value?.getValues() as RuleFormValues | undefined;
    if (!values) return;
    submitting.value = true;
    try {
      const ok = await onSubmit({ ...values, enabled: values.enabled ?? true });
      if (ok) visible.value = false;
    } finally {
      submitting.value = false;
    }
  };

  return { visible, submitting, editing, schema, initialValues, openCreate, openEdit, close, handleSubmit };
}
