/**
 * 资产目录 / 元数据清单页 - 模块私有类型
 * 字段对齐高保真原型截图与 OpenAPI 资产数据结构。
 */

/** 资产类型（表 / 视图 / 字段 / 存储过程） */
export type AssetType = 'table' | 'column' | 'view' | string;

/** 顶部主 Tab 标签类型 */
export type MetadataTabKey = 'metadata_list' | 'data_table';

/** 左侧分类树视角 */
export type PerspectiveType = 'datasource' | 'source_system';

/** 来源系统/数据源树节点 */
export interface SourceSystemTreeNode {
  id: string | number;
  key: string | number;
  title: string;
  name: string;
  count?: number;
  nodeType?: 'root' | 'category' | 'connector' | 'datasource' | 'database' | 'system' | 'all';
  systemCode?: string;
  systemName?: string;
  datasourceId?: string;
  datasourceName?: string;
  datasourceType?: string;
  databaseName?: string;
  isRoot?: boolean;
  isCategory?: boolean;
  children?: SourceSystemTreeNode[];
  iconType?: string;
}

/** 元数据清单列表行对象 */
export interface AssetItem {
  /** 资产 id */
  id: string;
  /** 元数据名称（如 dataphin02.all_types_num01） */
  name: string;
  /** 元数据中文显示名/描述 */
  description?: string;
  /** 元数据类型（表 / 视图 / 字段） */
  type?: AssetType;
  /** 数据源连接器 id */
  sourceId?: string;
  /** 采集数据源名称（如 Dev mysql测试演示[ds_mysql2_dev]） */
  source?: string;
  /** 数据库名称（如 dataphin02） */
  databaseName?: string;
  /** 所属 Schema 名称（如 public） */
  schemaName?: string;
  /** 所属数据域（如 交易域 / 客户域） */
  domain?: string;
  /** 所属来源系统名称（如 元数据采集系统demo / 企财ERP） */
  sourceSystem?: string;
  /** 负责人 */
  owner?: string;
  /** 分级分类（如 内部 / 敏感-PII / 受限） */
  classification?: string;
  /** 状态（pending/claimed/archived/deleted） */
  status?: string;
  /** 是否已被剔除 */
  isExcluded?: boolean;
  /** 最新版本号（如 V2025.03.21.153743） */
  version?: string;
  /** 关联采集任务 id */
  collectorTaskId?: string;
  /** 关联采集任务名称（如 MySQL采集demo） */
  collectorName?: string;
  /** 采集更新频率（如 定时 / 手动） */
  updateFrequency?: string;
  /** 调度描述（如 每日, 04:11） */
  scheduleDescription?: string;
  /** 当前用户是否收藏 */
  favorite?: boolean;
  /** 数据存疑状态：NORMAL / TAINTED */
  taintStatus?: string;
  /** 质量健康分 */
  healthScore?: number;
  /** 质量梯度 */
  qualityBand?: string;
  /** 数据源类型（如 MySQL / Oracle / PostgreSQL） */
  datasourceType?: string;
  /** 表物理行数 */
  rowCount?: number | string;
  /** 表存储大小（如 12.03MB） */
  storageSize?: string;
  /** 最后更新时间 */
  updatedAt?: string;
}

/** 资产字段清单元素 */
export interface AssetColumnItem {
  id: string;
  name: string;
  type?: string;
  comment?: string;
  pk?: boolean;
  /** 物理序号/列顺序 */
  ordinalPosition?: number;
  classification?: string;
}

/** 资产变更记录元素 */
export interface AssetVersionItem {
  id: string;
  version?: string | number;
  schemaDiff?: string;
  createdAt?: string;
}

/** 资产详情聚合 */
export interface AssetDetailItem extends AssetItem {
  tags?: string[];
  columns?: AssetColumnItem[];
  versions?: AssetVersionItem[];
}

/** 元数据清单筛选条件 */
export interface AssetFilterState {
  /** 关键词（名称或描述） */
  keyword?: string;
  /** 是否仅看已剔除数据 */
  onlyExcluded?: boolean;
  /** 是否仅看已剔除数据（API 同名参数） */
  isExcluded?: boolean;
  /** 来源系统名称 */
  sourceSystem?: string;
  /** 数据库 / Schema 筛选 */
  database?: string;
  /** 数据源连接器名称 */
  source?: string;
  /** 数据源 ID */
  sourceId?: string;
  /** 关联采集任务 ID */
  collectorTaskId?: string;
  /** 资产类型 */
  type?: string;
  /** 数据域 */
  domain?: string;
  /** 分级分类 */
  classification?: string;
  /** 仅看收藏 */
  favorite?: boolean;
  /** 我的资产 */
  mine?: boolean;
}
