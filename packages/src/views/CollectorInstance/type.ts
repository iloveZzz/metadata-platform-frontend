/**
 * 采集实例模块类型定义
 */

export interface CollectorInstanceItem {
  id: string;
  name: string;
  collectorId?: string;
  collectorName?: string;
  connectorId?: string;
  connectorName?: string;
  datasourceType?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | string;
  statusDescription?: string;
  executionMode?: 'manual' | 'schedule' | 'auto_retry' | 'dry_run' | string;
  executionModeDescription?: string;
  scheduleDescription?: string;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  executor?: string;
  owner?: string;
  errorMessage?: string;
  isDryRun?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface WorkflowNodeItem {
  id: string;
  name: string;
  type: 'dlink' | 'jdbc_probe' | 'schema_parse' | 'catalog_ingest' | string;
  typeDescription?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | string;
  statusDescription?: string;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  logs?: string[];
  exceptionInfo?: string;
  performanceMetrics?: {
    throughput?: string;
    jvmMemoryUsed?: string;
    networkLatency?: string;
    stageDurationMs?: number;
    handshakeDuration?: string;
    dbVersion?: string;
    sslEnabled?: boolean;
    charset?: string;
    maxConnections?: number;
    privilegeCheck?: string;
    parallelism?: number;
    tableCount?: number;
    transferredBytes?: string;
    parseRate?: string;
    diffDuration?: string;
    addedObjects?: number;
    updatedObjects?: number;
    deletedObjects?: number;
    totalObjects?: number;
    esIndexStatus?: string;
    docsIngested?: number;
    esLatency?: string;
    lineageEdges?: number;
    [key: string]: unknown;
  };
  parameters?: Record<string, unknown>;
  diagnosisAdvice?: {
    rootCause?: string;
    suggestions?: string[];
    riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
    [key: string]: unknown;
  };
  executedCode?: string;
  _rerunning?: boolean;
}

export interface TableDiffItem {
  tableName: string;
  diffType: 'ADDED' | 'UPDATED' | 'DELETED' | string;
  columnCount?: number;
  rowCount?: number;
  changeDescription?: string;
  updatedAt?: string;
}

export interface ViewDiffItem {
  viewName: string;
  diffType: 'ADDED' | 'UPDATED' | 'DELETED' | string;
  definitionSql?: string;
  changeDescription?: string;
  updatedAt?: string;
}

export interface ColumnDiffItem {
  tableName: string;
  columnName: string;
  dataType?: string;
  diffType: 'ADDED' | 'UPDATED' | 'DELETED' | string;
  changeDescription?: string;
  updatedAt?: string;
}

export interface MetadataDiffSummary {
  instanceId: string;
  datasourceName: string;
  collectScope?: string;
  collectStrategy?: string;
  executionTime?: string;
  totalObjects: number;
  totalTables: number;
  totalViews: number;
  totalColumns: number;
  addedObjects: number;
  addedTables: number;
  addedViews: number;
  addedColumns: number;
  updatedObjects: number;
  updatedTables: number;
  updatedViews: number;
  updatedColumns: number;
  deletedObjects: number;
  deletedTables: number;
  deletedViews: number;
  deletedColumns: number;
  tableDetails: TableDiffItem[];
  viewDetails: ViewDiffItem[];
  columnDetails: ColumnDiffItem[];
}

export interface CollectorInstanceFilterState {
  onlyMyTasks: boolean;
  onlyMyExecuted: boolean;
  onlyFailed: boolean;
  keyword: string;
  datasourceTypes: string[];
  executionModes: string[];
  statuses: string[];
  timeRange?: [string, string];
}
