import { customInstance } from './mutator';

export interface ColumnLineageNode {
  assetId: string;
  assetName: string;
  tableName: string;
  columnId: string;
  columnName: string;
  dataType: string;
  classification?: string;
  isPrimaryKey?: boolean;
}

export interface ColumnLineageEdge {
  id: string;
  fromAssetId: string;
  fromColumnId: string;
  toAssetId: string;
  toColumnId: string;
  transformExpr?: string;
  exprType?: 'DIRECT' | 'COMPUTED' | 'AGGREGATE' | 'MANUAL';
  type?: string;
  confidence?: string;
  remark?: string;
}

export interface ColumnLineageGraphResponse {
  success: boolean;
  code: string;
  message?: string;
  data: {
    centerAssetId: string;
    centerColumnId?: string;
    nodes: ColumnLineageNode[];
    edges: ColumnLineageEdge[];
  };
}

export interface ColumnLineageManualCmd {
  fromAssetId: string;
  fromColumnId: string;
  toAssetId: string;
  toColumnId: string;
  transformExpr?: string;
  exprType?: string;
  remark?: string;
  graphVersionToken?: string;
}

export interface AffectedColumnItem {
  assetId: string;
  assetName: string;
  columnId: string;
  columnName: string;
  dataType?: string;
  transformExpr?: string;
  exprType?: string;
  classification?: string;
}

export interface ColumnImpactLayer {
  depth: number;
  affectedColumns: AffectedColumnItem[];
}

export interface ColumnImpactSummary {
  totalAffectedAssets: number;
  totalAffectedColumns: number;
  maxDepth: number;
  hasCriticalDownstream: boolean;
}

export interface ColumnImpactAnalysisResponse {
  success: boolean;
  code: string;
  message?: string;
  data: {
    sourceAssetId: string;
    sourceAssetName: string;
    sourceColumnId: string;
    sourceColumnName: string;
    impactSummary: ColumnImpactSummary;
    impactLayers: ColumnImpactLayer[];
  };
}

/**
 * 查询资产字段级血缘图谱
 */
export const getColumnLineageApi = (
  assetId: string,
  params?: { columnId?: string; depth?: number; direction?: string }
) => {
  return customInstance<ColumnLineageGraphResponse>({
    url: `/api/assets/${assetId}/column-lineage`,
    method: 'GET',
    params,
  });
};

/**
 * 人工补录字段级血缘
 */
export const addManualColumnEdgeApi = (data: ColumnLineageManualCmd) => {
  return customInstance<{ success: boolean; code: string; data: ColumnLineageEdge }>({
    url: `/api/lineage/column/manual`,
    method: 'POST',
    data,
  });
};

/**
 * 删除字段级血缘
 */
export const deleteColumnEdgeApi = (edgeId: string) => {
  return customInstance<{ success: boolean; code: string; data: boolean }>({
    url: `/api/lineage/column/${edgeId}`,
    method: 'DELETE',
  });
};

/**
 * 字段级下游爆炸半径影响分析
 */
export const getColumnImpactAnalysisApi = (assetId: string, columnId: string, params?: { maxDepth?: number }) => {
  return customInstance<ColumnImpactAnalysisResponse>({
    url: `/api/assets/${assetId}/columns/${columnId}/impact-analysis`,
    method: 'GET',
    params,
  });
};
