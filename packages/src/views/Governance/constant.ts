/**
 * 分级分类页 - 表格列 / 枚举映射 / 操作列配置 / 表单 Schema
 * 状态/分类标签色使用 Ant Design 语义 Tag 预设（随 ConfigProvider 主题 Token 换肤），
 * 页面自定义样式仅消费 variables.less 语义 Token，禁止硬编码品牌色。
 */
import type { YTableActionConfig, YTableColumn } from '@yss-ui/components';
import type { ClassificationItem, ClassRuleItem } from './type';

/** 规则类型（冻结 OpenAPI 枚举 builtin/regex/column/dictionary） */
export const RULE_TYPE_OPTIONS = [
  { label: '内置规则', value: 'builtin' },
  { label: '正则', value: 'regex' },
  { label: '列名', value: 'column' },
  { label: '字典', value: 'dictionary' },
];

/** 规则类型 → 中文标签 */
export const getRuleTypeMeta = (type?: string): string => {
  const hit = RULE_TYPE_OPTIONS.find(item => item.value === type);
  return hit ? hit.label : type || '—';
};

/** 识别结果状态 → 中文标签 + AntD 语义 Tag 色（原型：已确认=success 待确认=warning） */
export const getResultStatusMeta = (status?: string): { label: string; color: string } => {
  switch (status) {
    case 'confirmed':
      return { label: '已确认', color: 'success' };
    case 'corrected':
      return { label: '已修正', color: 'processing' };
    case 'pending':
      return { label: '待确认', color: 'warning' };
    default:
      return { label: status || '—', color: 'default' };
  }
};

/** 候选分类 Tag 语义色（本地副本：避免跨视图 import Asset 模块常量，F4 复审修复；与 Asset 页口径一致） */
export const getClassificationMeta = (classification?: string): { label: string; color: string } => {
  switch (classification) {
    case '敏感-PII':
      return { label: '敏感-PII', color: 'red' };
    case '受限':
      return { label: '受限', color: 'orange' };
    case '内部':
      return { label: '内部', color: 'green' };
    default:
      return { label: classification || '待识别', color: classification ? 'green' : 'default' };
  }
};

/** 识别规则表格列（类型/启用经插槽渲染；修正经 action-config） */
export const RULE_COLUMNS: YTableColumn[] = [
  { type: 'seq', title: '序号', width: 64, align: 'center' },
  { field: 'name', title: '规则名称', minWidth: 160 },
  { field: 'type', title: '类型', width: 110, align: 'center' },
  { field: 'pattern', title: '匹配模式', minWidth: 200 },
  { field: 'enabled', title: '启用', width: 90, align: 'center' },
];

/** 识别结果表格列（候选分类/状态经插槽渲染；操作经 action-config） */
export const RESULT_COLUMNS: YTableColumn[] = [
  { field: 'assetName', title: '资产', minWidth: 180 },
  { field: 'columnName', title: '字段', minWidth: 140 },
  { field: 'name', title: '候选分类', width: 120, align: 'center' },
  { field: 'level', title: '敏感等级', width: 110, align: 'center' },
  { field: 'status', title: '状态', width: 100, align: 'center' },
];

export interface RuleActionHandlers {
  onCorrect: (row: ClassRuleItem) => void;
}

/** 规则操作列配置（YTable :action-config；修正=预填表单新建修正副本，后端 configure 为新增/修正合一 POST） */
export const createRuleActionConfig = (handlers: RuleActionHandlers): YTableActionConfig => ({
  width: 90,
  align: 'left',
  fixed: 'right',
  displayLimit: 2,
  moreRenderType: 'moreButton',
  buttons: [
    {
      key: 'correct',
      text: '修正',
      type: 'link',
      clickFn: ({ row }) => handlers.onCorrect(row),
    },
  ],
});

export interface ResultActionHandlers {
  onConfirm: (row: ClassificationItem) => void;
  onCorrect: (row: ClassificationItem) => void;
  onPropagate: (row: ClassificationItem) => void;
  /** 传播进行中判定（全局传播中禁用行传播按钮防重复触发，状态矩阵「传播中」要求） */
  isPropagating?: (row: ClassificationItem) => boolean;
}

/** 识别结果操作列配置（确认幂等：已确认/已修正禁用；传播按行触发） */
export const createResultActionConfig = (handlers: ResultActionHandlers): YTableActionConfig => ({
  width: 200,
  align: 'left',
  fixed: 'right',
  displayLimit: 3,
  moreRenderType: 'moreButton',
  buttons: [
    {
      key: 'confirm',
      text: '确认',
      type: 'link',
      disabledFn: ({ row }) => row.status === 'confirmed' || row.status === 'corrected',
      clickFn: ({ row }) => handlers.onConfirm(row),
    },
    {
      key: 'correct',
      text: '修正',
      type: 'text',
      clickFn: ({ row }) => handlers.onCorrect(row),
    },
    {
      key: 'propagate',
      text: '传播',
      type: 'text',
      disabledFn: ({ row }) => handlers.isPropagating?.(row) ?? false,
      clickFn: ({ row }) => handlers.onPropagate(row),
    },
  ],
});

/** 新增/修正分类规则表单 Schema（YssFormily JSON Schema；冻结 spec 未声明 body，经 options.data 透传） */
export const createRuleFormSchema = (): Record<string, any> => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical', labelWidth: 120, labelAlign: 'right' },
      properties: {
        name: {
          type: 'string',
          title: '规则名称',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': { placeholder: '例如：手机号正则' },
        },
        type: {
          type: 'string',
          title: '规则类型',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: RULE_TYPE_OPTIONS,
          'x-component-props': { placeholder: '请选择规则类型' },
        },
        pattern: {
          type: 'string',
          title: '匹配模式',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': { placeholder: '正则表达式 / 列名关键字 / 字典引用（逗号分隔）' },
        },
        enabled: {
          type: 'boolean',
          title: '启用',
          'x-decorator': 'FormItem',
          'x-component': 'Switch',
          default: true,
        },
      },
    },
  },
});
