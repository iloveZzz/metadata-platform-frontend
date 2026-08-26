/**
 * 采集任务页 - 列表与过滤 Hook
 * 封装任务列表拉取、多条件快捷与高级过滤、前端分页、生效状态切换、立即执行/取消/失败重试等。
 */
import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { Modal } from 'ant-design-vue';
import { useTableHeight } from '@yss-ui/hooks';
import { GetConnectors, GetCollectors, PostCollectorsRun, PostCollectorsidCancel, PostCollectorsidRetry } from '@/api';
import { customInstance } from '@/api/mutator';
import { customMessage, handleErrorResponse } from '@/utils';
import type { CollectorFilterState, CollectorItem } from '../type';

const CURRENT_USER_ID = '1397905662202719';

export function useCollectorList({ tableAreaRef }: { tableAreaRef: Ref<HTMLElement | undefined> }) {
  const route = useRoute();
  const loading = ref(false);
  const loadError = ref(false);
  const rawList = ref<CollectorItem[]>([]);
  const connectorMap = ref<Record<string, { name: string; type: string }>>({});
  const connectorOptions = ref<{ label: string; value: string; type: string }[]>([]);

  // 顶部筛选条件
  const filterState = reactive<CollectorFilterState>({
    onlyMyTasks: false,
    onlyActive: false,
    keyword: typeof route.query?.keyword === 'string' ? route.query.keyword : '',
    datasourceTypes: [],
    modes: [],
    statuses: [],
  });

  watch(
    () => route.query?.keyword,
    kw => {
      if (typeof kw === 'string') {
        filterState.keyword = kw;
      }
    }
  );

  const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });
  const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true });

  /** 拉取连接器列表用于名称与类型映射 */
  const fetchConnectors = async () => {
    try {
      const res = await GetConnectors();
      const list = (res?.data ?? []) as { id: string; name: string; type?: string }[];
      const map: Record<string, { name: string; type: string }> = {};
      list.forEach(item => {
        map[item.id] = {
          name: item.name,
          type: item.type || 'MySQL',
        };
      });
      connectorMap.value = map;
      connectorOptions.value = list.map(item => ({
        label: item.name,
        value: item.id,
        type: item.type || 'MySQL',
      }));
    } catch {
      // 保持空映射
    }
  };

  /** 任务全量拉取（GET /api/collectors），并补充数据源友好名称和默认值 */
  const fetchList = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetCollectors();
      const list = (res?.data ?? []) as CollectorItem[];
      rawList.value = list.map(item => {
        const connInfo = connectorMap.value[item.connectorId];
        return {
          ...item,
          owner: item.owner || CURRENT_USER_ID,
          enabled: item.enabled !== false,
          datasourceType: item.datasourceType || connInfo?.type || 'MySQL',
          connectorName: connInfo?.name || item.connectorId,
          description: item.description || '',
          updatedAt: item.updatedAt ? item.updatedAt.replace('T', ' ').substring(0, 19) : '—',
          createdAt: item.createdAt ? item.createdAt.replace('T', ' ').substring(0, 19) : '—',
        };
      });
    } catch {
      rawList.value = [];
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 本地多条件过滤计算 */
  const filteredList = computed(() => {
    let result = rawList.value;

    // 1. 我负责的任务
    if (filterState.onlyMyTasks) {
      result = result.filter(item => item.owner === CURRENT_USER_ID);
    }

    // 2. 生效任务
    if (filterState.onlyActive) {
      result = result.filter(item => item.enabled === true);
    }

    // 3. 关键字搜索（任务名称或数据源）
    if (filterState.keyword && filterState.keyword.trim()) {
      const kw = filterState.keyword.trim().toLowerCase();
      result = result.filter(item => {
        const nameMatch = (item.name || '').toLowerCase().includes(kw);
        const dsMatch = (item.connectorName || item.connectorId || '').toLowerCase().includes(kw);
        return nameMatch || dsMatch;
      });
    }

    // 4. 数据源类型过滤
    if (filterState.datasourceTypes && filterState.datasourceTypes.length > 0) {
      result = result.filter(item => item.datasourceType && filterState.datasourceTypes.includes(item.datasourceType));
    }

    // 5. 采集模式过滤
    if (filterState.modes && filterState.modes.length > 0) {
      result = result.filter(item => item.mode && filterState.modes.includes(item.mode));
    }

    // 6. 任务状态过滤
    if (filterState.statuses && filterState.statuses.length > 0) {
      result = result.filter(item => item.status && filterState.statuses.includes(item.status));
    }

    return result;
  });

  /** 前端分页数据切片 */
  const pagedDataList = computed(() => {
    const list = filteredList.value;
    pagination.total = list.length;
    const start = (pagination.current - 1) * pagination.pageSize;
    return list.slice(start, start + pagination.pageSize);
  });

  /** 重置筛选条件 */
  const resetFilters = () => {
    filterState.onlyMyTasks = false;
    filterState.onlyActive = false;
    filterState.keyword = '';
    filterState.datasourceTypes = [];
    filterState.modes = [];
    filterState.statuses = [];
    pagination.current = 1;
  };

  const activeCollector = ref<CollectorItem | null>(null);
  const detailModalVisible = ref(false);

  /** 同步刷新当前弹窗展示的任务数据 */
  const syncActiveCollector = (id: string) => {
    if (activeCollector.value?.id === id) {
      const updated = rawList.value.find(item => item.id === id);
      if (updated) {
        activeCollector.value = updated;
      }
    }
  };

  /** 打开详情弹窗并拉取最新详情 */
  const handleViewDetail = async (row: CollectorItem) => {
    activeCollector.value = row;
    detailModalVisible.value = true;
    try {
      const detail = await customInstance<CollectorItem>({
        url: `/api/collectors/${row.id}`,
        method: 'GET',
      });
      if (detail && activeCollector.value?.id === row.id) {
        activeCollector.value = { ...row, ...detail };
      }
    } catch (error: any) {
      await handleErrorResponse(error).catch(() => undefined);
    }
  };

  /** 切换生效状态 (行内 Switch) */
  const handleToggleEnable = async (row: CollectorItem, enabledVal: boolean) => {
    row._switchLoading = true;
    try {
      await customInstance<any>({
        url: `/api/collectors/${row.id}/status`,
        method: 'PUT',
        data: { enabled: enabledVal },
      });
      row.enabled = enabledVal;
      customMessage.success(`任务「${row.name}」已${enabledVal ? '启用' : '停用'}`);
      if (activeCollector.value?.id === row.id) {
        activeCollector.value.enabled = enabledVal;
      }
    } catch (error: any) {
      await handleErrorResponse(error).catch(() => undefined);
    } finally {
      row._switchLoading = false;
    }
  };

  /** 手动执行 / 立即启动（确认弹窗 + loading 过渡效果，幂等：运行中 409 -> 定制提示） */
  const handleRun = (row: CollectorItem) => {
    if (row.status === 'running' || row.enabled === false) {
      return;
    }
    Modal.confirm({
      title: '确认立即启动采集任务？',
      content: `即将手动触发采集任务【${row.name}】，系统将根据数据源配置采集最新元数据并生成采集实例。`,
      okText: '确认启动',
      cancelText: '取消',
      onOk: async () => {
        row._runLoading = true;
        try {
          await PostCollectorsRun({ collectorId: row.id }, { skipErrorHandler: true });
          customMessage.success(`已成功启动采集任务「${row.name}」`);
          await fetchList();
          syncActiveCollector(row.id);
        } catch (error: any) {
          if (error?.response?.status === 409) {
            customMessage.error('任务运行中，不可重复触发');
          } else {
            await handleErrorResponse(error).catch(() => undefined);
          }
        } finally {
          row._runLoading = false;
        }
      },
    });
  };

  /** 停止 / 取消执行（确认弹窗 + loading 过渡效果，仅运行中任务可停止） */
  const handleCancel = (row: CollectorItem) => {
    if (row.status !== 'running') {
      return;
    }
    Modal.confirm({
      title: '确认停止该采集任务？',
      content: `确定停止正在运行的采集任务【${row.name}】？正在进行的采集作业将被中断。`,
      okText: '确认停止',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        row._cancelLoading = true;
        try {
          await PostCollectorsidCancel(row.id);
          customMessage.success(`任务「${row.name}」已停止`);
          await fetchList();
          syncActiveCollector(row.id);
        } catch (error: any) {
          await handleErrorResponse(error).catch(() => undefined);
        } finally {
          row._cancelLoading = false;
        }
      },
    });
  };

  /** 删除采集任务（确认弹窗 + loading 过渡效果，运行中不可删除；同时清除调度） */
  const handleDelete = (row: CollectorItem) => {
    if (row.status === 'running') {
      customMessage.error('运行中的采集任务不能删除，请先停止任务');
      return;
    }
    Modal.confirm({
      title: '确认删除采集任务？',
      content: `确认删除采集任务【${row.name}】？删除后将同步移除其定时调度排程，此操作不可撤销！`,
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        row._deleteLoading = true;
        try {
          await customInstance<any>({
            url: `/api/collectors/${row.id}`,
            method: 'DELETE',
          });
          customMessage.success(`采集任务「${row.name}」已成功删除`);
          if (activeCollector.value?.id === row.id) {
            detailModalVisible.value = false;
            activeCollector.value = null;
          }
          await fetchList();
        } catch (error: any) {
          if (error?.response?.status === 409) {
            customMessage.error('运行中的采集任务不能删除，请先停止任务');
          } else {
            await handleErrorResponse(error).catch(() => undefined);
          }
        } finally {
          row._deleteLoading = false;
        }
      },
    });
  };

  /** 失败重试 */
  const handleRetry = async (row: CollectorItem) => {
    try {
      await PostCollectorsidRetry(row.id, { failedItemsOnly: true });
      customMessage.success(`已触发「${row.name}」失败重试（仅重采失败项）`);
      await fetchList();
      syncActiveCollector(row.id);
    } catch (error: any) {
      await handleErrorResponse(error).catch(() => undefined);
    }
  };

  onMounted(async () => {
    await fetchConnectors();
    await fetchList();
  });

  return {
    loading,
    loadError,
    dataList: pagedDataList,
    rawList,
    filteredList,
    filterState,
    connectorMap,
    connectorOptions,
    pagination,
    tableHeight,
    activeCollector,
    detailModalVisible,
    detailDrawerVisible: detailModalVisible,
    fetchList,
    resetFilters,
    handleViewDetail,
    handleToggleEnable,
    handleRun,
    handleCancel,
    handleDelete,
    handleRetry,
  };
}
