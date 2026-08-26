/**
 * 影响分析页 - Hook（WU-FE-07）
 * 影响分析（GetAssetsidImpactanalysis，sortBy depth/domain/risk 默认 depth；深度分组展平为行表）+
 * 导出（GetAssetsidImpactanalysisExport，202 异步任务幂等 + 审计）。
 * 错误提示依赖 mutator.ts 拦截器。ID 一律字符串透传（json-bigint），不做 Number 转换。
 */
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { GetAssetsid, GetAssetsidImpactanalysis, GetAssetsidImpactanalysisExport } from '@/api';
import type { AssetDetailItem } from '../../Asset/type';
import { customMessage } from '@/utils';
import type { ExportTaskItem, ImpactDataItem, ImpactItem, ImpactSortByValue } from '../type';

export function useImpactAnalysis() {
  const route = useRoute();
  const router = useRouter();
  const loading = ref(false);
  const loadError = ref(false);
  const exporting = ref(false);
  const centerAsset = ref<AssetDetailItem>({} as unknown as AssetDetailItem);
  const groups = ref<ImpactDataItem['groups']>([]);
  const sortBy = ref<ImpactSortByValue>('depth');
  /** 组件是否处于 keep-alive 激活态（避免停用期参数变化与激活回调双拉取，独立审查 F7 修复） */
  const isActive = ref(false);

  const centerId = computed(() => route.params.id as string | undefined);

  /** 拉取影响分析（深度分组；sortBy 影响组内排序） */
  const fetchImpact = async () => {
    const id = centerId.value;
    if (!id) return;
    loading.value = true;
    loadError.value = false;
    try {
      const detailRes = await GetAssetsid(id);
      centerAsset.value = (detailRes?.data as unknown as AssetDetailItem) ?? {};
      const res = await GetAssetsidImpactanalysis(id, { sortBy: sortBy.value });
      // 生成类型 ImpactResponse 的 data 为无属性 object，经 unknown 桥接为本地类型（切片 02 模式）
      const impact = (res?.data as unknown as ImpactDataItem) ?? {};
      groups.value = impact.groups ?? [];
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 切换排序（组内排序重新拉取） */
  const handleSortByChange = (value: unknown) => {
    const next = value as ImpactSortByValue;
    if (next === sortBy.value) return;
    sortBy.value = next;
    fetchImpact();
  };

  /** 深度分组展平为行表（保持组序：深度升序 + 组内 sortBy 序）；复合行 key 防多路径重复行冲突（合同 review_notes） */
  const rows = computed<Array<ImpactItem & { _rowKey: string }>>(() =>
    groups.value.flatMap(group => group.items.map(item => ({ ...item, _rowKey: `${item.assetId}-${group.depth}` })))
  );

  /** 空影响（无下游依赖；0 影响空结构非错误） */
  const isEmpty = computed(() => !loading.value && !loadError.value && groups.value.length === 0);

  /** 汇总：受影响资产数按 assetId 收敛（多路径重复行取最小深度），直接=min depth 1 */
  const summary = computed(() => {
    const minDepthByAsset = new Map<string, number>();
    for (const item of rows.value) {
      const depth = item.depth ?? 0;
      const prev = minDepthByAsset.get(item.assetId);
      if (prev === undefined || depth < prev) minDepthByAsset.set(item.assetId, depth);
    }
    const total = minDepthByAsset.size;
    const direct = [...minDepthByAsset.values()].filter(depth => depth <= 1).length;
    return { total, direct, indirect: total - direct };
  });

  /** 导出（202 异步任务幂等；成功提示任务信息，导出记录已审计） */
  const handleExport = async (format: 'csv' | 'json') => {
    const id = centerId.value;
    if (!id || exporting.value) return;
    exporting.value = true;
    try {
      const res = await GetAssetsidImpactanalysisExport(id, { format });
      // mutator.ts 请求拦截器对 URL 含 export 的请求强制 responseType=blob（文件下载启发式）；
      // 冻结契约该端点为 JSON 202 ExportTask（非文件下载），Blob 内含 JSON 载荷，此处解析回任务信息
      // （mutator.ts 不在本切片合同写路径内，消费端规避，偏离已登记）
      const blob = (res as unknown as { data?: Blob })?.data;
      let taskId = '';
      if (blob?.text) {
        try {
          const parsed = JSON.parse(await blob.text()) as { data?: ExportTaskItem };
          taskId = parsed?.data?.id ?? '';
        } catch {
          // Blob 内容非预期 JSON：降级为通用成功提示（独立复审 minor，避免静默无反馈）
        }
      }
      customMessage.success(
        `影响分析已导出（${format.toUpperCase()}），导出任务已创建，导出记录已审计${taskId ? `（任务 ${taskId}）` : ''}`
      );
    } catch {
      // 拦截器已统一提示，此处不重复
    } finally {
      exporting.value = false;
    }
  };

  /** 打开下游资产详情 */
  const goAsset = (assetId: string) => {
    router.push({ name: 'AssetDetail', params: { id: assetId } });
  };

  /** 返回血缘图谱（同中心资产） */
  const goLineage = () => {
    const id = centerId.value;
    if (!id) return;
    router.push({ name: 'AssetLineage', params: { id } });
  };

  /** 返回资产详情 */
  const goDetail = () => {
    const id = centerId.value;
    if (!id) return;
    router.push({ name: 'AssetDetail', params: { id } });
  };

  // 同路由不同 id 复用实例（keep-alive key=route.name）：激活态下参数变化时重新拉取
  watch(
    () => route.params.id as string | undefined,
    () => {
      if (isActive.value) fetchImpact();
    }
  );

  // keep-alive 激活（首进 + 返回）时刷新；排序条件保持
  onActivated(() => {
    isActive.value = true;
    fetchImpact();
  });

  onDeactivated(() => {
    isActive.value = false;
  });

  return {
    loading,
    loadError,
    exporting,
    centerAsset,
    groups,
    sortBy,
    rows,
    isEmpty,
    summary,
    fetchImpact,
    handleSortByChange,
    handleExport,
    goAsset,
    goLineage,
    goDetail,
  };
}
