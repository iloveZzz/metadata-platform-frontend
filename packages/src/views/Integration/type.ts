/**
 * 集成配置页 - 模块私有类型
 * 生成的 IntegrationResponse / ExportTaskResponse 的 data 为无属性 object，
 * 此处经 unknown 桥接为本地类型（合同登记的桥接约定）。
 */

/** Gravitino 上游配置（GET /api/integrations data.gravitino） */
export interface GravitinoConfigData {
  endpoint?: string;
  enabled?: boolean;
  lastTest?: string;
}

/** DataHub 导出目标配置（GET /api/integrations data.datahub） */
export interface DatahubConfigData {
  endpoint?: string;
}

/** OpenLineage 接收统计（GET /api/integrations data.openLineage） */
export interface OpenLineageConfigData {
  receiveEndpoint?: string;
  /** json-bigint：数字字段统一为字符串，禁止 Number 转换，仅透传展示 */
  recent24h?: string;
  parseSuccessRate?: string;
}

/** 集成配置组合数据（GET/PUT /api/integrations 响应 data） */
export interface IntegrationConfigData {
  gravitino?: GravitinoConfigData;
  datahub?: DatahubConfigData;
  openLineage?: OpenLineageConfigData;
}

/** DataHub 导出异步任务（POST /api/exports/datahub 响应 data） */
export interface ExportTaskData {
  id?: string;
  assetId?: string;
  format?: string;
  status?: string;
  fileRef?: string;
  operator?: string;
  createdAt?: string;
  finishedAt?: string;
}

/** Gravitino 表单值（authToken 留空表示不修改，写路径加密引用） */
export interface GravitinoFormValues {
  endpoint?: string;
  authToken?: string;
  enabled?: boolean;
}

/** DataHub 表单值（authToken 留空表示不修改） */
export interface DatahubFormValues {
  endpoint?: string;
  authToken?: string;
}

/** YssFormily 组件实例按需声明的方法签名（避免业务层依赖组件实现细节） */
export interface YssFormilyExpose {
  submit: () => Promise<unknown>;
  getValues: () => object;
}
