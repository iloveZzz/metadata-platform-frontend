import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import { customInstance } from '@/api/mutator';
import type { MaskingRuleVO } from '@/api/generated/data-security/schemas';

export function useMaskingRuleTable() {
  const api = getDataSecurityCenterAPIAPIApi();
  const loading = ref(false);
  const tableData = ref<MaskingRuleVO[]>([]);

  const currentParams = ref({
    pageIndex: 1,
    pageSize: 10,
    keyword: '',
    ruleType: '',
    categoryId: undefined as number | undefined,
    applyScene: undefined as string | undefined,
  });

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条动态脱敏规则`,
  });

  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await api.pageMaskingRules({
        pageIndex: currentParams.value.pageIndex,
        pageSize: currentParams.value.pageSize,
        keyword: currentParams.value.keyword || undefined,
        ruleType: currentParams.value.ruleType || undefined,
        categoryId: currentParams.value.categoryId || undefined,
        applyScene: currentParams.value.applyScene || undefined,
      } as any);
      tableData.value = (res as any)?.data || [];
      pagination.total = (res as any)?.totalCount || (res as any)?.total || 0;
    } catch (err: any) {
      message.error(err.message || '加载脱敏规则失败');
    } finally {
      loading.value = false;
    }
  };

  const query = (params: Partial<typeof currentParams.value>) => {
    currentParams.value = { ...currentParams.value, ...params };
    pagination.current = currentParams.value.pageIndex;
    pagination.pageSize = currentParams.value.pageSize;
    return fetchList();
  };

  const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    return query({ pageIndex: current, pageSize });
  };

  const handleDelete = async (row: MaskingRuleVO) => {
    try {
      await api.deleteMaskingRule(row.id!);
      message.success(`动态脱敏规则 [${row.ruleName}] 已成功删除`);
      fetchList();
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  const handleToggleStatus = async (row: MaskingRuleVO, checked: boolean) => {
    const nextStatus = checked ? 'ENABLED' : 'DISABLED';
    try {
      await customInstance({
        url: `/api/v1/masking-rules/${row.id}/status`,
        method: 'PATCH',
        params: { status: nextStatus },
      });
      row.status = nextStatus;
      message.success(`规则 [${row.ruleName}] 状态已切换为 ${checked ? '生效中' : '已停用'}`);
    } catch (err: any) {
      // 恢复原状态
      row.status = checked ? 'DISABLED' : 'ENABLED';
    }
  };

  onMounted(() => {
    fetchList();
  });

  return {
    loading,
    tableData,
    pagination,
    currentParams,
    fetchList,
    query,
    handlePageChange,
    handleDelete,
    handleToggleStatus,
  };
}
