import { computed, ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import { GetDqHealthassetIdDetails, type RuleDetail } from '@/api';
import { isForbiddenError } from '@/views/dq-insight/types';

/**
 * 规则明细钻取（GET /api/dq/health/{assetId}/details）。
 *
 * 分数来源区（透明可解释）：health = Σ(规则权重 × 规则得分)，权重与算法说明随行返回；
 * 规则明细列表（规则名 / 权重 / 结果 / 失败原因 / 工具结果时间）。
 * 状态覆盖：loading / 空（暂无规则结果）/ 过期标识（标灰 + 提示）/ 错误（可重试）/ 403 / 只读。
 */
export function useRuleDetail(assetId: string) {
  const detail = ref<RuleDetail | undefined>(undefined);
  const isForbidden = ref(false);
  /** 空态（暂无规则结果）：后端 404 = 该资产无健康分结果 / 无规则明细 */
  const isNotFound = ref(false);
  const hasError = ref(false);

  const { loading, run } = useRequest(() => GetDqHealthassetIdDetails(assetId), {
    manual: true,
    onSuccess: res => {
      detail.value = (res?.data ?? undefined) as RuleDetail | undefined;
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

  /** 规则通过率（契约 RuleDetail 无 passRate 字段，按规则明细派生：passed + warn ÷ 总数，与原型 passRateOf 口径一致） */
  const passRateText = computed(() => {
    const rules = detail.value?.rules ?? [];
    if (rules.length === 0) {
      return '—';
    }
    const ok = rules.filter(r => r.status === 'passed' || r.status === 'warn').length;
    return `${Math.round((ok / rules.length) * 100)}%`;
  });

  return {
    detail,
    passRateText,
    loading,
    isForbidden,
    isNotFound,
    hasError,
    run,
    retry: run,
  };
}
