import type { ISchema } from '@yss-ui/components';

/**
 * 识别规则新建/编辑 Formily 表单 Schema
 * 严格遵循 yss-formily 规范：FormLayout -> FormGrid -> 字段 / 插槽
 */
export function createRecognitionRuleFormSchema(): ISchema {
  return {
    type: 'object',
    properties: {
      layout: {
        type: 'void',
        'x-component': 'FormLayout',
        'x-component-props': {
          layout: 'vertical',
          labelAlign: 'left',
          size: 'middle',
        },
        properties: {
          // 1. 基础配置区块
          basicSection: {
            type: 'void',
            'x-component': 'GroupHeader',
            'x-component-props': {
              title: '基础配置',
            },
          },
          basicGrid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': {
              maxColumns: 2,
              minColumns: 1,
              columnGap: 20,
              rowGap: 16,
            },
            properties: {
              ruleName: {
                type: 'string',
                title: '识别规则名称',
                required: true,
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  gridSpan: 1,
                },
                'x-component': 'Input',
                'x-component-props': {
                  placeholder: '包含中文、字母、数字、下划线，不超过12个字符',
                  maxLength: 12,
                  showCount: true,
                },
                'x-validator': [
                  { required: true, message: '请输入识别规则名称' },
                  { max: 12, message: '不超过12个字符' },
                ],
              },
              priority: {
                type: 'number',
                title: '优先级 (1-100)',
                default: 10,
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  gridSpan: 1,
                },
                'x-component': 'InputNumber',
                'x-component-props': {
                  min: 1,
                  max: 100,
                  placeholder: '10',
                  style: { width: '100%' },
                },
              },
              description: {
                type: 'string',
                title: '识别规则说明',
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  gridSpan: 2,
                },
                'x-component': 'Input.TextArea',
                'x-component-props': {
                  placeholder: '自定义识别规则备注信息。不超过128个字符。',
                  rows: 3,
                  maxLength: 128,
                  showCount: true,
                },
              },
            },
          },

          // 2. 数据分类分级区块
          categorySection: {
            type: 'void',
            'x-component': 'GroupHeader',
            'x-component-props': {
              title: '数据分类分级',
            },
          },
          categoryGrid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': {
              maxColumns: 1,
            },
            properties: {
              categoryScopeMode: {
                title: '设置数据分类',
                required: true,
                default: 'ALL',
                'x-decorator': 'FormItem',
                'x-component': 'Slot',
                'x-component-props': {
                  name: 'categoryScopeMode',
                },
                'x-validator': [{ required: true, message: '请选择数据分类圈选模式' }],
              },
              categoryDynamicSlot: {
                type: 'void',
                'x-component': 'Slot',
                'x-component-props': {
                  name: 'categoryDynamicSlot',
                },
              },
            },
          },

          // 3. 扫描范围区块
          scanSection: {
            type: 'void',
            'x-component': 'GroupHeader',
            'x-component-props': {
              title: '扫描范围',
            },
          },
          scanGrid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': {
              maxColumns: 1,
            },
            properties: {
              scanSourceType: {
                title: '数据来源类型',
                required: true,
                default: 'DATASOURCE',
                'x-decorator': 'FormItem',
                'x-component': 'Slot',
                'x-component-props': {
                  name: 'scanSourceType',
                },
                'x-validator': [{ required: true, message: '请选择数据来源类型' }],
              },
              scanDynamicSlot: {
                type: 'void',
                'x-component': 'Slot',
                'x-component-props': {
                  name: 'scanDynamicSlot',
                },
              },
            },
          },
        },
      },
    },
  };
}
