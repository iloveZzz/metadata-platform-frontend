/**
 * 系统管理页 - 审计日志查询 Hook
 * GET /api/audit-logs（服务端分页 PageResult：data 数组 + totalCount/pageSize/pageIndex；只读不可变）。
 */
import { onMounted, reactive, ref, type Ref } from 'vue';
import { useTableHeight } from '@yss-ui/hooks';
import { GetAuditlogs } from '@/api';
import type { AuditLogItem } from '../type';

export function useAuditLogs({
  tableAreaRef,
  enabled,
}: {
  tableAreaRef: Ref<HTMLElement | undefined>;
  enabled?: () => boolean;
}) {
  const loading = ref(false);
  const loadError = ref(false);
  const dataList = ref<AuditLogItem[]>([]);

  /** YTable 远程分页（remote: true 服务端分页） */
  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    remote: true,
  });
  const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true });

  const fetchList = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetAuditlogs({ page: pagination.current, size: pagination.pageSize });
      dataList.value = (res?.data as unknown as AuditLogItem[]) ?? [];
      // totalCount 为 json-bigint 字符串；分页展示计数（非 ID），转 number 供 AntD Pagination total 使用
      pagination.total = Number(res?.totalCount ?? 0);
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  const onPageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    fetchList();
  };

  onMounted(() => {
    // 非管理员不发起管理端请求（避免 403 toast 噪音；页面级 PermissionDenied 兜底）
    if (enabled ? enabled() : true) {
      fetchList();
    }
  });

  return {
    loading,
    loadError,
    dataList,
    pagination,
    tableHeight,
    fetchList,
    onPageChange,
  };
}
