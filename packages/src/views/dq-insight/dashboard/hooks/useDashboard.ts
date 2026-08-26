import { reactive, ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import {
  GetDqDashboard,
  type AssetHealthRow,
  type DashboardStats,
  type GetDqDashboardParams,
  type BandFilter,
  type GetDqDashboardAssetType,
} from '@/api';
import { isForbiddenError, unwrapPage, type DashboardData } from '@/views/dq-insight/types';

/**
 * 健康分仪表盘页数据 Hook（api-integration：useRequest manual + run）。
 *
 * 状态覆盖（状态矩阵 §3 健康分仪表盘页）：loading / 空数据 / 错误（可重试，不清空筛选）/
 * 无权限（403 → Perm403）；数据域筛选与 RBAC 一致生效（后端 DataDomainFilter 横切，域外不返回）。
 */
export function useDashboard() {
  /** 筛选条件（数据域 / 档位 / 资产类型；排序默认 score，服务端语义） */
  const filters = reactive<{
    domain?: string;
    band?: BandFilter;
    assetType?: GetDqDashboardAssetType;
  }>({});

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const stats = ref<DashboardStats | undefined>(undefined);
  const list = ref<AssetHealthRow[]>([]);
  /** 无权限态（403）：域外用户浏览隐藏 + 提示联系管理员（DQI-007） */
  const isForbidden = ref(false);
  /** 可重试错误态（非 403；页面呈现内嵌 Alert，不清空筛选条件） */
  const hasError = ref(false);

  const { loading, run } = useRequest((params: GetDqDashboardParams) => GetDqDashboard(params), {
    manual: true,
    onSuccess: res => {
      const data = (res?.data ?? {}) as DashboardData;
      stats.value = data.stats;
      const { list: rows, totalCount } = unwrapPage<AssetHealthRow>(data.assets);
      list.value = rows;
      pagination.total = totalCount;
      if (data.assets?.pageIndex) {
        pagination.current = data.assets.pageIndex;
      }
      isForbidden.value = false;
      hasError.value = false;
    },
    onError: e => {
      // mutator 已统一 toast 提示；页面呈现内嵌可重试 Alert（不清空筛选条件）
      isForbidden.value = isForbiddenError(e);
      hasError.value = !isForbidden.value;
      list.value = [];
      pagination.total = 0;
    },
  });

  /** 按当前筛选 + 分页发起查询 */
  const query = () => {
    run({
      page: pagination.current,
      size: pagination.pageSize,
      domain: filters.domain,
      band: filters.band,
      assetType: filters.assetType,
    });
  };

  /** 筛选变更：重置到第 1 页后查询 */
  const onFilterChange = () => {
    pagination.current = 1;
    query();
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

  /** 错误态重试（保留筛选条件，状态矩阵 §3 错误：可重试错误，不清空筛选条件） */
  const retry = () => {
    query();
  };

  return {
    filters,
    pagination,
    stats,
    list,
    loading,
    isForbidden,
    hasError,
    query,
    onFilterChange,
    onPageChange,
    onSizeChange,
    retry,
  };
}
