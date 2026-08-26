/**
 * 术语管理页 - 详情抽屉 Hook
 * GET /api/semantic/terms/{id} → Result.data = TermDetail（含挂接清单 attachments /
 * 关联同义词组 synonymSet）。
 * 切片 03 / 04 交接：TermDetailVO.synonymSet / attachments 当前为 null / 空列表占位，
 * 抽屉以空态 + 交接提示展示（状态矩阵 §2 术语详情抽屉：加载中骨架 / 空挂接空态）。
 */
import { ref } from 'vue';
import { semanticTermsApi } from '@/api';
import type { TermDetail } from '@/api/generated/semantic/model';
import type { TermDetailState } from '../type';

export function useTermDetail() {
  const state = ref<TermDetailState>({
    visible: false,
    loading: false,
    detail: null,
  });

  const open = async (id: string | number) => {
    state.value.visible = true;
    state.value.loading = true;
    state.value.detail = null;
    try {
      const res = await semanticTermsApi.GetSemanticTermsid(String(id));
      state.value.detail = (res?.data as unknown as TermDetail) ?? null;
    } catch {
      // mutator 拦截器已统一提示（404 等）；抽屉保留空态可关闭
      state.value.detail = null;
    } finally {
      state.value.loading = false;
    }
  };

  const close = () => {
    state.value.visible = false;
    state.value.detail = null;
  };

  return { state, open, close };
}
