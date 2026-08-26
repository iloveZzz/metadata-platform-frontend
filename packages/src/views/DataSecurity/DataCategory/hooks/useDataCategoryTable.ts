import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { DataCategoryVO } from '@/api/generated/data-security/schemas';

export function useDataCategoryTable() {
  const api = getDataSecurityCenterAPIAPIApi();
  const loading = ref(false);
  const tableData = ref<DataCategoryVO[]>([]);
  const currentParams = ref({
    pageIndex: 1,
    pageSize: 10,
    treeNodeId: undefined as number | undefined,
    keyword: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条数据分类`,
  });

  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await api.pageDataCategories({
        pageIndex: currentParams.value.pageIndex,
        pageSize: currentParams.value.pageSize,
        treeNodeId: currentParams.value.treeNodeId,
        keyword: currentParams.value.keyword,
        status: currentParams.value.status as any,
      });
      tableData.value = (res as any)?.data || [];
      pagination.total = (res as any)?.totalCount || (res as any)?.total || tableData.value.length;
    } catch (err: any) {
      message.error(err?.message || '加载数据分类列表失败');
    } finally {
      loading.value = false;
    }
  };

  const query = (
    params: Partial<{
      pageIndex: number;
      pageSize: number;
      treeNodeId?: number | string | null;
      keyword?: string;
      status?: string;
    }>
  ) => {
    const formattedParams: any = { ...params };
    if ('treeNodeId' in params) {
      formattedParams.treeNodeId =
        params.treeNodeId !== undefined &&
        params.treeNodeId !== null &&
        params.treeNodeId !== 0 &&
        params.treeNodeId !== '0'
          ? Number(params.treeNodeId)
          : undefined;
    }
    currentParams.value = { ...currentParams.value, ...formattedParams };
    pagination.current = currentParams.value.pageIndex;
    pagination.pageSize = currentParams.value.pageSize;
    return fetchList();
  };

  const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    return query({ pageIndex: current, pageSize });
  };

  const toggleStatus = async (row: DataCategoryVO, enabled: boolean) => {
    try {
      const targetStatus = enabled ? 'ENABLED' : 'DISABLED';
      await api.changeDataCategoryStatus(row.id!, {
        status: targetStatus as any,
        disablePolicy: 'RETAIN_TAGS',
      });
      message.success(`数据分类 [${row.categoryName}] 已${enabled ? '重新启用' : '停用'}`);
      await fetchList();
    } catch (err: any) {
      message.error(err?.message || '更新分类启停状态失败');
    }
  };

  const handleDelete = async (row: DataCategoryVO) => {
    try {
      await api.deleteDataCategory(row.id!);
      message.success(`分类 [${row.categoryName}] 已成功删除`);
      fetchList();
    } catch (err: any) {
      message.error(err?.message || '删除分类失败');
    }
  };

  return {
    loading,
    tableData,
    pagination,
    currentParams,
    fetchList,
    query,
    handlePageChange,
    toggleStatus,
    handleDelete,
  };
}
