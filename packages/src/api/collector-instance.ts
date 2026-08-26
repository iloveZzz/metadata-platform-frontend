/**
 * 采集实例 API 接口定义
 */
import { customInstance } from './mutator';
import type { CollectorInstanceItem, MetadataDiffSummary, WorkflowNodeItem } from '@/views/CollectorInstance/type';

export interface CollectorInstanceQueryParams {
  keyword?: string;
  owner?: string;
  executor?: string;
  onlyFailed?: boolean;
  datasourceType?: string;
  status?: string;
  executionMode?: string;
  collectorId?: string;
  startTimeBegin?: string;
  startTimeEnd?: string;
}

export interface BatchInstanceParams {
  instanceIds: string[];
  operator?: string;
  reason?: string;
}

/** 获取采集实例列表 */
export const getCollectorInstances = (params?: CollectorInstanceQueryParams) => {
  return customInstance<{ data: CollectorInstanceItem[]; code: string; success: boolean }>({
    url: '/api/collector-instances',
    method: 'GET',
    params,
  });
};

/** 获取单实例详情 */
export const getCollectorInstanceById = (id: string) => {
  return customInstance<{ data: CollectorInstanceItem; code: string; success: boolean }>({
    url: `/api/collector-instances/${id}`,
    method: 'GET',
  });
};

/** 获取采集变更概览 */
export const getCollectorInstanceDiffSummary = (id: string) => {
  return customInstance<{ data: MetadataDiffSummary; code: string; success: boolean }>({
    url: `/api/collector-instances/${id}/diff-summary`,
    method: 'GET',
  });
};

/** 重跑单实例 */
export const rerunCollectorInstance = (id: string, operator?: string) => {
  return customInstance<{ data: CollectorInstanceItem; code: string; success: boolean }>({
    url: `/api/collector-instances/${id}/rerun`,
    method: 'POST',
    data: { operator },
  });
};

/** 批量重跑实例 */
export const batchRerunCollectorInstances = (params: BatchInstanceParams) => {
  return customInstance<{ data: CollectorInstanceItem[]; code: string; success: boolean }>({
    url: '/api/collector-instances/batch-rerun',
    method: 'POST',
    data: params,
  });
};

/** 终止单实例 */
export const terminateCollectorInstance = (id: string, operator?: string, reason?: string) => {
  return customInstance<{ data: CollectorInstanceItem; code: string; success: boolean }>({
    url: `/api/collector-instances/${id}/terminate`,
    method: 'POST',
    data: { operator, reason },
  });
};

/** 批量终止实例 */
export const batchTerminateCollectorInstances = (params: BatchInstanceParams) => {
  return customInstance<{ data: CollectorInstanceItem[]; code: string; success: boolean }>({
    url: '/api/collector-instances/batch-terminate',
    method: 'POST',
    data: params,
  });
};

/** 获取工作流节点及诊断列表 */
export const getCollectorInstanceWorkflowNodes = (id: string) => {
  return customInstance<{ data: WorkflowNodeItem[]; code: string; success: boolean }>({
    url: `/api/collector-instances/${id}/nodes`,
    method: 'GET',
  });
};

/** 重跑单个工作流节点 */
export const rerunWorkflowNode = (instanceId: string, nodeId: string, operator?: string) => {
  return customInstance<{ data: WorkflowNodeItem; code: string; success: boolean }>({
    url: `/api/collector-instances/${instanceId}/nodes/${nodeId}/rerun`,
    method: 'POST',
    params: { operator },
  });
};
