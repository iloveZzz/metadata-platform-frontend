/**
 * 资产目录 / 元数据清单页 - 常量配置与数据字典
 * 严格对齐高保真原型截图与 Ant Design 企业级设计规范
 */
import type { YTableColumn } from '@yss-ui/components';

/** 顶部 Tab 选项（数据表） */
export const METADATA_TABS = [{ key: 'data_table', label: '数据表' }];

/** 左侧树视角选项（数据源视角与来源系统视角） */
export const PERSPECTIVE_OPTIONS = [
  {
    value: 'datasource',
    label: '数据源视角',
    shortLabel: '数据源视角',
    desc: '按照采集配置的来源数据源浏览与检索',
    placeholder: '请输入数据源名称',
  },
  {
    value: 'source_system',
    label: '来源系统视角',
    shortLabel: '来源系统视角',
    desc: '按照数据归属的来源系统查看元数据',
    placeholder: '请输入来源系统名称',
  },
];

/** 元数据清单表格标准 8 列定义（严格对齐最新截图） */
export const METADATA_COLUMNS: YTableColumn[] = [
  { field: 'name', title: '元数据名称/描述', minWidth: 240 },
  { field: 'source', title: '采集数据源', minWidth: 220 },
  { field: 'sourceSystem', title: '来源系统', width: 140 },
  { field: 'type', title: '元数据类型', width: 110 },
  { field: 'version', title: '最新版本', width: 130 },
  { field: 'collectorName', title: '采集任务', width: 150 },
  { field: 'updateFrequency', title: '更新频率', width: 130 },
  { field: 'action', title: '操作', width: 100, fixed: 'right', align: 'center' },
];

/** 兼容旧版 ASSET_COLUMNS */
export const ASSET_COLUMNS = METADATA_COLUMNS;

/** 分级分类 Tag 语义映射 */
export const getClassificationMeta = (classification?: string): { label: string; color: string } => {
  switch (classification) {
    case '敏感-PII':
      return { label: '敏感-PII', color: 'red' };
    case '受限':
      return { label: '受限', color: 'orange' };
    case '内部':
      return { label: '内部', color: 'green' };
    default:
      return { label: classification || '内部', color: 'green' };
  }
};
