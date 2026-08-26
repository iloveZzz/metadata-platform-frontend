import { customInstance } from './mutator';

export interface SingleResult<T> {
  code: string;
  message?: string;
  data: T;
  success?: boolean;
}

export interface PageResult<T> {
  code: string;
  message?: string;
  data: T[];
  totalCount: number;
  pageSize: number;
  pageIndex: number;
  totalPages?: number;
  success?: boolean;
}

export interface SecurityTemplateVO {
  id: string;
  templateCode: string;
  templateName: string;
  standardAuthority?: string;
  description?: string;
  defaultAutoApproval: boolean;
  defaultThreshold: number;
  isSystemBuiltIn: boolean;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  rules?: ClassificationRuleVO[];
}

export interface ClassificationRuleVO {
  id?: string;
  templateId?: string;
  sensitiveType: string;
  sensitiveName: string;
  securityLevel: string;
  clauseRef?: string;
  regexPattern?: string;
  dictionaryWords?: string;
  semanticPrompt?: string;
  isActive?: boolean;
  priority?: number;
}

export interface MetricConflictVO {
  id: string;
  conflictCode: string;
  indicatorAId: string;
  indicatorAName: string;
  indicatorACode: string;
  indicatorADomain: string;
  indicatorBId: string;
  indicatorBName: string;
  indicatorBCode: string;
  indicatorBDomain: string;
  conflictType: 'SYNONYMOUS_NAME' | 'HOMONYMOUS_MEANING' | 'FORMULA_DRIFT';
  similarityScore: number;
  formulaA: string;
  formulaB: string;
  astDiffSummary?: string;
  status: 'UNRESOLVED' | 'RESOLVED' | 'SUSPECTED' | 'DISMISSED';
  canonicalId?: string;
  resolutionComment?: string;
  operator?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MetricConflictDiffVO {
  conflict: MetricConflictVO;
  indicatorA: Record<string, any>;
  indicatorB: Record<string, any>;
  astDiff: {
    conflictType: string;
    similarityScore: number;
    aggMatch: boolean;
    whereClauseDiff: string;
    astSummary: string;
  };
}

// ------------------- Security APIs -------------------

export const listSecurityTemplates = (keyword?: string) => {
  return customInstance<SingleResult<SecurityTemplateVO[]>>({
    url: '/api/smart-governance/security/templates',
    method: 'GET',
    params: { keyword },
  });
};

export const getSecurityTemplateDetail = (id: string) => {
  return customInstance<SingleResult<SecurityTemplateVO>>({
    url: `/api/smart-governance/security/templates/${id}`,
    method: 'GET',
  });
};

export const createSecurityTemplate = (data: Partial<SecurityTemplateVO>) => {
  return customInstance<SingleResult<string>>({
    url: '/api/smart-governance/security/templates',
    method: 'POST',
    data,
  });
};

export const updateSecurityTemplate = (id: string, data: Partial<SecurityTemplateVO>) => {
  return customInstance<SingleResult<boolean>>({
    url: `/api/smart-governance/security/templates/${id}`,
    method: 'PUT',
    data,
  });
};

export const triggerSecurityScan = (data?: {
  templateId?: string;
  dataSource?: string;
  databaseName?: string;
  tableName?: string;
}) => {
  return customInstance<SingleResult<string>>({
    url: '/api/smart-governance/security/scan',
    method: 'POST',
    data,
  });
};

// ------------------- Metric APIs -------------------

export const queryMetricConflicts = (params: {
  pageIndex?: number;
  pageSize?: number;
  status?: string;
  conflictType?: string;
  keyword?: string;
}) => {
  return customInstance<PageResult<MetricConflictVO>>({
    url: '/api/smart-governance/metrics/conflicts',
    method: 'GET',
    params,
  });
};

export const triggerMetricConflictScan = () => {
  return customInstance<SingleResult<string>>({
    url: '/api/smart-governance/metrics/conflict-scan',
    method: 'POST',
  });
};

export const getMetricConflictDiff = (id: string) => {
  return customInstance<SingleResult<MetricConflictDiffVO>>({
    url: `/api/smart-governance/metrics/conflicts/${id}/diff`,
    method: 'GET',
  });
};

export const reconcileMetricConflict = (
  id: string,
  data: { canonicalIndicatorId: string; reconcileStrategy?: string; comment?: string }
) => {
  return customInstance<SingleResult<boolean>>({
    url: `/api/smart-governance/metrics/conflicts/${id}/reconcile`,
    method: 'POST',
    data,
  });
};

export const markMetricConflictSuspect = (id: string, reason: string) => {
  return customInstance<SingleResult<boolean>>({
    url: `/api/smart-governance/metrics/conflicts/${id}/mark-suspect`,
    method: 'POST',
    data: { reason },
  });
};

export const dismissMetricConflict = (id: string) => {
  return customInstance<SingleResult<boolean>>({
    url: `/api/smart-governance/metrics/conflicts/${id}/dismiss`,
    method: 'POST',
  });
};
