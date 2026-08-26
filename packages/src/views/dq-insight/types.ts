import type { AssetHealthRow, AssetHealthDetail, DashboardStats, PageResult, RuleDetail } from '@/api';

/**
 * DQ Insight 页面层类型（冻结 OpenAPI 信封解包后的业务形状）。
 *
 * 生成客户端返回 YSS Result / PageResult 信封（data 为未类型化 Record<string, never>），
 * 页面层在此做最小化断言解包（避免 any 扩散；契约字段以后端 VO 为准，见
 * docs/.scratch/dq-insight/contracts/03-observation-display.yaml）。
 */

/** GET /api/dq/dashboard → SingleResult.data：{ stats, assets } */
export interface DashboardData {
  stats?: DashboardStats;
  assets?: DashboardAssetsData;
}

/** DashboardVO.assets：嵌套 PageResult（分页元数据在 assets 内） */
export interface DashboardAssetsData {
  data?: AssetHealthRow[];
  totalCount?: number;
  pageIndex?: number;
  pageSize?: number;
  success?: boolean;
  code?: string;
  message?: string;
  tips?: string;
}

/** GET /api/dq/health → PageResult（data = AssetHealthRow[]） */
export type HealthListData = PageResult & {
  data?: AssetHealthRow[];
};

/** GET /api/dq/health/{assetId} → SingleResult.data（AssetHealthDetail） */
export type HealthDetailData = AssetHealthDetail;

/** GET /api/dq/health/{assetId}/details → SingleResult.data（RuleDetail） */
export type RuleDetailData = RuleDetail;

/** 403 判定（mutator 拦截后 reject 的 axios error 携带 response.status） */
export const isForbiddenError = (e: unknown): boolean =>
  (e as { response?: { status?: number } })?.response?.status === 403;

/** 从 YSS PageResult 解包列表与总数（兼容 Dashboard 嵌套 assets 信封；PageResult.data 元素契约 = 分页数组） */
export function unwrapPage<T>(res: { data?: unknown; totalCount?: number } | null | undefined): {
  list: T[];
  totalCount: number;
} {
  const data = res?.data;
  const list = Array.isArray(data) ? (data as T[]) : [];
  return { list, totalCount: res?.totalCount ?? 0 };
}
