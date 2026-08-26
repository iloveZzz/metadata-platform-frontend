import type { YTableColumn } from '@yss-ui/components';
import type { DataCategoryVO } from '@/api/generated/data-security/schemas';

export const CATEGORY_COLUMNS: YTableColumn[] = [
  { title: '数据分类/描述', field: 'categoryName', minWidth: 260, slots: { default: 'categoryName' } },
  { title: '分类缩写', field: 'categoryCode', width: 140, align: 'center', slots: { default: 'categoryCode' } },
  {
    title: '数据分级',
    field: 'securityGradeName',
    width: 120,
    align: 'center',
    slots: { default: 'securityGradeName' },
  },
  {
    title: '优先级',
    field: 'priority',
    width: 100,
    align: 'center',
    slots: { title: 'priorityTitle', default: 'priority' },
  },
  { title: '生效字段数', field: 'activeFields', width: 120, align: 'center', slots: { default: 'activeFields' } },
  {
    title: '生效状态',
    field: 'status',
    width: 110,
    align: 'center',
    slots: { title: 'statusTitle', default: 'status' },
  },
  { title: '操作', field: 'action', width: 140, align: 'center', fixed: 'right', slots: { default: 'action' } },
];

/**
 * 优先级 Tag 预设颜色（Ant Design 语义预设状态）
 */
export const getPriorityTagColor = (p?: number): string => {
  if (p === 1) return 'error';
  if (p === 2) return 'warning';
  if (p === 3) return 'orange';
  if (p === 4) return 'processing';
  return 'default';
};

/**
 * 数据分级 Tag 动态 Token 样式（使用 CSS 变量与 color-mix，消除硬编码十六进制）
 */
export const getGradeTagStyle = (score?: number, code?: string) => {
  if (code === 'L5' || (score && score >= 90)) {
    return {
      color: 'var(--error-color, #f5222d)',
      bg: 'color-mix(in srgb, var(--error-color, #f5222d) 10%, transparent)',
      border: 'color-mix(in srgb, var(--error-color, #f5222d) 30%, transparent)',
      label: 'L5',
    };
  }
  if (code === 'L4' || (score && score >= 70)) {
    return {
      color: '#d4380d',
      bg: 'color-mix(in srgb, #d4380d 10%, transparent)',
      border: 'color-mix(in srgb, #d4380d 30%, transparent)',
      label: 'L4',
    };
  }
  if (code === 'L3' || (score && score >= 50)) {
    return {
      color: 'var(--warning-color, #faad14)',
      bg: 'color-mix(in srgb, var(--warning-color, #faad14) 10%, transparent)',
      border: 'color-mix(in srgb, var(--warning-color, #faad14) 30%, transparent)',
      label: 'L3',
    };
  }
  if (code === 'L2' || (score && score >= 30)) {
    return {
      color: 'var(--success-color, #52c41a)',
      bg: 'color-mix(in srgb, var(--success-color, #52c41a) 10%, transparent)',
      border: 'color-mix(in srgb, var(--success-color, #52c41a) 30%, transparent)',
      label: 'L2',
    };
  }
  return {
    color: 'var(--primary-color, #3371ff)',
    bg: 'color-mix(in srgb, var(--primary-color, #3371ff) 10%, transparent)',
    border: 'color-mix(in srgb, var(--primary-color, #3371ff) 30%, transparent)',
    label: 'L1',
  };
};

export const formatDirPath = (row: DataCategoryVO) => {
  if (row.treeNodeName) return `/${row.treeNodeName}`;
  return '/全部分类';
};
