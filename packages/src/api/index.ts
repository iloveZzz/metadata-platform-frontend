/**
 * API 统一导出文件
 * 指向冻结 OpenAPI 生成的 metadata client（orval，见 orval.config.ts）
 */

// Re-export generated API
export * from './generated/metadata';
export type * from './generated/semantic/model';

import { getApiApi as getSemanticApiApi } from './generated/semantic/api';
export const semanticTermsApi = getSemanticApiApi();

// 具名导出生成客户端函数（等价 scripts/api-flatten-exports 的效果），
// 业务 Hook 按需具名导入，避免每次 getApiApi() 重复组装闭包。
import { getApiApi } from './generated/metadata';

const metadataApi = getApiApi();

export const {
  GetConnectors,
  PostConnectors,
  PutConnectorsid,
  DeleteConnectorsid,
  PostConnectorsidTest,
  GetCollectors,
  PostCollectors,
  PutCollectorsid,
  PostCollectorsRun,
  PostCollectorsidCancel,
  PostCollectorsidRetry,
  GetAssets,
  GetAssetsid,
  PostAssetsidFavorite,
  PostAssetsidClaim,
  PutAssetsidTags,
  PostAssetsidArchive,
  PostAssetsidUnarchive,
  GetAssetsidLineage,
  PostLineageManual,
  GetAssetsidImpactanalysis,
  GetAssetsidImpactanalysisExport,
  GetClassifications,
  PostClassifications,
  PutClassificationsidStatus,
  PostClassificationsidConfirm,
  PostClassificationsidPropagate,
  GetIntegrations,
  PutIntegrations,
  PostExportsDatahub,
  PostV1Lineage,
  GetRoles,
  PostRoles,
  DeleteRolesid,
  GetAuditlogs,
} = metadataApi;

import { customInstance } from './mutator';
import type { AssetResponse } from './generated/metadata/schemas';

/** 剔除/软删除资产 */
export const PutAssetsidExclude = (id: string, options?: any) => {
  return customInstance<AssetResponse>({ url: `/api/assets/${id}/exclude`, method: 'PUT' }, options);
};

/** 恢复已剔除资产 */
export const PutAssetsidRecover = (id: string, options?: any) => {
  return customInstance<AssetResponse>({ url: `/api/assets/${id}/recover`, method: 'PUT' }, options);
};
