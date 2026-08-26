import type { ISchema } from '@yss-ui/components';

export function createCategoryNodeSchema(): ISchema {
  return {
    type: 'object',
    properties: {
      layout: {
        type: 'void',
        'x-component': 'FormLayout',
        'x-component-props': {
          layout: 'vertical',
          size: 'middle',
        },
        properties: {
          nodeName: {
            type: 'string',
            title: '目录节点名称',
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              placeholder: '例如：个人信息 / 账户与交易凭证',
              maxLength: 256,
              allowClear: true,
            },
            'x-validator': [{ required: true, message: '请填写目录节点名称' }],
          },
          visibility: {
            type: 'string',
            title: '可见范围与访问控制',
            required: true,
            default: 'PUBLIC',
            'x-decorator': 'FormItem',
            'x-component': 'Radio.Group',
            'x-component-props': {
              options: [
                { label: '公开查看 (全员可读)', value: 'PUBLIC' },
                { label: '仅管理员可见 (敏感机密)', value: 'ADMIN_ONLY' },
              ],
            },
          },
          admins: {
            type: 'array',
            title: '目录管理员',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            'x-component-props': {
              mode: 'tags',
              placeholder: '输入管理员用户名，如 sec_admin',
              allowClear: true,
            },
          },
          description: {
            type: 'string',
            title: '目录描述',
            'x-decorator': 'FormItem',
            'x-component': 'Input.TextArea',
            'x-component-props': {
              rows: 3,
              maxLength: 512,
              showCount: true,
              placeholder: '说明该分类目录适用的业务领域与治理范围...',
            },
          },
        },
      },
    },
  };
}
