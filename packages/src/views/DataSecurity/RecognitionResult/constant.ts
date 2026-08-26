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

export const getGradeTagStyle = (code?: string, score?: number) => {
  if (code === 'L5' || (score && score >= 90)) {
    return { color: '#cf1322', bg: '#fff1f0', border: '#ffa39e', label: 'L5' };
  }
  if (code === 'L4' || (score && score >= 70)) {
    return { color: '#d4380d', bg: '#fff2e8', border: '#ffbb96', label: 'L4' };
  }
  if (code === 'L3' || (score && score >= 50)) {
    return { color: '#d46b08', bg: '#fff7e6', border: '#ffd591', label: 'L3' };
  }
  if (code === 'L2' || (score && score >= 30)) {
    return { color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f', label: 'L2' };
  }
  return { color: '#096dd9', bg: '#e6f7ff', border: '#91d5ff', label: 'L1' };
};

export const RECOGNITION_METHOD_MAP: Record<string, { label: string; color: string }> = {
  AUTO: { label: '自动识别', color: 'default' },
  MANUAL: { label: '手动指定', color: 'blue' },
  LINEAGE: { label: '基于血缘自动继承', color: 'purple' },
};

export const formatDateTimeStr = (value?: string) => {
  if (!value) return '';
  return value.replace('T', ' ').replace(/\.\d+.*$/, '');
};
