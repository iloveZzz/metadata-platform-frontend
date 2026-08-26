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

export const getPriorityTagColor = (p?: number) => {
  if (p === 1) return '#ff4d4f';
  if (p === 2) return '#fa8c16';
  if (p === 3) return '#faad14';
  if (p === 4) return '#1890ff';
  return '#8c8c8c';
};

export const getGradeTagStyle = (score?: number, code?: string) => {
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

export const formatDirPath = (row: DataCategoryVO) => {
  if (row.treeNodeName) return `/${row.treeNodeName}`;
  return '/全部分类';
};
