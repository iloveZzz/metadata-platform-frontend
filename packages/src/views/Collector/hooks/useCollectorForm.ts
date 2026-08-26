/**
 * 采集任务页 - 创建/编辑调度弹窗表单 Hook
 * 编辑回填由 openEdit 设置 initialValues，配合弹窗 destroy-on-close 重建表单；
 * 目标数据源选项来自 GetConnectors（connectorOptions）。
 */
import { computed, ref, type Ref } from 'vue';
import { PostCollectors, PutCollectorsid } from '@/api';
import { customMessage } from '@/utils';
import { createCollectorFormSchema } from '../constant';
import type { CollectorFormValues, CollectorItem, YssFormilyExpose } from '../type';

export function useCollectorForm({
  connectorOptions,
  formRef,
  onSuccess,
}: {
  connectorOptions: Ref<{ label: string; value: string }[]>;
  formRef: Ref<YssFormilyExpose | undefined>;
  onSuccess: () => void;
}) {
  const visible = ref(false);
  const submitting = ref(false);
  const editing = ref(false);
  const editingId = ref('');
  const initialValues = ref<Record<string, any>>({});

  const schema = computed(() => createCollectorFormSchema(connectorOptions.value));

  const openCreate = () => {
    editing.value = false;
    editingId.value = '';
    initialValues.value = { mode: 'incremental', strategy: 'ignore', autoClassify: true };
    visible.value = true;
  };

  const openEdit = (row: CollectorItem) => {
    editing.value = true;
    editingId.value = row.id;
    initialValues.value = {
      name: row.name,
      connectorId: row.connectorId,
      schedule: row.schedule,
      mode: row.mode ?? 'incremental',
      strategy: row.strategy ?? 'ignore',
      autoClassify: row.autoClassify,
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
    const values = formRef.value?.getValues() as CollectorFormValues;
    if (!values) return;
    submitting.value = true;
    try {
      if (editing.value) {
        // 冻结 OpenAPI 的 PUT /api/collectors/{id} 未声明 requestBody，
        // 通过 options 透传 body（CustomRequestConfig.data）；后端 UpdateCmd 的 id 为必填
        await PutCollectorsid(editingId.value, { data: { ...values, id: editingId.value } });
        customMessage.success('任务调度已更新');
      } else {
        await PostCollectors(values);
        customMessage.success(`采集任务「${values.name}」已创建`);
      }
      visible.value = false;
      onSuccess();
    } catch {
      // 拦截器已统一提示业务/网络错误，此处不重复 message.error
    } finally {
      submitting.value = false;
    }
  };

  return { visible, submitting, editing, schema, initialValues, openCreate, openEdit, close, handleSubmit };
}
