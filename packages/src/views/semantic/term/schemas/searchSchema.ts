/**
 * 术语管理页 - 查询区 YssFormily schema（schema 驱动，ysss-components §4）
 * 字段：keyword / status / onlyCertified（原型筛选栏）；触发按钮在页面层
 * （formRef.getValues() / setValues() 驱动，与 Collector 表单模式一致）。
 */
import type { TermFilter, TermStatusValue } from '../type';

export interface SearchSchemaValues {
  keyword?: string;
  status?: TermStatusValue;
  onlyCertified?: boolean;
}

/** 查询区初始值 */
export const SEARCH_INITIAL_VALUES: SearchSchemaValues = {
  keyword: '',
  status: undefined,
  onlyCertified: false,
};

/**
 * 构建查询区 schema
 * @param statusOptions 状态选项（由常量注入，避免 schema 文件内硬编码）
 */
export const createSearchSchema = (statusOptions: { label: string; value: TermStatusValue }[]) => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'inline' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 3, minColumns: 1, minWidth: 240, columnGap: 16, rowGap: 0 },
          properties: {
            keyword: {
              type: 'string',
              title: '关键词',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': {
                placeholder: '搜索术语名称 / 别名',
                allowClear: true,
                style: { width: 240 },
              },
              'x-decorator-props': { gridSpan: 1 },
            },
            status: {
              type: 'string',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: statusOptions,
              'x-component-props': {
                placeholder: '全部',
                allowClear: true,
                style: { width: 140 },
              },
              'x-decorator-props': { gridSpan: 1 },
            },
            onlyCertified: {
              type: 'boolean',
              title: '仅看已认证',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-decorator-props': { gridSpan: 1, labelCol: 8 },
            },
          },
        },
      },
    },
  },
});

/** 从 YssFormily 表单值收敛为查询条件（空值归一化，页面不处理脏数据） */
export const normalizeSearchValues = (values: SearchSchemaValues): TermFilter => ({
  keyword: values.keyword?.trim() || undefined,
  status: values.status || undefined,
  onlyCertified: values.onlyCertified || undefined,
});
