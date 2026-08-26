/**
 * 数据源管理页 - 新增/编辑弹窗表单 Hook
 * 编辑回填由 openEdit 设置 initialValues，配合弹窗 destroy-on-close 重建表单。
 * ID 一律字符串透传（json-bigint），不做任何 Number 转换。
 */
import { computed, ref, type Ref } from 'vue';
import { PostConnectors, PutConnectorsid } from '@/api';
import { customMessage } from '@/utils';
import { createConnectorFormSchema } from '../constant';
import type { ConnectorFormValues, ConnectorItem, DatasourceCatalogItem, YssFormilyExpose } from '../type';

export function useConnectorForm({
  formRef,
  onSuccess,
}: {
  formRef: Ref<YssFormilyExpose | undefined>;
  onSuccess: () => void;
}) {
  const visible = ref(false);
  const submitting = ref(false);
  const editing = ref(false);
  const editingId = ref('');
  const initialValues = ref<Record<string, any>>({});

  /** 密码仅新建必填：编辑态 schema 通过 isEdit 派生 */
  const schema = computed(() => createConnectorFormSchema(editing.value));

  const openCreate = (catalogItem?: DatasourceCatalogItem) => {
    editing.value = false;
    editingId.value = '';
    const selectedType = catalogItem?.id || 'MySQL';
    initialValues.value = {
      type: selectedType,
      port: catalogItem?.defaultPort && catalogItem.defaultPort > 0 ? catalogItem.defaultPort : 3306,
      dialect: catalogItem?.defaultDialect || 'native',
      autoClassify: true,
    };
    visible.value = true;
  };

  const openEdit = (row: ConnectorItem) => {
    editing.value = true;
    editingId.value = row.id;
    initialValues.value = {
      name: row.name,
      type: row.type,
      host: row.host,
      port: row.port,
      dialect: row.dialect,
      username: row.username,
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
    const values = formRef.value?.getValues() as ConnectorFormValues;
    if (!values) return;
    submitting.value = true;
    try {
      if (editing.value) {
        // 冻结 OpenAPI 的 PUT /api/connectors/{id} 未声明 requestBody，
        // 通过 options 透传 body（CustomRequestConfig.data）；后端 UpdateCmd 的 id 为必填
        await PutConnectorsid(editingId.value, { data: { ...values, id: editingId.value } });
        customMessage.success('连接器配置已更新');
      } else {
        await PostConnectors(values);
        customMessage.success(`连接器「${values.name}」已创建`);
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
