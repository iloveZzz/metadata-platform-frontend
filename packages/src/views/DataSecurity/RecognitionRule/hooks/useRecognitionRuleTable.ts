import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import { recognitionRuleApi } from '@/api/recognitionRuleApi';

export interface RecognitionRuleItem {
  id: number;
  ruleName: string;
  description?: string;
  categoryScopeMode: string; // ALL / TREE_NODE / SPECIFIC
  categoryScopeConfig?: any;
  scanSourceType: string; // COMPUTE_ENGINE / DATASOURCE
  computeScopeConfig?: any;
  datasourceScopeConfig?: any;
  owner: string;
  status: string; // ENABLED / DISABLED
  priority?: number;
  taggedFieldsCount?: number;
  lineageInheritanceEnabled?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export function useRecognitionRuleTable() {
  const loading = ref(false);
  const tableData = ref<RecognitionRuleItem[]>([]);
  const selectedRowKeys = ref<number[]>([]);
  const currentParams = ref({
    pageIndex: 1,
    pageSize: 10,
    keyword: undefined as string | undefined,
    categoryId: undefined as number | undefined,
    owner: undefined as string | undefined,
    onlyMine: undefined as boolean | undefined,
  });

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条识别规则`,
  });

  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await recognitionRuleApi.page({
        pageIndex: currentParams.value.pageIndex,
        pageSize: currentParams.value.pageSize,
        keyword: currentParams.value.keyword,
        categoryId: currentParams.value.categoryId,
        owner: currentParams.value.owner,
        onlyMine: currentParams.value.onlyMine,
      });
      const items = (res as any)?.data || [];
      const total = (res as any)?.totalCount || (res as any)?.total || 0;

      tableData.value = items;
      pagination.total = total;
    } catch {
      tableData.value = [];
      pagination.total = 0;
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

  // 切换状态
  const handleToggleStatus = async (row: RecognitionRuleItem) => {
    const newStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    try {
      await recognitionRuleApi.updateStatus(row.id, newStatus);
      message.success(`规则 [${row.ruleName}] 已${newStatus === 'ENABLED' ? '启用' : '停用'}`);
      fetchList();
    } catch {
      // 全局拦截器统一提示错误
    }
  };

  // 重置
  const handleReset = async (row: RecognitionRuleItem) => {
    try {
      await recognitionRuleApi.reset(row.id);
      message.success(`规则 [${row.ruleName}] 已重置，打标将被清空并重新识别`);
      fetchList();
    } catch {
      // 全局拦截器统一提示错误
    }
  };

  // 克隆
  const handleClone = async (row: RecognitionRuleItem) => {
    try {
      await recognitionRuleApi.clone(row.id);
      message.success(`规则 [${row.ruleName}] 克隆成功`);
      fetchList();
    } catch {
      // 全局拦截器统一提示错误
    }
  };

  // 删除
  const handleDelete = async (row: RecognitionRuleItem) => {
    try {
      await recognitionRuleApi.delete(row.id);
      message.success(`规则 [${row.ruleName}] 已删除，次日生效`);
      fetchList();
    } catch {
      // 全局拦截器统一提示错误
    }
  };

  // 创建
  const handleCreate = async (data: any) => {
    await recognitionRuleApi.create(data);
    message.success('识别规则创建成功');
    fetchList();
  };

  // 更新
  const handleUpdate = async (id: number, data: any) => {
    await recognitionRuleApi.update(id, data);
    message.success('识别规则更新成功');
    fetchList();
  };

  // 获取详情
  const getDetail = async (id: number): Promise<RecognitionRuleItem> => {
    const res = await recognitionRuleApi.getDetail(id);
    return (res as any)?.data;
  };

  // 批量运行
  const handleBatchRun = async (ruleIds: number[], runScope?: string, lineageInheritance?: boolean) => {
    const res = await recognitionRuleApi.batchRun({
      ruleIds,
      runScope: runScope || 'ENABLED_ONLY',
      lineageInheritance,
    });
    const count = (res as any)?.data || 0;
    message.success(`已触发 ${count} 条规则运行`);
    fetchList();
  };

  // 手动规则扫描
  const handleManualScan = async (data: any) => {
    const res = await recognitionRuleApi.manualScan(data);
    const count = (res as any)?.data || 0;
    message.success(`手动规则扫描已触发，共 ${count} 条规则参与扫描`);
    fetchList();
  };

  // 批量删除
  const handleBatchDelete = async (ids: number[]) => {
    const promises = ids.map(id => recognitionRuleApi.delete(id));
    await Promise.all(promises);
    message.success(`已批量删除 ${ids.length} 条规则，次日生效`);
    selectedRowKeys.value = [];
    fetchList();
  };

  // 批量重置
  const handleBatchReset = async (ids: number[]) => {
    const promises = ids.map(id => recognitionRuleApi.reset(id));
    await Promise.all(promises);
    message.success(`已批量重置 ${ids.length} 条规则`);
    selectedRowKeys.value = [];
    fetchList();
  };

  const hasSelected = computed(() => selectedRowKeys.value.length > 0);

  onMounted(() => {
    fetchList();
  });

  return {
    loading,
    tableData,
    pagination,
    selectedRowKeys,
    hasSelected,
    fetchList,
    query,
    handlePageChange,
    handleToggleStatus,
    handleReset,
    handleClone,
    handleDelete,
    handleCreate,
    handleUpdate,
    getDetail,
    handleBatchRun,
    handleManualScan,
    handleBatchDelete,
    handleBatchReset,
  };
}
