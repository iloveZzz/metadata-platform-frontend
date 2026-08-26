import { customInstance } from './mutator';

export interface Result<T = any> {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
  total?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface SingleResult<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data: T;
}

export interface MultiResult<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data: T[];
  total?: number;
}

export interface PageResult<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data: T[];
  totalCount?: number;
  pageSize?: number;
  pageIndex?: number;
  totalPages?: number;
}

export interface TagDTO {
  id: string;
  name: string;
  code: string;
  categoryCode: string;
  categoryName?: string;
  colorToken?: string;
  description?: string;
  isEnabled?: boolean;
}

export interface TagRuleDTO {
  tagId: string;
  regexPattern?: string;
  boundTermIds?: string[];
  boundTermNames?: string[];
  fewShotPrompt?: string;
  scopeFilter?: string;
}

export interface SandboxResultDTO {
  matchedTagId?: string;
  matchedTagName?: string;
  confidence: number;
  explanation: string;
  l1RegexHit: boolean;
  l2GlossaryHit: boolean;
  l3LlmHit: boolean;
}

export interface TagCandidateDTO {
  id: string;
  tableName: string;
  columnName: string;
  columnComment: string;
  currentTag?: string;
  recommendedTagId: string;
  recommendedTagName: string;
  tagCategory: string;
  source: string;
  confidence: number;
  inferenceReason?: string;
  status: 'PENDING' | 'AUTO_APPLIED' | 'MANUAL_APPROVED' | 'REJECTED' | 'ROLLED_BACK';
}

export interface BatchSummaryDTO {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  appliedBatchId?: string;
}

export interface TagAuditLogDTO {
  id: string;
  batchId: string;
  actionType: string;
  actionName: string;
  operator: string;
  fieldCount: number;
  status: 'APPLIED' | 'ROLLED_BACK';
  createdAt: string;
}

export interface AskResponseDTO {
  intentSummary: string;
  extractedEntities: string[];
  extractedTerms: string[];
  recommendedAssets: {
    tableName: string;
    tableCnName: string;
    matchScore: number;
    recommendReason: string;
    certifiedTerm: string;
    dqHealthScore: number;
    dqLevel: string;
  }[];
}

// ==================== 标签分类与三层规则 API ====================

export const listTags = (categoryCode?: string) => {
  return customInstance<MultiResult<TagDTO>>({
    url: '/api/smart-discovery/tags',
    method: 'GET',
    params: { categoryCode },
  });
};

export const createTag = (createDTO: Partial<TagDTO>) => {
  return customInstance<SingleResult<TagDTO>>({
    url: '/api/smart-discovery/tags',
    method: 'POST',
    data: createDTO,
  });
};

export const getTagById = (id: string) => {
  return customInstance<SingleResult<TagDTO>>({
    url: `/api/smart-discovery/tags/${id}`,
    method: 'GET',
  });
};

export const updateTag = (id: string, updateDTO: Partial<TagDTO>) => {
  return customInstance<SingleResult<TagDTO>>({
    url: `/api/smart-discovery/tags/${id}`,
    method: 'PUT',
    data: updateDTO,
  });
};

export const deleteTag = (id: string) => {
  return customInstance<Result>({
    url: `/api/smart-discovery/tags/${id}`,
    method: 'DELETE',
  });
};

export const getTagRules = (id: string) => {
  return customInstance<SingleResult<TagRuleDTO>>({
    url: `/api/smart-discovery/tags/${id}/rules`,
    method: 'GET',
  });
};

export const updateTagRules = (id: string, ruleDTO: Partial<TagRuleDTO>) => {
  return customInstance<SingleResult<TagRuleDTO>>({
    url: `/api/smart-discovery/tags/${id}/rules`,
    method: 'PUT',
    data: ruleDTO,
  });
};

export const testSandboxRule = (fieldName: string, fieldComment?: string) => {
  return customInstance<SingleResult<SandboxResultDTO>>({
    url: '/api/smart-discovery/tags/sandbox-test',
    method: 'POST',
    data: { fieldName, fieldComment: fieldComment || '' },
  });
};

// ==================== 候选池打标与审查 API ====================

export const listCandidates = (params?: {
  status?: string;
  source?: string;
  domain?: string;
  pageIndex?: number;
  pageSize?: number;
}) => {
  return customInstance<PageResult<TagCandidateDTO>>({
    url: '/api/smart-discovery/tagging/candidates',
    method: 'GET',
    params,
  });
};

export const batchApproveCandidates = (candidateIds: string[], reason?: string) => {
  return customInstance<SingleResult<BatchSummaryDTO>>({
    url: '/api/smart-discovery/tagging/candidates/batch-approve',
    method: 'POST',
    data: { candidateIds, reason: reason || '人工批量审批通过' },
  });
};

export const batchRejectCandidates = (candidateIds: string[], reason?: string) => {
  return customInstance<SingleResult<BatchSummaryDTO>>({
    url: '/api/smart-discovery/tagging/candidates/batch-reject',
    method: 'POST',
    data: { candidateIds, reason: reason || '人工批量驳回' },
  });
};

export const modifyAndApproveCandidate = (id: string, targetTag: string, modifyReason?: string) => {
  return customInstance<SingleResult<TagCandidateDTO>>({
    url: `/api/smart-discovery/tagging/candidates/${id}/modify`,
    method: 'POST',
    data: { targetTag, modifyReason: modifyReason || '' },
  });
};

export const getDrawerSuggestions = (tableName?: string) => {
  return customInstance<MultiResult<TagCandidateDTO>>({
    url: '/api/smart-discovery/tagging/candidates/drawer',
    method: 'GET',
    params: { tableName },
  });
};
