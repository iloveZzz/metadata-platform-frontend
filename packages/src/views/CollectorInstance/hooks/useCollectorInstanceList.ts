/**
 * 采集实例列表与操作 Hook
 * 严格遵循 yss-hook, yss-components, yss-ui 与 vue3-best-practices 规范
 */
import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { Modal } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { useTableHeight } from '@yss-ui/hooks';
import { customMessage } from '@/utils';
import {
  getCollectorInstances,
  rerunCollectorInstance,
  batchRerunCollectorInstances,
  terminateCollectorInstance,
  batchTerminateCollectorInstances,
} from '@/api/collector-instance';
import type { CollectorInstanceFilterState, CollectorInstanceItem } from '../type';

const CURRENT_USER_ID = '1397905662202719';

export function useCollectorInstanceList({ tableAreaRef }: { tableAreaRef: Ref<HTMLElement | undefined> }) {
  const router = useRouter();
  const loading = ref(false);
  const loadError = ref(false);
  const rawList = ref<CollectorInstanceItem[]>([]);

  // 顶部筛选条件
  const filterState = reactive<CollectorInstanceFilterState>({
    onlyMyTasks: false,
    onlyMyExecuted: false,
    onlyFailed: false,
    keyword: '',
    datasourceTypes: [],
    executionModes: [],
    statuses: [],
    timeRange: undefined,
  });

  // 表格多选行
  const selectedRowKeys = ref<(string | number)[]>([]);
  const selectedRows = ref<CollectorInstanceItem[]>([]);

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
  });

  const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true });

  // 弹窗与抽屉状态
  const diffModalVisible = ref(false);
  const selectedDiffInstanceId = ref<string>();

  const logDrawerVisible = ref(false);
  const selectedLogInstance = ref<CollectorInstanceItem | null>(null);

  /** 实例列表拉取 */
  const fetchList = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await getCollectorInstances();
      const list = (res?.data ?? []) as CollectorInstanceItem[];
      rawList.value = list;
    } catch {
      loadError.value = true;
      rawList.value = [];
    } finally {
      loading.value = false;
    }
  };

  /** 本地多条件组合过滤 */
  const filteredList = computed(() => {
    let result = rawList.value;

    // 1. 我负责的任务实例
    if (filterState.onlyMyTasks) {
      result = result.filter(item => item.owner === CURRENT_USER_ID);
    }

    // 2. 我执行的
    if (filterState.onlyMyExecuted) {
      result = result.filter(item => item.executor === CURRENT_USER_ID);
    }

    // 3. 执行失败
    if (filterState.onlyFailed) {
      result = result.filter(item => item.status === 'failed');
    }

    // 4. 关键字搜索 (实例名、任务名、数据源名称)
    if (filterState.keyword && filterState.keyword.trim()) {
      const kw = filterState.keyword.trim().toLowerCase();
      result = result.filter(item => {
        const nameMatch = item.name && item.name.toLowerCase().includes(kw);
        const taskMatch = item.collectorName && item.collectorName.toLowerCase().includes(kw);
        const connMatch = item.connectorName && item.connectorName.toLowerCase().includes(kw);
        return nameMatch || taskMatch || connMatch;
      });
    }

    // 5. 数据源类型多选
    if (filterState.datasourceTypes.length > 0) {
      result = result.filter(item => item.datasourceType && filterState.datasourceTypes.includes(item.datasourceType));
    }

    // 6. 执行方式多选
    if (filterState.executionModes.length > 0) {
      result = result.filter(item => item.executionMode && filterState.executionModes.includes(item.executionMode));
    }

    // 7. 执行状态多选
    if (filterState.statuses.length > 0) {
      result = result.filter(item => item.status && filterState.statuses.includes(item.status));
    }

    // 8. 运行时间范围过滤
    if (filterState.timeRange && filterState.timeRange.length === 2) {
      const [startDay, endDay] = filterState.timeRange;
      if (startDay && endDay) {
        result = result.filter(item => {
          if (!item.startTime) return false;
          const itemDay = item.startTime.substring(0, 10);
          return itemDay >= startDay && itemDay <= endDay;
        });
      }
    }

    return result;
  });

  // 同步过滤结果总条数
  watch(
    () => filteredList.value.length,
    len => {
      pagination.total = len;
    },
    { immediate: true }
  );

  const onPageChange = (payload: { current: number; pageSize: number }) => {
    pagination.current = payload.current;
    pagination.pageSize = payload.pageSize;
  };

  const onSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.current = 1;
  };

  const handleFilterChange = (val: Partial<CollectorInstanceFilterState>) => {
    Object.assign(filterState, val);
    pagination.current = 1;
  };

  const onSelectChange = (keys: (string | number)[], rows: CollectorInstanceItem[]) => {
    selectedRowKeys.value = keys;
    selectedRows.value = rows;
  };

  const clearSelection = () => {
    selectedRowKeys.value = [];
    selectedRows.value = [];
  };

  /** 1. 采集变更概览 */
  const handleViewDiff = (row: CollectorInstanceItem) => {
    selectedDiffInstanceId.value = row.id;
    diffModalVisible.value = true;
  };

  /** 2. 重跑单个实例 */
  const handleRerun = (row: CollectorInstanceItem) => {
    if (row.status !== 'failed') {
      customMessage.warning('仅执行失败的实例支持重跑操作');
      return;
    }
    Modal.confirm({
      title: '确认重跑该实例？',
      content: `实例 [${row.name}] 将被重新提交调度。重跑执行可能需要较长的时间，请耐心等待。`,
      okText: '确认重跑',
      cancelText: '取消',
      onOk: async () => {
        try {
          await rerunCollectorInstance(row.id, CURRENT_USER_ID);
          customMessage.success('已触发重跑，实例已重新进入运行队列');
          fetchList();
        } catch (e: unknown) {
          customMessage.error('重跑触发失败: ' + String(e));
        }
      },
    });
  };

  /** 3. 批量重跑 */
  const handleBatchRerun = () => {
    if (selectedRowKeys.value.length === 0) {
      customMessage.warning('请先勾选需要重跑的实例');
      return;
    }
    const failedSelected = selectedRows.value.filter(item => item.status === 'failed');
    if (failedSelected.length === 0) {
      customMessage.warning('所选实例中没有可重跑的失败实例');
      return;
    }
    Modal.confirm({
      title: '确认批量重跑选中的失败实例？',
      content: `本次将批量重新调度 ${failedSelected.length} 个失败实例。执行可能需要较长时间。`,
      okText: '确认批量重跑',
      cancelText: '取消',
      onOk: async () => {
        try {
          const ids = failedSelected.map(i => i.id);
          await batchRerunCollectorInstances({
            instanceIds: ids,
            operator: CURRENT_USER_ID,
          });
          customMessage.success(`已成功批量重跑 ${failedSelected.length} 个实例`);
          clearSelection();
          fetchList();
        } catch (e: unknown) {
          customMessage.error('批量重跑失败: ' + String(e));
        }
      },
    });
  };

  /** 4. 终止单个实例 */
  const handleTerminate = (row: CollectorInstanceItem) => {
    if (row.status !== 'running' && row.status !== 'pending') {
      customMessage.warning('仅运行中和等待中状态的实例支持终止操作');
      return;
    }
    Modal.confirm({
      title: '确认终止该实例执行？',
      content: `实例 [${row.name}] 将被强制终止，已采集的临时元数据将保存或安全回滚。`,
      okText: '终止实例',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await terminateCollectorInstance(row.id, CURRENT_USER_ID, '用户手动终止');
          customMessage.success('实例已成功终止并标记为失败状态');
          fetchList();
        } catch (e: unknown) {
          customMessage.error('终止操作失败: ' + String(e));
        }
      },
    });
  };

  /** 5. 批量终止 */
  const handleBatchTerminate = () => {
    if (selectedRowKeys.value.length === 0) {
      customMessage.warning('请先勾选需要终止的实例');
      return;
    }
    const runningSelected = selectedRows.value.filter(item => item.status === 'running' || item.status === 'pending');
    if (runningSelected.length === 0) {
      customMessage.warning('所选实例中没有运行中或等待中的实例');
      return;
    }
    Modal.confirm({
      title: '确认批量终止选中的实例？',
      content: `本次将强制终止 ${runningSelected.length} 个正在运行或等待调度的实例。`,
      okText: '确认批量终止',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const ids = runningSelected.map(i => i.id);
          await batchTerminateCollectorInstances({
            instanceIds: ids,
            operator: CURRENT_USER_ID,
            reason: '批量强制终止',
          });
          customMessage.success(`已成功终止 ${runningSelected.length} 个实例`);
          clearSelection();
          fetchList();
        } catch (e: unknown) {
          customMessage.error('批量终止失败: ' + String(e));
        }
      },
    });
  };

  /** 6. 查看运行日志与诊断 */
  const handleViewLogs = (row: CollectorInstanceItem) => {
    selectedLogInstance.value = row;
    logDrawerVisible.value = true;
  };

  /** 7. 跳转查看对应采集任务 */
  const handleGoToCollector = (row: CollectorInstanceItem) => {
    router.push({
      path: '/collectors',
      query: { keyword: row.collectorName || row.name },
    });
  };

  onMounted(() => {
    fetchList();
  });

  return {
    loading,
    loadError,
    rawList,
    filteredList,
    filterState,
    pagination,
    tableHeight,
    selectedRowKeys,
    selectedRows,
    diffModalVisible,
    selectedDiffInstanceId,
    logDrawerVisible,
    selectedLogInstance,
    fetchList,
    onPageChange,
    onSizeChange,
    handleFilterChange,
    onSelectChange,
    clearSelection,
    handleViewDiff,
    handleRerun,
    handleBatchRerun,
    handleTerminate,
    handleBatchTerminate,
    handleViewLogs,
    handleGoToCollector,
  };
}
