/**
 * 集成配置页 - 表单 Schema / 状态元数据
 * 状态标签色使用 Ant Design 语义 Tag 预设（随 ConfigProvider 主题 Token 换肤），
 * 页面自定义样式仅消费 variables.less 语义 Token，禁止硬编码品牌色。
 */

/** Gravitino 上游配置表单（YssFormily JSON Schema；认证令牌留空表示不修改） */
export const GRAVITINO_FORM_SCHEMA: Record<string, any> = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical', labelWidth: 110, labelAlign: 'left' },
      properties: {
        endpoint: {
          type: 'string',
          title: '端点地址',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': { placeholder: 'https://gravitino.internal:8090' },
        },
        authToken: {
          type: 'string',
          title: '认证令牌',
          'x-decorator': 'FormItem',
          'x-component': 'Password',
          'x-component-props': { placeholder: '留空表示不修改' },
        },
        enabled: {
          type: 'boolean',
          title: '启用 Gravitino 上游',
          'x-decorator': 'FormItem',
          'x-component': 'Switch',
        },
      },
    },
  },
};

/** DataHub 导出目标表单（YssFormily JSON Schema；认证令牌留空表示不修改） */
export const DATAHUB_FORM_SCHEMA: Record<string, any> = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical', labelWidth: 110, labelAlign: 'left' },
      properties: {
        endpoint: {
          type: 'string',
          title: 'DataHub 目标地址',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': { placeholder: 'https://datahub.internal:9002' },
        },
        authToken: {
          type: 'string',
          title: '认证令牌',
          'x-decorator': 'FormItem',
          'x-component': 'Password',
          'x-component-props': { placeholder: '留空表示不修改' },
        },
      },
    },
  },
};

/** 导出任务状态 -> 中文标签 + AntD 语义 Tag 色 */
export const EXPORT_TASK_STATUS_OPTIONS: { label: string; value: string; color: string }[] = [
  { label: '待执行', value: 'pending', color: 'default' },
  { label: '执行中', value: 'running', color: 'processing' },
  { label: '成功', value: 'success', color: 'success' },
  { label: '失败', value: 'failed', color: 'error' },
];

export const getExportTaskStatusMeta = (status?: string): { label: string; color: string } => {
  const hit = EXPORT_TASK_STATUS_OPTIONS.find(item => item.value === status);
  return hit ? { label: hit.label, color: hit.color } : { label: status || '—', color: 'default' };
};
