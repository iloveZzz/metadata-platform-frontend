import type { ISchema } from '@yss-ui/components';

export function createCategoryFormSchema(
  grades: Array<{ label: string; value: number }>,
  features: Array<{ label: string; value: string; desc?: string }> = []
): ISchema {
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
          // 1. 基本信息区块
          basicSection: {
            type: 'void',
            'x-component': 'GroupHeader',
            'x-component-props': {
              title: '基本信息',
            },
          },
          basicGrid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': {
              maxColumns: 2,
              minColumns: 1,
            },
            properties: {
              categoryName: {
                type: 'string',
                title: '分类名称',
                required: true,
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  gridSpan: 2,
                },
                'x-component': 'Input',
                'x-component-props': {
                  placeholder: '请输入分类名称',
                  maxLength: 512,
                  allowClear: true,
                },
                'x-validator': [{ required: true, message: '请输入分类名称' }],
              },
              categoryCode: {
                type: 'string',
                title: '分类缩写',
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  gridSpan: 2,
                },
                'x-component': 'Input',
                'x-component-props': {
                  placeholder: '请输入分类缩写，例如 NAME / PHONE (可选)',
                  maxLength: 128,
                  allowClear: true,
                },
              },
              description: {
                type: 'string',
                title: '分类描述',
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  gridSpan: 2,
                },
                'x-component': 'Input.TextArea',
                'x-component-props': {
                  rows: 3,
                  maxLength: 2048,
                  showCount: true,
                  placeholder: '请输入分类描述...',
                },
              },
              treeNodeId: {
                title: '所属目录',
                required: true,
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  gridSpan: 2,
                },
                'x-component': 'Slot',
                'x-component-props': {
                  name: 'treeSelect',
                },
                'x-validator': [{ required: true, message: '请选择所属目录' }],
              },
            },
          },

          // 2. 分级信息区块
          gradeSection: {
            type: 'void',
            'x-component': 'GroupHeader',
            'x-component-props': {
              title: '分级信息',
            },
          },
          gradeGrid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': {
              maxColumns: 1,
            },
            properties: {
              securityGradeId: {
                title: '数据分级',
                required: true,
                'x-decorator': 'FormItem',
                'x-component': 'Select',
                'x-component-props': {
                  placeholder: '请选择数据分级',
                  options: grades,
                  allowClear: true,
                },
                'x-validator': [{ required: true, message: '请选择数据分级' }],
              },
            },
          },

          // 3. 扫描方式区块
          scanSection: {
            type: 'void',
            'x-component': 'GroupHeader',
            'x-component-props': {
              title: '扫描方式',
              tooltip: '若未配置扫描方式，则后续识别规则不能自动扫描，需手动指定',
            },
          },
          scanGrid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': {
              maxColumns: 1,
            },
            properties: {
              recognitionFeatures: {
                type: 'array',
                title: '识别特征',
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  extra: '最多可以选择20个识别特征，多个特征之间为“或”的关系',
                },
                'x-component': 'Select',
                'x-component-props': {
                  mode: 'multiple',
                  maxTagCount: 4,
                  placeholder: '请选择识别特征',
                  options: features,
                  allowClear: true,
                },
              },
              priority: {
                type: 'number',
                title: '优先级',
                required: true,
                default: 3,
                'x-decorator': 'FormItem',
                'x-decorator-props': {
                  extra: '当字段命中多条规则时，优先采纳优先级数字更小 (1最高) 的分类结果',
                },
                'x-component': 'Select',
                'x-component-props': {
                  placeholder: '请选择优先级',
                  options: [
                    { label: '1 (最高级)', value: 1 },
                    { label: '2 (较高级)', value: 2 },
                    { label: '3 (中级)', value: 3 },
                    { label: '4 (较低级)', value: 4 },
                    { label: '5 (最低级)', value: 5 },
                  ],
                },
                'x-validator': [{ required: true, message: '请选择优先级' }],
              },
            },
          },
        },
      },
    },
  };
}
