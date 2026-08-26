/**
 * 资产详情页 - 表格列 / 状态映射
 * 状态标签色使用 Ant Design 语义 Tag 预设（随 ConfigProvider 主题 Token 换肤）。
 * 分类 Tag 色复用资产目录模块 getClassificationMeta。
 */
import type { YTableColumn } from '@yss-ui/components';

/** 资产类型 Tag 色（table/column/view） */
export const getDetailTypeColor = (type?: string): string => {
  switch (type) {
    case 'table':
      return 'blue';
    case 'column':
      return 'cyan';
    case 'view':
      return 'purple';
    default:
      return 'default';
  }
};

/** 资产状态 -> 中文标签 + AntD 语义 Tag 色（状态矩阵：待认领/已认领/已归档/已删除；归档/删除只读） */
export const getAssetStatusMeta = (status?: string): { label: string; color: string } => {
  switch (status) {
    case 'archived':
      return { label: '已归档（只读）', color: 'default' };
    case 'deleted':
      return { label: '已删除（只读）', color: 'default' };
    default:
      return { label: '活跃', color: 'blue' };
  }
};

/** 字段清单表格列（详情聚合 columns） */
export const FIELD_COLUMNS: YTableColumn[] = [
  { field: 'ordinalPosition', title: '序号', width: 70, align: 'center' },
  { field: 'name', title: '字段名', minWidth: 160 },
  { field: 'type', title: '类型', width: 140 },
  { field: 'comment', title: '注释', minWidth: 220 },
  { field: 'pk', title: '主键', width: 80, align: 'center' },
  { field: 'classification', title: '分类', width: 120, align: 'center' },
  { field: 'actions', title: '操作', width: 130, align: 'center', fixed: 'right' },
];

/** 变更记录表格列（详情聚合 versions；后端 AssetVersionVO 暴露 version/schemaDiff/createdAt） */
export const VERSION_COLUMNS: YTableColumn[] = [
  { field: 'version', title: '版本', width: 90, align: 'center' },
  { field: 'schemaDiff', title: '变更内容', minWidth: 260 },
  { field: 'createdAt', title: '时间', width: 180 },
];
