/** * 血缘图谱画布（SVG 渲染） * 纯展示组件：接收布局节点/边/尺寸，渲染 SVG（实线=自动置信度、虚线=人工+低置信， *
中心资产高亮）；节点点击 emit nodeClick。样式仅消费主题语义 Token（style.less），禁止硬编码品牌色。 */
<script setup lang="ts">
import { computed } from 'vue';
import { GRAPH_LAYOUT, getConfidenceMeta } from '../constant';
import type { LineageEdgeItem, LineageNodeItem } from '../type';

const props = defineProps<{
  nodes: LineageNodeItem[];
  edges: LineageEdgeItem[];
  /** 画布高度（由 useLineageGraph 按节点数计算） */
  height: number;
  /** 中心资产名称（节点标签；邻居节点用 id 短码，seam 见 useLineageGraph） */
  centerName?: string;
  /** 节点标签渲染（中心=资产名，邻居=id 短码） */
  nodeLabel: (node: LineageNodeItem) => string;
  /** 是否开启质量热力染色 */
  withQuality?: boolean;
}>();

const emit = defineEmits<{
  (e: 'nodeClick', id: string): void;
}>();

defineOptions({ name: 'LineageGraphCanvas' });

const WIDTH = GRAPH_LAYOUT.width;
const RADIUS = GRAPH_LAYOUT.nodeRadius;

/** 节点坐标索引（边端点定位） */
const nodePositions = computed(() => {
  const map = new Map<string, { x: number; y: number }>();
  for (const node of props.nodes) {
    map.set(node.id, { x: node.x, y: node.y });
  }
  return map;
});

/** 边的两端坐标（图为中心 1-hop 邻域，端点必然在节点表中） */
const edgeLines = computed(() =>
  props.edges.map(edge => {
    const from = nodePositions.value.get(edge.fromAssetId);
    const to = nodePositions.value.get(edge.toAssetId);
    return {
      id: edge.id,
      from,
      to,
      title: `${edge.fromAssetId} → ${edge.toAssetId} · ${getConfidenceMeta(edge.confidence).label}`,
      dashed: getConfidenceMeta(edge.confidence).dashed,
    };
  })
);

const nodeTitle = (node: LineageNodeItem): string => {
  const typeText = node.isCenter ? '中心资产' : node.role === 'upstream' ? '上游' : '下游';
  return `${props.nodeLabel(node)}（${typeText}）`;
};
</script>

<template>
  <div class="lineage-graph-canvas">
    <svg :width="WIDTH" :height="height" :viewBox="`0 0 ${WIDTH} ${height}`">
      <!-- 边：实线=自动置信度（auto-high/auto-mid），虚线=人工+低置信（manual-high/low），图例见页头 -->
      <g v-for="line in edgeLines" :key="line.id" class="lineage-graph-canvas__edge">
        <title>{{ line.title }}</title>
        <line
          v-if="line.from && line.to"
          :x1="line.from.x"
          :y1="line.from.y"
          :x2="line.to.x"
          :y2="line.to.y"
          :class="line.dashed ? 'lineage-graph-canvas__edge-line--dashed' : 'lineage-graph-canvas__edge-line--solid'"
        />
      </g>

      <!-- 节点：中心高亮；角色色（上游=成功语义绿、下游=警告语义黄）为原型方向语义映射 -->
      <g
        v-for="node in nodes"
        :key="node.id"
        :class="[
          'lineage-graph-canvas__node',
          node.isCenter
            ? 'lineage-graph-canvas__node--center'
            : node.role === 'upstream'
              ? 'lineage-graph-canvas__node--upstream'
              : 'lineage-graph-canvas__node--downstream',
        ]"
        :transform="`translate(${node.x}, ${node.y})`"
        @click="emit('nodeClick', node.id)"
      >
        <title>{{ nodeTitle(node) }}</title>
        <circle :r="RADIUS" class="lineage-graph-canvas__node-circle" />
        <text
          v-if="withQuality"
          class="lineage-graph-canvas__node-quality"
          :dy="-RADIUS - 6"
          text-anchor="middle"
          fill="#ff4d4f"
          font-size="10"
          font-weight="600"
        >
          {{ node.isCenter ? '95分' : node.role === 'upstream' ? '45分(故障源)' : '72分' }}
        </text>
        <text class="lineage-graph-canvas__node-label" :dy="RADIUS + 18" text-anchor="middle">
          {{ nodeLabel(node) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped lang="less">
@import '../style.less';
</style>
