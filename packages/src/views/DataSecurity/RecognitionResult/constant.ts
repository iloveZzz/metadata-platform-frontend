import type { YTableColumn } from '@yss-ui/components';

export const RECOGNITION_RESULT_COLUMNS: YTableColumn[] = [
  { type: 'checkbox', width: 48, fixed: 'left', align: 'center' },
  {
    title: '表',
    field: 'tableName',
    minWidth: 160,
    slots: { default: 'tableName' },
  },
  {
    title: '字段',
    field: 'fieldName',
    minWidth: 110,
    slots: { default: 'fieldName' },
  },
  {
    title: '资产来源',
    field: 'assetSourceInfo',
    minWidth: 170,
    slots: { title: 'assetSourceTitle', default: 'assetSourceInfo' },
  },
  {
    title: '数据分类',
    field: 'categoryName',
    minWidth: 150,
    slots: { default: 'categoryName' },
  },
  {
    title: '数据分级',
    field: 'securityGradeName',
    width: 80,
    align: 'center',
    slots: { default: 'securityGradeName' },
  },
  {
    title: '脱敏生效状态',
    field: 'maskingStatus',
    width: 150,
    align: 'center',
    slots: { title: 'maskingStatusTitle', default: 'maskingStatus' },
  },
  {
    title: '识别方式',
    field: 'recognitionMethod',
    width: 110,
    align: 'center',
    slots: { default: 'recognitionMethod' },
  },
  {
    title: '操作',
    field: 'action',
    width: 130,
    align: 'center',
    fixed: 'right',
    slots: { default: 'action' },
  },
];

/**
 * 数据分级 Tag 动态 Token 样式（使用 CSS 变量与 color-mix，消除硬编码十六进制）
 */
export const getGradeTagStyle = (code?: string, score?: number) => {
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

export const RECOGNITION_METHOD_MAP: Record<string, { label: string; color: string }> = {
  AUTO: { label: '自动识别', color: 'default' },
  MANUAL: { label: '手动指定', color: 'processing' },
  LINEAGE: { label: '基于血缘自动继承', color: 'purple' },
};

export const formatDateTimeStr = (value?: string) => {
  if (!value) return '';
  return value.replace('T', ' ').replace(/\.\d+.*$/, '');
};
