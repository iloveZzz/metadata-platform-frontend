import { reactive, ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import {
  GetDqAssetlinkagePending,
  PostDqAssetlinkageidMap,
  type GetDqAssetlinkagePendingParams,
  PendingLinkage,
} from '@/api';
import { customMessage } from '@/utils/message';
import { isForbiddenError, unwrapPage } from '@/views/dq-insight/types';
import type { ReturnPermission } from '@/views/dq-insight/hooks/usePermission';

/**
 * 待关联资产（pending 队列）数据 Hook（04-WU5 / DQI-006）。
 *
 * GET /api/dq/asset-linkage/pending 分页（结果已入库但资产 ID 未命中 → 挂待关联队列）；
 * POST /api/dq/asset-linkage/{id}/map 人工映射（目标批次已关联 → 409 → confirmOverwrite 二次确认覆盖，SB-05）。
 * 权限：仅治理专员 / 管理员可映射（403 兜底禁用）。
 */
export function usePendingLinkage(permission: ReturnPermission) {
  const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
  const list = ref<PendingLinkage[]>([]);
  const isForbidden = ref(false);
  const hasError = ref(false);
  /** 映射提交中（按钮 loading，防重复提交） */
  const mapping = ref(false);
  /** 409 覆盖确认态：目标批次已关联，需 confirmOverwrite 二次确认 */
  const needsOverwriteConfirm = ref(false);

  const { loading, run } = useRequest((params: GetDqAssetlinkagePendingParams) => GetDqAssetlinkagePending(params), {
    manual: true,
    onSuccess: res => {
      const { list: rows, totalCount } = unwrapPage<PendingLinkage>(res);
      list.value = rows;
      pagination.total = totalCount;
      isForbidden.value = false;
      hasError.value = false;
    },
    onError: e => {
      isForbidden.value = isForbiddenError(e);
      hasError.value = !isForbidden.value;
      list.value = [];
      pagination.total = 0;
    },
  });

  const query = () => {
    run({ page: pagination.current, size: pagination.pageSize });
  };

  const onPageChange = (payload: { current: number; pageSize: number }) => {
    pagination.current = payload.current;
    pagination.pageSize = payload.pageSize;
    query();
  };

  const onSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.current = 1;
    query();
  };

  const retry = () => {
    query();
  };

  /**
   * 人工映射（二次确认语义：确认映射不可逆 → confirm modal → 提交；409 已关联 → confirmOverwrite 确认 → 重试）。
   * @returns 'ok' | 'conflict' | 'denied' | 'failed'
   */
  const mapAsset = async (
    pendingId: string,
    targetAssetId: string,
    confirmOverwrite = false
  ): Promise<'ok' | 'conflict' | 'denied' | 'failed'> => {
    if (mapping.value) {
      return 'failed';
    }
    mapping.value = true;
    try {
      await PostDqAssetlinkageidMap(pendingId, { assetId: targetAssetId, confirmOverwrite });
      customMessage.success('人工映射完成：批次已关联，健康分（首次）计算已触发（已审计）');
      await query();
      needsOverwriteConfirm.value = false;
      return 'ok';
    } catch (e) {
      const is409 = (e as { response?: { status?: number } })?.response?.status === 409;
      if (is409) {
        needsOverwriteConfirm.value = true;
        return 'conflict';
      }
      if (permission.recordDenied('linkage-map', e)) {
        return 'denied';
      }
      return 'failed';
    } finally {
      mapping.value = false;
    }
  };

  /** 覆盖确认：重试携带 confirmOverwrite=true */
  const confirmOverwrite = async (pendingId: string, targetAssetId: string) => {
    const result = await mapAsset(pendingId, targetAssetId, true);
    needsOverwriteConfirm.value = result === 'conflict';
    return result;
  };

  return {
    pagination,
    list,
    loading,
    isForbidden,
    hasError,
    mapping,
    needsOverwriteConfirm,
    query,
    onPageChange,
    onSizeChange,
    retry,
    mapAsset,
    confirmOverwrite,
  };
}
