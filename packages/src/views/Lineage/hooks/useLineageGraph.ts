/**
 * 血缘图谱页 - 图谱 Hook（WU-FE-05）
 * 中心资产详情（GetAssetsid）+ 图谱（GetAssetsidLineage，confidence 服务端筛选）+
 * 星型布局计算（后端 findGraph 返回 from/to=中心的 1-hop 邻域边：中心中列、上游左列、下游右列）。
 * 错误提示依赖 mutator.ts 拦截器；图版本 token 从图谱响应透传给补录编辑器（CONFLICT 恢复路径）。
 * ID 一律字符串透传（json-bigint），不做 Number 转换。
 *
 * seam 登记：冻结契约图谱响应仅含资产 id（无名称字段），邻居节点标签展示 id 短码 + tooltip
 * 全量，中心资产名来自详情接口；节点名称富化需批量资产端点，登记为前端 seam。
 */
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { GetAssetsid, GetAssetsidLineage } from '@/api';
import type { AssetDetailItem } from '../../Asset/type';
import type { ConfidenceFilterValue, LineageEdgeItem, LineageGraphItem, LineageNodeItem } from '../type';
import { CONFIDENCE_FILTER_OPTIONS, GRAPH_LAYOUT } from '../constant';

export function useLineageGraph() {
  const route = useRoute();
  const router = useRouter();
  const loading = ref(false);
  const loadError = ref(false);
  const centerAsset = ref<AssetDetailItem>({} as unknown as AssetDetailItem);
  const edges = ref<LineageEdgeItem[]>([]);
  const graphVersionToken = ref<string | undefined>();
  const confidence = ref<ConfidenceFilterValue>('all');
  /** 组件是否处于 keep-alive 激活态（避免停用期参数变化与激活回调双拉取，独立审查 F7 修复） */
  const isActive = ref(false);

  const centerId = computed(() => route.params.id as string | undefined);

  /** 中心资产只读态（归档/已删除 → 禁用人工补录入口；查看不受限，状态矩阵「资产详情-只读」） */
  const readonly = computed(() => centerAsset.value.status === 'archived' || centerAsset.value.status === 'deleted');

  /** 拉取图谱（中心详情 + confidence 筛选边；空血缘以空 edges 表达非错误） */
  const fetchGraph = async () => {
    const id = centerId.value;
    if (!id) return;
    loading.value = true;
    loadError.value = false;
    try {
      const detailRes = await GetAssetsid(id);
      centerAsset.value = (detailRes?.data as unknown as AssetDetailItem) ?? {};
      const res = await GetAssetsidLineage(id, { confidence: confidence.value });
      // 生成类型 LineageResponse 的 data 为无属性 object，经 unknown 桥接为本地类型（切片 02 模式）
      const graph = (res?.data as unknown as LineageGraphItem) ?? {};
      edges.value = graph.edges ?? [];
      graphVersionToken.value = graph.graphVersionToken ?? undefined;
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 切换置信度筛选（服务端筛选重新拉取；全量=all） */
  const handleConfidenceChange = (value: unknown) => {
    const next = value as ConfidenceFilterValue;
    if (next === confidence.value) return;
    confidence.value = next;
    fetchGraph();
  };

  /** 节点划分：上游（边 to=中心）/ 下游（边 from=中心）；按边序去重 */
  const nodeIds = computed(() => {
    const id = centerId.value;
    if (!id) return { upstream: [] as string[], downstream: [] as string[] };
    const upstream: string[] = [];
    const downstream: string[] = [];
    for (const edge of edges.value) {
      if (edge.toAssetId === id && !upstream.includes(edge.fromAssetId)) upstream.push(edge.fromAssetId);
      if (edge.fromAssetId === id && !downstream.includes(edge.toAssetId)) downstream.push(edge.toAssetId);
    }
    return { upstream, downstream };
  });

  /** 画布高度（随侧列节点数增长） */
  const canvasHeight = computed(() => {
    const { upstream, downstream } = nodeIds.value;
    const sideCount = Math.max(upstream.length, downstream.length, 1);
    return Math.max(GRAPH_LAYOUT.baseHeight, sideCount * GRAPH_LAYOUT.rowGap + GRAPH_LAYOUT.sidePadding * 2);
  });

  /** 布局节点（星型：中心中列、上游左列、下游右列，侧列垂直均布） */
  const nodes = computed<LineageNodeItem[]>(() => {
    const id = centerId.value;
    if (!id) return [];
    const { upstream, downstream } = nodeIds.value;
    const sideCount = Math.max(upstream.length, downstream.length, 1);
    const height = canvasHeight.value;
    const sideY = (index: number) =>
      GRAPH_LAYOUT.sidePadding + (index + 0.5) * ((height - GRAPH_LAYOUT.sidePadding * 2) / sideCount);
    const list: LineageNodeItem[] = [{ id, role: 'center', x: GRAPH_LAYOUT.centerX, y: height / 2, isCenter: true }];
    upstream.forEach((nodeId, index) =>
      list.push({ id: nodeId, role: 'upstream', x: GRAPH_LAYOUT.sideX, y: sideY(index) })
    );
    downstream.forEach((nodeId, index) =>
      list.push({ id: nodeId, role: 'downstream', x: GRAPH_LAYOUT.width - GRAPH_LAYOUT.sideX, y: sideY(index) })
    );
    return list;
  });

  /** 空血缘（非加载/错误且无边） */
  const isEmpty = computed(() => !loading.value && !loadError.value && edges.value.length === 0);

  /** 空态描述（区分「无血缘」与「当前置信度筛选下无血缘边」，原型两态，独立审查 F3 修复） */
  const emptyDescription = computed(() => {
    if (confidence.value === 'all') {
      return `「${centerAsset.value.name || centerAsset.value.id}」暂无血缘关系`;
    }
    const label = CONFIDENCE_FILTER_OPTIONS.find(item => item.value === confidence.value)?.label ?? '';
    return `当前置信度筛选（${label}）下无血缘边`;
  });

  /** 节点显示名（中心=资产名；邻居=id 短码，tooltip 全量，seam 见文件头） */
  const getNodeLabel = (node: LineageNodeItem): string => {
    if (node.isCenter) return centerAsset.value.name || node.id;
    return node.id.length > 12 ? `${node.id.slice(0, 6)}…${node.id.slice(-4)}` : node.id;
  };

  /** 打开资产详情（节点点击） */
  const goAssetDetail = (assetId: string) => {
    router.push({ name: 'AssetDetail', params: { id: assetId } });
  };

  /** 跳转影响分析（同中心资产） */
  const goImpact = () => {
    const id = centerId.value;
    if (!id) return;
    router.push({ name: 'AssetImpact', params: { id } });
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
      if (isActive.value) fetchGraph();
    }
  );

  // keep-alive 激活（首进 + 返回）时刷新；筛选条件保持
  onActivated(() => {
    isActive.value = true;
    fetchGraph();
  });

  onDeactivated(() => {
    isActive.value = false;
  });

  return {
    loading,
    loadError,
    centerAsset,
    edges,
    graphVersionToken,
    confidence,
    centerId,
    readonly,
    canvasHeight,
    nodes,
    isEmpty,
    emptyDescription,
    getNodeLabel,
    fetchGraph,
    handleConfidenceChange,
    goAssetDetail,
    goImpact,
    goDetail,
  };
}
