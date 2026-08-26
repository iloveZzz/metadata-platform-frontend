import type { ISchema } from '@yss-ui/components';

export const GRADE_FORM_SCHEMA: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': {
        layout: 'vertical',
      },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': {
            maxColumns: 2,
            minColumns: 2,
          },
          properties: {
            gradeName: {
              type: 'string',
              title: '分级名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': {
                placeholder: '支持中文、字母、数字或下划线，不超过128字符',
                maxLength: 128,
              },
            },
            gradeCode: {
              type: 'string',
              title: '分级缩写',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': {
                placeholder: '支持中文、字母、数字或下划线，不超过64字符 (如 L1~L10)',
                maxLength: 64,
              },
            },
            sensitivityScore: {
              type: 'number',
              title: '敏感程度 (1~100)',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'InputNumber',
              'x-component-props': {
                min: 1,
                max: 100,
                precision: 0,
                style: { width: '100%' },
                placeholder: '请输入 1~100 的整数',
              },
            },
            colorTag: {
              type: 'string',
              title: 'UI标签色彩',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: [
                { label: '红色 (高危)', value: 'red' },
                { label: '橙色 (敏感)', value: 'orange' },
                { label: '蓝色 (受限)', value: 'blue' },
                { label: '绿色 (公开)', value: 'green' },
                { label: '紫色 (绝密)', value: 'purple' },
              ],
              default: 'blue',
            },
            description: {
              type: 'string',
              title: '分级描述',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                gridSpan: 2,
              },
              'x-component': 'Input.TextArea',
              'x-component-props': {
                rows: 3,
                maxLength: 2048,
                placeholder: '数据分级的描述，支持中文、字母、数字或下划线，不超过2048个字符',
              },
            },
          },
        },
      },
    },
  },
};
