/**
 * 资产目录 / 元数据清单页 - 业务逻辑 Hook
 * 严格遵循 yss-hook、yss-use-table-height 与 Vue 3 组合式 API 规范。
 */
import { computed, onActivated, reactive, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTableHeight } from '@yss-ui/hooks';
import type { GetAssetsSort, GetAssetsType } from '@/api/generated/metadata/schemas';
import { GetAssets, PostAssetsidClaim, PostAssetsidFavorite, PutAssetsidExclude, PutAssetsidRecover } from '@/api';
import { customMessage, handleErrorResponse } from '@/utils';
import type { AssetFilterState, AssetItem, MetadataTabKey } from '../type';

export function useAssetList({ tableAreaRef }: { tableAreaRef: Ref<HTMLElement | undefined> }) {
  const router = useRouter();
  const loading = ref(false);
  const loadError = ref(false);
  const dataList = ref<AssetItem[]>([]);

  /** 顶部主 Tab（默认：元数据清单 / 数据表） */
  const activeTab = ref<MetadataTabKey>('data_table');

  /** 当前选中的左侧节点信息 */
  const selectedNodeInfo = ref<{
    type: 'system' | 'datasource' | 'category' | 'database' | 'root' | 'connector' | 'all';
    name: string;
    id?: string;
    code?: string;
    database?: string;
    datasourceId?: string;
    systemName?: string;
  }>({
    type: 'all',
    name: '',
  });

  /** 当前选中的左侧系统/数据源名称 */
  const selectedSystemName = computed(() => selectedNodeInfo.value.name || '');

  /** 排序规则 */
  const sort = ref<GetAssetsSort>('updatedAt');

  /** 统一多维筛选状态 */
  const filter = reactive<AssetFilterState>({
    keyword: '',
    onlyExcluded: false,
    database: undefined,
    sourceSystem: undefined,
    source: undefined,
    sourceId: undefined,
    type: undefined,
    domain: undefined,
    classification: undefined,
    favorite: false,
    mine: false,
  });

  /** YTable 分页配置 */
  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
  });

  // 严格遵守 useTableHeight 规范：解构语法 + withPagination
  const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true });

  /** 当前系统总计元数据统计数 */
  const currentSystemTotalCount = computed(() => {
    return pagination.total;
  });

  /** 数据源与数据域去重筛选选项 */
  const sourceOptions = computed(() => {
    const list = [
      'Dev mysql测试演示[ds_mysql2_dev]',
      'Prod pg_dw_cluster',
      'Dev oracle_erp_demo',
      'Prod clickhouse_dw',
    ];
    return list.map(s => ({ label: s, value: s }));
  });

  const domainOptions = computed(() => {
    const list = ['通用数据域', '财务域', '人力资源域', '交易域', '客户域', '制造执行域'];
    return list.map(d => ({ label: d, value: d }));
  });

  const buildParams = (): any => ({
    page: pagination.current,
    size: pagination.pageSize,
    sort: sort.value,
    keyword: filter.keyword?.trim() || undefined,
    source: filter.source || undefined,
    sourceId: filter.sourceId || undefined,
    database: filter.database || undefined,
    sourceSystem: filter.sourceSystem || undefined,
    isExcluded: filter.onlyExcluded ? true : undefined,
    type: (filter.type as GetAssetsType) || undefined,
    domain: filter.domain || undefined,
    classification: filter.classification || undefined,
    favorite: filter.favorite || undefined,
    mine: filter.mine || undefined,
  });

  /** 规范化表格行数据 */
  const normalizeAssetItem = (item: any): AssetItem => {
    return {
      id: String(item.id ?? ''),
      name: item.name ?? '',
      description: item.description ?? '',
      type: item.type ?? '表',
      sourceId: item.sourceId ?? '',
      source: item.source ?? '',
      databaseName: item.databaseName ?? item.schemaName ?? '',
      schemaName: item.schemaName ?? item.databaseName ?? '',
      domain: item.domain ?? '',
      sourceSystem: item.sourceSystem ?? (selectedNodeInfo.value.type === 'system' ? selectedNodeInfo.value.name : ''),
      owner: item.owner ?? '',
      classification: item.classification ?? '内部',
      status: item.status ?? 'pending',
      isExcluded: item.isExcluded ?? false,
      version: item.version ?? '',
      collectorTaskId: item.collectorTaskId ?? item.collectorId ?? '',
      collectorName: item.collectorName ?? '',
      updateFrequency: item.updateFrequency ?? '',
      scheduleDescription: item.scheduleDescription ?? '',
      favorite: item.favorite ?? false,
      taintStatus: item.taintStatus ?? 'NORMAL',
      healthScore: item.healthScore ?? 100,
      qualityBand: item.qualityBand ?? 'excellent',
      updatedAt: item.updatedAt ?? '',
    };
  };

  /** 获取列表数据 */
  const fetchList = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetAssets(buildParams());
      const rawData = (res?.data as unknown as AssetItem[]) ?? [];
      dataList.value = rawData.map(item => normalizeAssetItem(item));
      pagination.total = Number(res?.totalCount ?? dataList.value.length);
    } catch {
      dataList.value = [];
      pagination.total = 0;
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 本地复合过滤后列表（支持来源系统树 + 已剔除复选 + 关键词精准过滤） */
  const filteredList = computed(() => {
    return dataList.value.filter(item => {
      // 1. 已剔除过滤
      if (filter.onlyExcluded && !item.isExcluded) {
        return false;
      }
      if (!filter.onlyExcluded && item.isExcluded) {
        return false;
      }

      // 2. 节点过滤（数据库 / 应用系统 / 数据源）
      if (selectedNodeInfo.value.type === 'database' && selectedNodeInfo.value.database) {
        const targetDb = selectedNodeInfo.value.database.trim().toLowerCase();
        const itemDb = (item.databaseName || item.schemaName || '').trim().toLowerCase();
        if (itemDb && itemDb !== targetDb) {
          return false;
        }
      } else if (selectedNodeInfo.value.type === 'system' && selectedNodeInfo.value.name) {
        const sysName = selectedNodeInfo.value.name.trim().toLowerCase();
        const sysCode = (selectedNodeInfo.value.code || '').trim().toLowerCase();
        if (item.sourceSystem) {
          const itemSys = item.sourceSystem.trim().toLowerCase();
          if (itemSys !== sysName && itemSys !== sysCode) {
            return false;
          }
        }
      } else if (
        selectedNodeInfo.value.type === 'datasource' &&
        (selectedNodeInfo.value.id || selectedNodeInfo.value.name)
      ) {
        const targetDsId = (selectedNodeInfo.value.id || selectedNodeInfo.value.datasourceId || '').trim();
        const targetDs = (selectedNodeInfo.value.name || '').trim().toLowerCase();
        if (targetDsId && item.sourceId) {
          if (item.sourceId !== targetDsId) {
            return false;
          }
        } else if (targetDs && item.source && !item.source.toLowerCase().includes(targetDs)) {
          return false;
        }
      }

      // 3. 关键词过滤
      if (filter.keyword && filter.keyword.trim()) {
        const kw = filter.keyword.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(kw);
        const matchSource = item.source?.toLowerCase().includes(kw);
        const matchSchema = (item.schemaName || item.databaseName)?.toLowerCase().includes(kw);
        const matchDesc = item.description?.toLowerCase().includes(kw);
        if (!matchName && !matchSource && !matchSchema && !matchDesc) {
          return false;
        }
      }

      // 4. 数据源过滤
      if (filter.source && item.source && !item.source.toLowerCase().includes(filter.source.toLowerCase())) {
        return false;
      }

      // 5. 分类过滤
      if (filter.classification && item.classification !== filter.classification) {
        return false;
      }

      return true;
    });
  });

  /** 分页回调 */
  const onPageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    fetchList();
  };

  const resetPageAndFetch = () => {
    pagination.current = 1;
    fetchList();
  };

  /** 左侧系统树选中节点事件 */
  const handleSelectNode = (payload: {
    type: 'system' | 'datasource' | 'category' | 'database' | 'root' | 'connector' | 'all';
    name: string;
    id?: string;
    code?: string;
    systemCode?: string;
    database?: string;
    datasourceId?: string;
    source?: string;
    systemName?: string;
  }) => {
    selectedNodeInfo.value = payload;
    if (payload.type === 'database') {
      filter.database = payload.database || payload.name;
      filter.source = payload.source;
      filter.sourceId = payload.datasourceId;
      filter.sourceSystem = payload.systemCode || payload.code;
    } else if (payload.type === 'system') {
      filter.sourceSystem = payload.code || payload.systemCode || payload.name;
      filter.source = undefined;
      filter.sourceId = undefined;
      filter.database = undefined;
    } else if (payload.type === 'datasource') {
      filter.source = payload.name;
      filter.sourceId = payload.id || payload.datasourceId;
      filter.database = undefined;
      filter.sourceSystem = payload.systemCode || payload.code;
    } else {
      filter.sourceSystem = undefined;
      filter.source = undefined;
      filter.sourceId = undefined;
      filter.database = undefined;
    }
    resetPageAndFetch();
  };

  /** 顶部主 Tab 切换 */
  const handleTabChange = (key: MetadataTabKey) => {
    activeTab.value = key;
    fetchList();
  };

  /** 收藏切换 */
  const handleToggleFavorite = async (row: AssetItem) => {
    try {
      const res = await PostAssetsidFavorite(row.id);
      const updated = (res?.data as unknown as AssetItem) ?? {};
      const idx = dataList.value.findIndex(item => item.id === row.id);
      if (idx > -1) {
        dataList.value[idx] = { ...dataList.value[idx], favorite: updated.favorite };
      }
      customMessage.success(updated.favorite ? `已收藏「${row.name}」` : `已取消收藏「${row.name}」`);
    } catch {
      // 拦截器已统一提示
    }
  };

  /** 认领资产 */
  const handleClaim = async (row: AssetItem) => {
    try {
      await PostAssetsidClaim(row.id, { skipErrorHandler: true });
      customMessage.success(`已成功认领「${row.name}」`);
      await fetchList();
    } catch (error: any) {
      if (error?.response?.status === 409) {
        customMessage.error(`认领冲突（409）：资产「${row.name}」已被他人认领`);
      } else {
        await handleErrorResponse(error).catch(() => undefined);
      }
    }
  };

  /** 剔除 / 恢复资产 */
  const handleToggleExclude = async (row: AssetItem) => {
    try {
      if (!row.isExcluded) {
        await PutAssetsidExclude(row.id);
        customMessage.success(`已将「${row.name}」移入剔除清单`);
      } else {
        await PutAssetsidRecover(row.id);
        customMessage.success(`已恢复「${row.name}」至正常清单`);
      }
      await fetchList();
    } catch (error: any) {
      await handleErrorResponse(error).catch(() => undefined);
    }
  };

  /** 跳转详情 */
  const goDetail = (row: AssetItem) => {
    router.push({ name: 'AssetDetail', params: { id: row.id } });
  };

  /** 跳转采集任务 */
  const goToCollector = (row: AssetItem) => {
    router.push({ path: '/collector', query: { taskId: row.collectorTaskId } });
  };

  onActivated(() => {
    fetchList();
  });

  return {
    loading,
    loadError,
    dataList,
    filteredList,
    activeTab,
    selectedNodeInfo,
    selectedSystemName,
    currentSystemTotalCount,
    sort,
    filter,
    pagination,
    tableHeight,
    sourceOptions,
    domainOptions,
    fetchList,
    onPageChange,
    resetPageAndFetch,
    handleSelectNode,
    handleSelectSystem: handleSelectNode,
    handleTabChange,
    handleToggleFavorite,
    handleClaim,
    handleToggleExclude,
    goDetail,
    goToCollector,
  };
}
