import { customInstance } from './mutator';

export interface RootCauseNodeVO {
  assetId: string;
  assetName: string;
  title: string;
  domain?: string;
  healthScore?: number;
  qualityBand?: string;
  taintStatus?: string;
  ruleName?: string;
  actualMetric?: string;
  threshold?: string;
  faultTime?: string;
  distance?: number;
}

export interface PropagationStepVO {
  fromAssetId: string;
  fromAssetName: string;
  toAssetId: string;
  toAssetName: string;
  propagationType: string;
}

export interface RootCauseVO {
  targetAssetId: string;
  rootAsset: RootCauseNodeVO;
  propagationPath: PropagationStepVO[];
  confidence: string;
  summary: string;
  suggestions: string[];
  createdAt: string;
}

export interface BlastRadiusAssetVO {
  assetId: string;
  assetName: string;
  title: string;
  domain?: string;
  depth: number;
  owner?: string;
  healthScore?: number;
  qualityBand?: string;
  taintStatus?: string;
}

export interface BlastRadiusVO {
  originAssetId: string;
  originAssetName: string;
  impactedAssets: BlastRadiusAssetVO[];
  totalImpactedCount: number;
  maxDepth: number;
  impactedDomains: string[];
}

export interface SingleResult<T> {
  code: string;
  message?: string;
  data: T;
  success?: boolean;
}

/**
 * 质量故障一键根因溯源分析 (GET /api/dq/assets/{id}/root-cause)
 */
export const getRootCause = (assetId: string) => {
  return customInstance<SingleResult<RootCauseVO>>({
    url: `/api/dq/assets/${assetId}/root-cause`,
    method: 'GET',
  });
};

/**
 * 下游爆炸半径与受影响资产分析 (GET /api/dq/assets/{id}/blast-radius)
 */
export const getBlastRadius = (assetId: string, maxDepth = 5) => {
  return customInstance<SingleResult<BlastRadiusVO>>({
    url: `/api/dq/assets/${assetId}/blast-radius`,
    method: 'GET',
    params: { maxDepth },
  });
};

/**
 * 标记/解除全链路数据存疑状态 (PUT /api/assets/{id}/taint-status)
 */
export const setTaintStatus = (assetId: string, data: { taintStatus: string; reason?: string }) => {
  return customInstance<SingleResult<any>>({
    url: `/api/assets/${assetId}/taint-status`,
    method: 'PUT',
    data,
  });
};
