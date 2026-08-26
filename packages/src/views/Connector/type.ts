/**
 * 数据源管理页 - 模块私有类型
 * 请求/响应 DTO 优先复用 Orval 生成类型（见 @/api/generated/metadata/schemas）
 */
import type { ConnectorCreateRequest } from '@/api/generated/metadata/schemas';

/** 连接器表单提交值（与冻结 OpenAPI ConnectorCreateRequest 对齐） */
export type ConnectorFormValues = ConnectorCreateRequest;

/** 连接器列表行（运行时数字/ID 均为 json-bigint 字符串，禁止 Number 转换） */
export interface ConnectorItem {
  id: string;
  name: string;
  type?: ConnectorCreateRequest['type'];
  host?: string;
  port?: string | number;
  dialect?: ConnectorCreateRequest['dialect'];
  username?: string;
  autoClassify?: boolean;
  /** 草稿 draft / 已连接 connected / 失败 failed / 停用 disabled */
  status?: string;
}

/** YssFormily 组件实例按需声明的方法签名（避免业务层依赖组件实现细节） */
export interface YssFormilyExpose {
  submit: () => Promise<unknown>;
  getValues: () => object;
}

/** 数据源集市卡片项类型 */
export interface DatasourceCatalogItem {
  id: string;
  name: string;
  category: 'relational' | 'olap' | 'generic';
  categoryLabel: string;
  logoText: string;
  brandColor: string;
  defaultPort: number;
  defaultDialect: string;
  supportedObjects: string;
  supportedVersions: string;
  createdCount?: number;
  collectedCount?: number;
}

/** 外部数据源微服务（datamiddle-ds）返回的数据源实例 */
export interface RemoteDatasourceItem {
  id: string;
  name: string;
  type: string;
  host: string;
  port?: number;
  status?: string;
}

/** 新建采集任务表单数据结构（两步式弹窗） */
export interface CollectorTaskFormState {
  name: string;
  owner?: string;
  description?: string;
  datasourceType: string;
  datasourceId?: string;
  scopeType: 'all' | 'custom';
  selectedDatabases: string[];
  objectTypes: string[];
  sourceSystem?: string;
  // 步骤 2：策略配置
  scheduleType: 'manual' | 'cron';
  periodType: 'day' | 'week' | 'month';
  scheduleTime: string; // HH:mm 如 '05:35'
  selectedWeekDays?: number[]; // [1..7]
  selectedMonthDay?: number; // 1..31
  cronExpression: string; // 自动计算生成的 cron
  retryEnabled: boolean;
  retryCount: number;
  retryInterval: number;
  resourceCu: number;
  resourceGroup: string;
  mode: 'incremental' | 'full';
  strategy: 'ignore' | 'overwrite' | 'abort-on-failure';
  autoClassify: boolean;
}
