import { reactive, ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import {
  GetDqHealth,
  type AssetHealthRow,
  type GetDqHealthParams,
  type BandFilter,
  type GetDqHealthAssetType,
} from '@/api';
import { isForbiddenError, unwrapPage } from '@/views/dq-insight/types';

/**
 * 资产健康分列表页数据 Hook（GET /api/dq/health，分页 / 筛选）。
 *
 * 状态覆盖：loading / 空分页（0 条以空分页表达，非错误，C28）/ 错误（可重试）/ 无权限（403）。
 * 点击行进入资产级与字段级健康分视图（主流程闭环 DQI-003）。
 */
export function useHealthList() {
  const filters = reactive<{
    domain?: string;
    band?: BandFilter;
    assetType?: GetDqHealthAssetType;
  }>({});

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const list = ref<AssetHealthRow[]>([]);
  const isForbidden = ref(false);
  const hasError = ref(false);

  const { loading, run } = useRequest((params: GetDqHealthParams) => GetDqHealth(params), {
    manual: true,
    onSuccess: res => {
      const { list: rows, totalCount } = unwrapPage<AssetHealthRow>(res);
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
    run({
      page: pagination.current,
      size: pagination.pageSize,
      domain: filters.domain,
      band: filters.band,
      assetType: filters.assetType,
    });
  };

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

  const retry = () => {
    query();
  };

  return {
    filters,
    pagination,
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
