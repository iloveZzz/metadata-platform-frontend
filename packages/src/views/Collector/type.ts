/**
 * 采集任务页 - 模块私有类型
 */
import type { CollectorCreateRequest } from '@/api/generated/metadata/schemas';

/** 采集任务表单提交值 */
export type CollectorFormValues = CollectorCreateRequest;

/** 采集任务列表行 */
export interface CollectorItem {
  id: string;
  name: string;
  connectorId: string;
  connectorName?: string;
  datasourceType?: string;
  schedule: string;
  cronDescription?: string;
  mode?: CollectorCreateRequest['mode'];
  strategy?: CollectorCreateRequest['strategy'];
  autoClassify?: boolean;
  owner?: string;
  description?: string;
  enabled?: boolean;
  /** 任务状态：待执行 pending / 正常 success / 运行中 running / 失败 failed / 已取消 cancelled */
  status?: string;
  failReason?: string;
  /** 最近1次采集执行状态 (success | failed) */
  lastRunStatus?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
  sourceSystem?: string;
  scopeType?: string;
  selectedDatabases?: string;
  retryEnabled?: boolean;
  retryCount?: number;
  retryInterval?: number;
  /** 前端局部操作状态 */
  _switchLoading?: boolean;
  _runLoading?: boolean;
  _cancelLoading?: boolean;
  _deleteLoading?: boolean;
}

/** 顶部工具栏筛选状态 */
export interface CollectorFilterState {
  onlyMyTasks: boolean;
  onlyActive: boolean;
  keyword: string;
  datasourceTypes: string[];
  modes: string[];
  statuses: string[];
}

/** YssFormily 组件实例按需声明的方法签名 */
export interface YssFormilyExpose {
  submit: () => Promise<unknown>;
  getValues: () => object;
}
