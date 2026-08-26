import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import {
  getRecognitionResults,
  updateMaskingStatus,
  batchUpdateMaskingStatus,
  lockResult,
  batchLockResults,
  deleteRecognitionResult,
  batchDeleteRecognitionResults,
  adoptRecommendation,
  type RecognitionResultItem,
} from '@/api/recognition-result';

export function useRecognitionResultTable() {
  const loading = ref(false);
  const tableData = ref<RecognitionResultItem[]>([]);
  const selectedRowKeys = ref<number[]>([]);
  const searchKeyword = ref('');

  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条`,
  });

  const filterParams = reactive({
    treeNodeId: undefined as number | undefined,
    categoryId: undefined as number | undefined,
    securityGradeId: undefined as number | undefined,
    maskingStatus: undefined as string | undefined,
    recognitionMethod: undefined as string | undefined,
    assetSourceType: undefined as string | undefined,
    isLocked: undefined as boolean | undefined,
    hasBetterRecommendation: undefined as boolean | undefined,
  });

  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await getRecognitionResults({
        pageIndex: pagination.current,
        pageSize: pagination.pageSize,
        treeNodeId: filterParams.treeNodeId,
        keyword: searchKeyword.value || undefined,
        categoryId: filterParams.categoryId,
        securityGradeId: filterParams.securityGradeId,
        maskingStatus: filterParams.maskingStatus,
        recognitionMethod: filterParams.recognitionMethod,
        assetSourceType: filterParams.assetSourceType,
        isLocked: filterParams.isLocked,
        hasBetterRecommendation: filterParams.hasBetterRecommendation,
      });

      if (res?.data) {
        tableData.value = res.data.records || res.data.data || res.data || [];
        pagination.total = res.data.total || tableData.value.length;
      }
    } catch (e: any) {
      message.error(e?.message || '获取识别结果失败');
    } finally {
      loading.value = false;
    }
  };

  const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    fetchList();
  };

  const onSelectionChange = (keys: number[]) => {
    selectedRowKeys.value = keys;
  };

  const onSearch = () => {
    pagination.current = 1;
    fetchList();
  };

  const onFilterChange = () => {
    pagination.current = 1;
    fetchList();
  };

  const handleToggleMasking = async (row: RecognitionResultItem, checked: boolean) => {
    const newStatus = checked ? 'ENABLED' : 'DISABLED';
    try {
      await updateMaskingStatus(row.id, newStatus);
      row.maskingStatus = newStatus;
      message.success(`已${checked ? '开启' : '关闭'}脱敏生效状态`);
    } catch (e: any) {
      message.error(e?.message || '状态切换失败');
    }
  };

  const handleBatchMasking = async (enabled: boolean) => {
    if (!selectedRowKeys.value.length) return;
    const status = enabled ? 'ENABLED' : 'DISABLED';
    try {
      await batchUpdateMaskingStatus(selectedRowKeys.value, status);
      message.success(`已批量${enabled ? '开启' : '关闭'}脱敏生效状态`);
      selectedRowKeys.value = [];
      fetchList();
    } catch (e: any) {
      message.error(e?.message || '批量操作失败');
    }
  };

  const handleToggleLock = async (row: RecognitionResultItem) => {
    const nextLocked = !row.isLocked;
    await lockResult(row.id, nextLocked);
    row.isLocked = nextLocked;
    if (nextLocked) {
      row.recognitionMethod = 'MANUAL';
    }
    message.success(nextLocked ? '识别结果已锁定' : '已解除锁定');
  };

  const handleBatchLock = async (lock: boolean) => {
    if (!selectedRowKeys.value.length) return;
    await batchLockResults(selectedRowKeys.value, lock);
    message.success(lock ? '已批量锁定识别结果' : '已批量解除锁定');
    selectedRowKeys.value = [];
    fetchList();
  };

  const handleDelete = async (row: RecognitionResultItem) => {
    await deleteRecognitionResult(row.id);
    message.success('删除识别结果成功');
    fetchList();
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.value.length) return;
    await batchDeleteRecognitionResults(selectedRowKeys.value);
    message.success('批量删除成功');
    selectedRowKeys.value = [];
    fetchList();
  };

  const handleAdoptRecommendation = async (row: RecognitionResultItem) => {
    await adoptRecommendation(row.id);
    message.success('已采纳推荐识别分类');
    fetchList();
  };

  return {
    loading,
    tableData,
    pagination,
    selectedRowKeys,
    searchKeyword,
    filterParams,
    fetchList,
    handlePageChange,
    onSelectionChange,
    onSearch,
    onFilterChange,
    handleToggleMasking,
    handleBatchMasking,
    handleToggleLock,
    handleBatchLock,
    handleDelete,
    handleBatchDelete,
    handleAdoptRecommendation,
  };
}
