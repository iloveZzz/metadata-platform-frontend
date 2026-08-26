/**
 * 血缘图谱页 - 常量 / 枚举映射
 * 边线样式（实线=自动解析置信度；虚线=人工/低置信，原型图例）与节点角色色（中心=主色、
 * 上游=成功语义绿、下游=警告语义黄）均消费主题语义 Token（variables.less 运行时同步），
 * 禁止硬编码品牌色；角色方向色为原型语义映射（中心资产高亮），随主题 Token 换肤。
 */
import type {
  GetAssetsidLineageConfidence,
  LineageManualRequestConfidence,
  LineageManualRequestType,
} from '@/api/generated/metadata/schemas';

/** confidence 筛选选项（冻结 OpenAPI 枚举 all/auto-high/auto-mid/manual-high/low，默认 all） */
export const CONFIDENCE_FILTER_OPTIONS: { label: string; value: GetAssetsidLineageConfidence }[] = [
  { label: '全部', value: 'all' },
  { label: '自动-高', value: 'auto-high' },
  { label: '自动-中', value: 'auto-mid' },
  { label: '人工-高', value: 'manual-high' },
  { label: '低置信来源', value: 'low' },
];

/** 置信度 → 中文文案 + 边线样式（实线=自动解析；虚线=人工/低置信；契约 build_architecture_checklist 置信度显式标识） */
export const getConfidenceMeta = (confidence?: string): { label: string; dashed: boolean } => {
  switch (confidence) {
    case 'auto-high':
      return { label: '自动-高', dashed: false };
    case 'auto-mid':
      return { label: '自动-中', dashed: false };
    case 'manual-high':
      return { label: '人工-高', dashed: true };
    case 'low':
      return { label: '低置信来源', dashed: true };
    default:
      return { label: confidence || '未知', dashed: true };
  }
};

/** 补录血缘类型（冻结 OpenAPI 枚举 sql/job/manual；交互说明：人工来源置信度=人工-高） */
export const LINEAGE_TYPE_OPTIONS: { label: string; value: LineageManualRequestType }[] = [
  { label: 'SQL', value: 'sql' },
  { label: '作业', value: 'job' },
  { label: '人工', value: 'manual' },
];

/** 补录置信度（冻结 OpenAPI 枚举；人工补录默认 manual-high） */
export const LINEAGE_CONFIDENCE_OPTIONS: { label: string; value: LineageManualRequestConfidence }[] = [
  { label: '自动-高', value: 'auto-high' },
  { label: '自动-中', value: 'auto-mid' },
  { label: '人工-高', value: 'manual-high' },
  { label: '低置信来源', value: 'low' },
];

/** 补录编辑器初始值（交互说明：类型默认人工、置信度默认人工-高） */
export const LINEAGE_EDITOR_INITIAL_VALUES: {
  type: LineageManualRequestType;
  confidence: LineageManualRequestConfidence;
} = {
  type: 'manual',
  confidence: 'manual-high',
};

/** 图谱画布布局常量（后端 findGraph 返回中心资产 1-hop 邻域：星型布局，中心中列/上游左列/下游右列） */
export const GRAPH_LAYOUT = {
  /** 画布宽度 */
  width: 900,
  /** 画布高度基准 */
  baseHeight: 420,
  /** 侧列节点垂直间距（每行） */
  rowGap: 64,
  /** 中心列 X */
  centerX: 450,
  /** 上/下游侧列 X（右侧对称：width - sideX） */
  sideX: 150,
  /** 侧列顶部/底部留白 */
  sidePadding: 70,
  /** 节点圆半径（SVG） */
  nodeRadius: 16,
};

/** 人工补录编辑器表单 Schema（YssFormily JSON Schema；上游/下游远程搜索经 scope 回调，yss-formily） */
export const createLineageEditorSchema = (): Record<string, any> => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical', labelWidth: 120, labelAlign: 'right' },
      properties: {
        fromAssetId: {
          type: 'string',
          title: '源资产（上游）',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            showSearch: true,
            filterOption: false,
            placeholder: '搜索并选择上游资产（表）',
            onSearch: '{{ searchUpstream }}',
          },
        },
        toAssetId: {
          type: 'string',
          title: '目标资产（下游）',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            showSearch: true,
            filterOption: false,
            placeholder: '搜索并选择下游资产（表）',
            onSearch: '{{ searchDownstream }}',
          },
        },
        type: {
          type: 'string',
          title: '血缘类型',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: LINEAGE_TYPE_OPTIONS,
          'x-component-props': { placeholder: '请选择血缘类型' },
        },
        confidence: {
          type: 'string',
          title: '置信度',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: LINEAGE_CONFIDENCE_OPTIONS,
          'x-component-props': { placeholder: '请选择置信度' },
        },
        remark: {
          type: 'string',
          title: '备注（补录依据）',
          'x-decorator': 'FormItem',
          'x-component': 'Input.TextArea',
          'x-component-props': { rows: 3, placeholder: '例如：来自存储过程 SP_DAILY 的间接依赖' },
        },
      },
    },
  },
});
