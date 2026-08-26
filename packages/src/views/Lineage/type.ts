/**
 * 血缘图谱页 - 模块私有类型
 * 字段对齐冻结 OpenAPI / 后端 LineageGraphVO / LineageEdgeVO（生成类型 data 为无属性 object，
 * 运行时经 unknown 桥接为本地类型，模式见切片 02）。
 * 运行时 ID 与数字均为 json-bigint 字符串，禁止 Number()/parseInt 转换。
 */
import type {
  GetAssetsidLineageConfidence,
  LineageManualRequestConfidence,
  LineageManualRequestType,
} from '@/api/generated/metadata/schemas';

/** 血缘边（对齐后端 LineageEdgeVO：id/fromAssetId/toAssetId/type/confidence/remark） */
export interface LineageEdgeItem {
  /** 边 id（json-bigint 字符串） */
  id: string;
  /** 上游资产 id */
  fromAssetId: string;
  /** 下游资产 id */
  toAssetId: string;
  /** 血缘类型（sql/job/manual） */
  type?: string;
  /** 置信度（auto-high/auto-mid/manual-high/low） */
  confidence?: string;
  /** 备注 */
  remark?: string;
}

/** 血缘图谱（对齐后端 LineageGraphVO：edges + graphVersionToken） */
export interface LineageGraphItem {
  /** 边列表（from=中心 或 to=中心的邻域边；空血缘空数组非错误） */
  edges: LineageEdgeItem[];
  /** 图版本 token（空图可能为 null；补录乐观锁 + CONFLICT 恢复路径） */
  graphVersionToken?: string | null;
}

/** 图谱布局节点（由边推导：中心 + 上游 + 下游；坐标为画布像素） */
export interface LineageNodeItem {
  /** 资产 id */
  id: string;
  /** 节点角色：中心资产 / 上游 / 下游 */
  role: 'center' | 'upstream' | 'downstream';
  /** 画布 x 坐标 */
  x: number;
  /** 画布 y 坐标 */
  y: number;
  /** 是否中心资产（高亮） */
  isCenter?: boolean;
}

/** 人工补录编辑器表单值（映射 POST /api/lineage/manual body 字段） */
export interface LineageEditorFormValues {
  /** 源资产（上游） */
  fromAssetId: string;
  /** 目标资产（下游） */
  toAssetId: string;
  /** 血缘类型（sql/job/manual） */
  type: LineageManualRequestType;
  /** 置信度（人工补录默认 manual-high） */
  confidence: LineageManualRequestConfidence;
  /** 备注（补录依据） */
  remark?: string;
}

/** 置信度筛选选项值（冻结 OpenAPI 枚举 all/auto-high/auto-mid/manual-high/low） */
export type ConfidenceFilterValue = GetAssetsidLineageConfidence;

/** 补录环冲突（CYCLE）提示：定位冲突边 from→to + 后端描述 */
export interface CycleConflictItem {
  fromAssetId: string;
  toAssetId: string;
  message: string;
}
