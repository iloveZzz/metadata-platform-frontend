import { reactive, ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import { GetDqAuditlogs, type AuditLogEntry, type GetDqAuditlogsParams, type GetDqAuditlogsAction } from '@/api';
import { isForbiddenError, unwrapPage } from '@/views/dq-insight/types';

/**
 * 审计日志数据 Hook（05-WU3 / DQI-007）。
 *
 * GET /api/dq/audit-logs 分页（接入 / 计算 / 配置变更审计，只读不可变 append-only）；action 筛选；
 * 仅管理员可查（AUDIT_QUERY，域外 / 非管理员 403 → Perm403 兜底，不泄露资源存在性）。
 */
export function useAuditLogs() {
  const filters = reactive<{
    action?: GetDqAuditlogsAction;
  }>({});

  const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
  const list = ref<AuditLogEntry[]>([]);
  const isForbidden = ref(false);
  const hasError = ref(false);

  const { loading, run } = useRequest((params: GetDqAuditlogsParams) => GetDqAuditlogs(params), {
    manual: true,
    onSuccess: res => {
      const { list: rows, totalCount } = unwrapPage<AuditLogEntry>(res);
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
    run({ page: pagination.current, size: pagination.pageSize, action: filters.action });
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
