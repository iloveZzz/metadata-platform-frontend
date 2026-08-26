import { ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import { GetDqHealthassetId } from '@/api';
import type { AssetHealthDetail, FieldHealth } from '@/api';
import { isForbiddenError } from '@/views/dq-insight/types';

/**
 * 资产级 + 字段级健康分详情（GET /api/dq/health/{assetId}）。
 *
 * 字段排序规则（高保真原型字段级区）：过期字段置顶（标灰），随后按健康分升序（低分置顶）；
 * 低分字段（score < 75 = 差档）由 API 的 lowScore 字段驱动标红。
 * 状态覆盖：loading / 无结果空态（后端 404 = 该资产无健康分结果）/ 过期独立展示态 /
 * 错误（可重试，不清空已展示数据）/ 403 / 只读。
 */

/** 字段行（字段健康分 + 展示态派生字段） */
export interface FieldRow extends FieldHealth {
  /** 低分标红（差档，OQ-01 已确认 <75） */
  low?: boolean;
}

/** 字段排序 + 派生（纯函数，组件测试 seam）：过期置顶 → 健康分升序（低分置顶） */
export function buildFieldRows(fields?: FieldHealth[]): FieldRow[] {
  if (!fields) {
    return [];
  }
  return [...fields]
    .map(f => ({ ...f, low: !!f.lowScore }))
    .sort((a, b) => {
      if (a.expired && !b.expired) return -1;
      if (!a.expired && b.expired) return 1;
      return (a.score ?? 0) - (b.score ?? 0);
    });
}

export function useHealthDetail(assetId: string) {
  const detail = ref<AssetHealthDetail | undefined>(undefined);
  const isForbidden = ref(false);
  /** 无结果空态：后端对无健康分结果的资产返回 404（err.dq.not-found），前端呈现「未接入质量结果」引导 */
  const isNotFound = ref(false);
  const hasError = ref(false);

  const { loading, run } = useRequest(() => GetDqHealthassetId(assetId), {
    manual: true,
    onSuccess: res => {
      detail.value = (res?.data ?? undefined) as AssetHealthDetail | undefined;
      isForbidden.value = false;
      isNotFound.value = false;
      hasError.value = false;
    },
    onError: e => {
      isForbidden.value = isForbiddenError(e);
      isNotFound.value = !isForbidden.value && (e as { response?: { status?: number } })?.response?.status === 404;
      hasError.value = !isForbidden.value && !isNotFound.value;
      detail.value = undefined;
    },
  });

  /** 字段行（低分置顶 + 过期置顶，展示用） */
  const fieldRows = () => buildFieldRows(detail.value?.fields);

  return {
    detail,
    fieldRows,
    loading,
    isForbidden,
    isNotFound,
    hasError,
    run,
    retry: run,
  };
}
