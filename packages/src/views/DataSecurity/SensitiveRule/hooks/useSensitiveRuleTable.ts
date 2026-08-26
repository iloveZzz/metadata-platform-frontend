import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { SensitiveRuleVO } from '@/api/generated/data-security/schemas';

export interface RecognitionFeatureItem extends SensitiveRuleVO {
  ruleType?: string; // BUILTIN / CUSTOM
  featureConfig?: any;
}

export function useSensitiveRuleTable() {
  const api = getDataSecurityCenterAPIAPIApi();
  const loading = ref(false);
  const tableData = ref<RecognitionFeatureItem[]>([]);
  const currentParams = ref({
    pageIndex: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    ruleType: undefined as string | undefined,
    status: undefined as any,
  });

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条识别特征`,
  });

  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await api.pageSensitiveRules({
        pageIndex: currentParams.value.pageIndex,
        pageSize: currentParams.value.pageSize,
        keyword: currentParams.value.keyword,
        status: currentParams.value.status,
        ruleType: currentParams.value.ruleType,
      } as any);

      const items = (res as any)?.data || [];
      const total = (res as any)?.totalCount || (res as any)?.total || 0;

      tableData.value = items;
      pagination.total = total;
    } catch (err: any) {
      tableData.value = [];
      pagination.total = 0;
      message.error(err.response?.data?.message || err.message || '加载识别特征失败');
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

  const handleClone = async (row: RecognitionFeatureItem) => {
    if (!row.id) return;
    try {
      await api.cloneSensitiveRule(row.id);
      message.success(`特征 [${row.ruleName}] 克隆成功`);
      fetchList();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || '克隆失败');
    }
  };

  const handleDelete = async (row: RecognitionFeatureItem) => {
    if (row.ruleType === 'BUILTIN') {
      message.warning('内置识别特征受系统保护，不可删除');
      return;
    }
    if (!row.id) return;
    try {
      await api.deleteSensitiveRule(row.id);
      message.success(`特征 [${row.ruleName}] 已删除`);
      fetchList();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || '删除失败');
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
    handleClone,
    handleDelete,
  };
}
