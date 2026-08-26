/**
 * 影响分析页 - 表格列 / 枚举映射
 * 状态/风险标签色使用 Ant Design 语义 Tag 预设（随 ConfigProvider 主题 Token 换肤），
 * 页面自定义样式仅消费 variables.less 语义 Token，禁止硬编码品牌色。
 */
import type { YTableColumn } from '@yss-ui/components';
import type {
  GetAssetsidImpactanalysisExportFormat,
  GetAssetsidImpactanalysisSortBy,
} from '@/api/generated/metadata/schemas';

/** 影响分析排序（冻结 OpenAPI 枚举 depth/domain/risk，默认 depth；深度分组内按 sortBy 排序） */
export const IMPACT_SORT_OPTIONS: { label: string; value: GetAssetsidImpactanalysisSortBy }[] = [
  { label: '按影响深度', value: 'depth' },
  { label: '按数据域', value: 'domain' },
  { label: '按风险等级', value: 'risk' },
];

/** 导出格式（冻结 OpenAPI 枚举 csv/json，默认 csv） */
export const EXPORT_FORMAT_OPTIONS: { label: string; value: GetAssetsidImpactanalysisExportFormat }[] = [
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' },
];

/** 风险等级 → 中文标签 + AntD 语义 Tag 色（原型：高=red 中=orange 低=green） */
export const getImpactRiskMeta = (risk?: string): { label: string; color: string } => {
  switch (risk) {
    case 'high':
      return { label: '高', color: 'red' };
    case 'medium':
      return { label: '中', color: 'orange' };
    case 'low':
      return { label: '低', color: 'green' };
    default:
      return { label: risk || '—', color: 'default' };
  }
};

/** 影响深度 → 中文标签 + AntD 语义 Tag 色（原型：直接=volcano 间接=geekblue） */
export const getImpactDepthMeta = (depth?: number): { label: string; color: string } => {
  if (!depth || depth <= 1) return { label: '直接', color: 'volcano' };
  return { label: `间接 ${depth - 1} 跳`, color: 'geekblue' };
};

/** 影响分析结果表格列（下游资产/影响深度/类型/数据域/风险/分类） */
export const IMPACT_COLUMNS: YTableColumn[] = [
  { field: 'name', title: '下游资产', minWidth: 200 },
  { field: 'depth', title: '影响深度', width: 120, align: 'center' },
  { field: 'type', title: '类型', width: 90, align: 'center' },
  { field: 'domain', title: '数据域', minWidth: 110 },
  { field: 'risk', title: '风险', width: 90, align: 'center' },
  { field: 'classification', title: '分类', minWidth: 110, align: 'center' },
];
