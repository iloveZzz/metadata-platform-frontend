import { customInstance } from '@/api/mutator';

export interface RecognitionResultItem {
  id: number;
  tableName: string;
  tableComment?: string;
  fieldName: string;
  fieldComment?: string;
  assetSourceType: 'DATAPHIN' | 'DATASOURCE';
  assetSourceInfo: string;
  datasourceId?: string;
  datasourceName?: string;
  schemaName?: string;
  categoryId?: number;
  categoryName?: string;
  securityGradeId?: number;
  securityGradeName?: string;
  maskingStatus: 'ENABLED' | 'DISABLED';
  maskingStatusUpdatedAt?: string;
  recognitionMethod: 'AUTO' | 'MANUAL' | 'LINEAGE';
  isLocked: boolean;
  lockUser?: string;
  lockTime?: string;
  priority?: number;
  confidenceScore?: number;
  sampleData?: string;
  samplePreview?: string;
  hasBetterRecommendation?: boolean;
  recommendedCategoryId?: number;
  recommendedCategoryName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CandidateRecordItem {
  recordId: number;
  categoryId?: number;
  categoryName?: string;
  securityGradeId?: number;
  securityGradeName?: string;
  recognitionMethod: string;
  priority?: number;
  confidenceScore?: number;
  isRecommended?: boolean;
  isCurrentEffective?: boolean;
  categoryModifiedAt?: string;
  updatedAt?: string;
}

export interface RecognitionResultDetail {
  id: number;
  tableName: string;
  tableComment?: string;
  fieldName: string;
  fieldComment?: string;
  assetSourceType: string;
  assetSourceInfo: string;
  sampleData?: string;
  samplePreview?: string;
  sampleEnabled?: boolean;
  categoryId?: number;
  categoryName?: string;
  securityGradeId?: number;
  securityGradeName?: string;
  recognitionMethod: string;
  priority?: number;
  confidenceScore?: number;
  maskingStatus: 'ENABLED' | 'DISABLED';
  maskingStatusUpdatedAt?: string;
  isLocked?: boolean;
  categoryModifiedAt?: string;
  updatedAt?: string;
  hasBetterRecommendation?: boolean;
  recommendedCategoryId?: number;
  recommendedCategoryName?: string;
  candidateRecords: CandidateRecordItem[];
}

export interface RecognitionBatchLogItem {
  id: number;
  batchType: 'IMPORT' | 'MANUAL_ADD' | 'BATCH_EDIT';
  fileName: string;
  assetType: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  conflictStrategy?: string;
  maskingPolicy?: string;
  status: 'SUCCESS' | 'PARTIAL_FAILED' | 'FAILED';
  errorReportUrl?: string;
  operator: string;
  createdAt: string;
}

export interface ImportPreviewResult {
  totalCount: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  validRows: Array<{
    rowNumber: number;
    tableName: string;
    fieldName: string;
    categoryName: string;
    securityGradeName: string;
    status: string;
  }>;
  duplicateRows: Array<{
    rowNumber: number;
    tableName: string;
    fieldName: string;
    categoryName: string;
    securityGradeName: string;
    onlineCategoryName?: string;
    status: string;
    errorMessage?: string;
  }>;
  errorRows: Array<{
    rowNumber: number;
    tableName: string;
    fieldName: string;
    errorMessage: string;
  }>;
}

export interface ManualAddDTO {
  dedupStrategy: string;
  records: Array<{
    datasourceId?: string;
    datasourceName?: string;
    schemaName?: string;
    tableName: string;
    fieldName: string;
    fieldComment?: string;
    assetSourceType?: string;
    assetSourceInfo?: string;
    categoryId: number;
    securityGradeId?: number;
    maskingStatus?: string;
  }>;
}

// ================= API Functions =================

export function getRecognitionResults(params: any) {
  return customInstance({
    url: '/api/v1/sec/recognition-results',
    method: 'get',
    params,
  });
}

export function getRecognitionResultDetail(id: number) {
  return customInstance({
    url: `/api/v1/sec/recognition-results/${id}`,
    method: 'get',
  });
}

export function updateMaskingStatus(id: number, status: string) {
  return customInstance({
    url: `/api/v1/sec/recognition-results/${id}/masking-status`,
    method: 'put',
    params: { status },
  });
}

export function batchUpdateMaskingStatus(ids: number[], status: string) {
  return customInstance({
    url: '/api/v1/sec/recognition-results/batch-masking-status',
    method: 'put',
    params: { ids: ids.join(','), status },
  });
}

export function lockResult(id: number, isLocked: boolean) {
  return customInstance({
    url: `/api/v1/sec/recognition-results/${id}/lock`,
    method: 'put',
    params: { isLocked },
  });
}

export function batchLockResults(ids: number[], isLocked: boolean) {
  return customInstance({
    url: '/api/v1/sec/recognition-results/batch-lock',
    method: 'put',
    params: { ids: ids.join(','), isLocked },
  });
}

export function editRecognitionResult(data: {
  ids: number[];
  categoryId?: number;
  recognitionMethod?: string;
  syncMaskingStatus?: boolean;
  isLocked?: boolean;
}) {
  return customInstance({
    url: '/api/v1/sec/recognition-results/edit',
    method: 'put',
    data,
  });
}

export function adoptRecommendation(id: number, candidateCategoryId?: number) {
  return customInstance({
    url: `/api/v1/sec/recognition-results/${id}/adopt-recommendation`,
    method: 'post',
    params: candidateCategoryId ? { candidateCategoryId } : undefined,
  });
}

export function deleteRecognitionResult(id: number) {
  return customInstance({
    url: `/api/v1/sec/recognition-results/${id}`,
    method: 'delete',
  });
}

export function batchDeleteRecognitionResults(ids: number[]) {
  return customInstance({
    url: '/api/v1/sec/recognition-results/batch',
    method: 'delete',
    data: { ids },
  });
}

export function manualAddRecognitionResults(data: ManualAddDTO) {
  return customInstance({
    url: '/api/v1/sec/recognition-results/manual-add',
    method: 'post',
    data,
  });
}

export function previewImportRecognitionResults(params: {
  assetType: string;
  conflictStrategy: string;
  maskingPolicy: string;
}) {
  return customInstance({
    url: '/api/v1/sec/recognition-results/import-preview',
    method: 'post',
    params,
  });
}

export function executeImportRecognitionResults(params: {
  assetType: string;
  conflictStrategy: string;
  maskingPolicy: string;
  fileName?: string;
}) {
  return customInstance({
    url: '/api/v1/sec/recognition-results/import-execute',
    method: 'post',
    params,
  });
}

export function getImportHistory() {
  return customInstance({
    url: '/api/v1/sec/recognition-results/import-history',
    method: 'get',
  });
}
