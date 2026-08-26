import { reactive, ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import { GetDqResults, type GetDqResultsParams, type IngestionStatus, type LinkageState, IngestionRecord } from '@/api';
import { isForbiddenError, unwrapPage } from '@/views/dq-insight/types';

/**
 * 接入记录区数据 Hook（04-WU5；切片 01 接入记录区 UI 在此页统一交付）。
 *
 * GET /api/dq/results 分页查询（page / size / status / linkageStatus 筛选）；0 条以空分页表达（C28）。
 * 结果状态与关联状态解耦表达（DQI-001 / DQI-006）：status = 已入库 / 解析失败 / 已失效；linkageStatus = 已关联 / 待关联。
 */
export function useIngestionRecords() {
  const filters = reactive<{
    status?: IngestionStatus;
    linkageStatus?: LinkageState;
  }>({});

  const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
  const list = ref<IngestionRecord[]>([]);
  const isForbidden = ref(false);
  const hasError = ref(false);

  const { loading, run } = useRequest((params: GetDqResultsParams) => GetDqResults(params), {
    manual: true,
    onSuccess: res => {
      const { list: rows, totalCount } = unwrapPage<IngestionRecord>(res);
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
      status: filters.status,
      linkageStatus: filters.linkageStatus,
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
