<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  KeyOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import type { ColumnLineageEdge, ColumnLineageNode } from '@/api/columnLineage';

defineOptions({ name: 'ColumnLineageGraphCanvas' });

const props = defineProps<{
  centerAssetId: string;
  nodes: ColumnLineageNode[];
  edges: ColumnLineageEdge[];
  height?: number;
}>();

const emit = defineEmits<{
  (e: 'selectColumn', col: ColumnLineageNode): void;
  (e: 'analyzeImpact', col: ColumnLineageNode): void;
}>();

const zoomLevel = ref(1.0);
const searchKeyword = ref('');
const hoveredColumnKey = ref<string | null>(null);
const selectedColumnKey = ref<string | null>(null);

const colKey = (assetId: string, colName?: string) => `${assetId}:${(colName || '').toLowerCase()}`;

// 按资产分组节点
const tableGroups = computed(() => {
  const map = new Map<
    string,
    {
      assetId: string;
      assetName: string;
      isCenter: boolean;
      role: 'upstream' | 'center' | 'downstream';
      columns: ColumnLineageNode[];
    }
  >();

  // 判断角色
  for (const node of props.nodes) {
    if (!map.has(node.assetId)) {
      const isCenter = node.assetId === props.centerAssetId;
      // 检查边确定角色
      const isUpstream = props.edges.some(e => e.fromAssetId === node.assetId && e.toAssetId === props.centerAssetId);
      const role = isCenter ? 'center' : isUpstream ? 'upstream' : 'downstream';
      map.set(node.assetId, {
        assetId: node.assetId,
        assetName: node.assetName || node.tableName,
        isCenter,
        role,
        columns: [],
      });
    }
    map.get(node.assetId)!.columns.push(node);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.role === 'upstream' && b.role !== 'upstream') return -1;
    if (a.role === 'center' && b.role === 'downstream') return -1;
    if (a.role === 'downstream' && b.role !== 'downstream') return 1;
    return 0;
  });
});

// 计算各表与字段在画布中的绝对布局坐标
const TABLE_WIDTH = 240;
const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 32;
const COL_GAP = 160;

const tableLayouts = computed(() => {
  const upTables = tableGroups.value.filter(g => g.role === 'upstream');
  const centerTable = tableGroups.value.find(g => g.role === 'center');
  const downTables = tableGroups.value.filter(g => g.role === 'downstream');

  const layouts: Array<{
    group: (typeof tableGroups.value)[0];
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  let startY = 40;
  // Upstream 列 (x = 40)
  upTables.forEach(t => {
    const h = HEADER_HEIGHT + t.columns.length * ROW_HEIGHT + 10;
    layouts.push({ group: t, x: 40, y: startY, width: TABLE_WIDTH, height: h });
    startY += h + 24;
  });

  // Center 列 (x = 40 + TABLE_WIDTH + COL_GAP)
  if (centerTable) {
    const h = HEADER_HEIGHT + centerTable.columns.length * ROW_HEIGHT + 10;
    layouts.push({ group: centerTable, x: 40 + TABLE_WIDTH + COL_GAP, y: 40, width: TABLE_WIDTH, height: h });
  }

  // Downstream 列 (x = 40 + (TABLE_WIDTH + COL_GAP) * 2)
  startY = 40;
  downTables.forEach(t => {
    const h = HEADER_HEIGHT + t.columns.length * ROW_HEIGHT + 10;
    layouts.push({ group: t, x: 40 + (TABLE_WIDTH + COL_GAP) * 2, y: startY, width: TABLE_WIDTH, height: h });
    startY += h + 24;
  });

  return layouts;
});

// 计算字段端点坐标
const columnAnchors = computed(() => {
  const map = new Map<string, { leftX: number; rightX: number; y: number; col: ColumnLineageNode }>();

  tableLayouts.value.forEach(tbl => {
    tbl.group.columns.forEach((col, idx) => {
      const key = colKey(col.assetId, col.columnName);
      const y = tbl.y + HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
      map.set(key, {
        leftX: tbl.x,
        rightX: tbl.x + tbl.width,
        y,
        col,
      });
    });
  });

  return map;
});

// 计算连线贝塞尔曲线
const renderedEdges = computed(() => {
  return props.edges
    .map(edge => {
      const fromKey = colKey(edge.fromAssetId, edge.fromColumnId);
      const toKey = colKey(edge.toAssetId, edge.toColumnId);
      const fromAnchor = columnAnchors.value.get(fromKey);
      const toAnchor = columnAnchors.value.get(toKey);

      if (!fromAnchor || !toAnchor) return null;

      const x1 = fromAnchor.rightX;
      const y1 = fromAnchor.y;
      const x2 = toAnchor.leftX;
      const y2 = toAnchor.y;

      const dx = (x2 - x1) * 0.5;
      const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      const isHighlighted =
        hoveredColumnKey.value === fromKey ||
        hoveredColumnKey.value === toKey ||
        selectedColumnKey.value === fromKey ||
        selectedColumnKey.value === toKey;

      return {
        id: edge.id,
        path,
        edge,
        fromKey,
        toKey,
        isHighlighted,
        midX: (x1 + x2) / 2,
        midY: (y1 + y2) / 2,
      };
    })
    .filter(Boolean);
});

const handleColumnClick = (col: ColumnLineageNode) => {
  const key = colKey(col.assetId, col.columnName);
  selectedColumnKey.value = selectedColumnKey.value === key ? null : key;
  emit('selectColumn', col);
};

const handleImpactClick = (col: ColumnLineageNode, e: Event) => {
  e.stopPropagation();
  emit('analyzeImpact', col);
};

const isMatchedKeyword = (name: string) => {
  if (!searchKeyword.value.trim()) return false;
  return name.toLowerCase().includes(searchKeyword.value.trim().toLowerCase());
};
</script>

<template>
  <div class="column-lineage-canvas-wrapper">
    <!-- 工具栏 -->
    <div class="canvas-toolbar">
      <a-input v-model:value="searchKeyword" placeholder="搜索字段名称高亮..." style="width: 200px" allow-clear>
        <template #prefix><SearchOutlined /></template>
      </a-input>

      <a-space>
        <a-button size="small" @click="zoomLevel = Math.min(zoomLevel + 0.1, 1.8)">
          <template #icon><ZoomInOutlined /></template>
        </a-button>
        <a-button size="small" @click="zoomLevel = Math.max(zoomLevel - 0.1, 0.5)">
          <template #icon><ZoomOutOutlined /></template>
        </a-button>
        <a-button size="small" @click="zoomLevel = 1.0">
          <template #icon><ReloadOutlined /></template>
        </a-button>
        <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
      </a-space>
    </div>

    <!-- 画布主体 -->
    <div class="canvas-viewport" :style="{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }">
      <!-- SVG 连线层 -->
      <svg class="lineage-svg-layer" width="1200" :height="height || 650">
        <defs>
          <marker id="col-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#adc6ff" />
          </marker>
          <marker id="col-arrow-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#1890ff" />
          </marker>
        </defs>

        <g v-for="item in renderedEdges" :key="item?.id">
          <path
            :d="item?.path"
            :class="['bezier-edge', { 'bezier-edge--active': item?.isHighlighted }]"
            :marker-end="item?.isHighlighted ? 'url(#col-arrow-active)' : 'url(#col-arrow)'"
          />
          <text
            v-if="item?.isHighlighted && item?.edge.transformExpr"
            :x="item?.midX"
            :y="item?.midY - 6"
            text-anchor="middle"
            class="edge-label"
          >
            {{ item?.edge.transformExpr }}
          </text>
        </g>
      </svg>

      <!-- HTML 表格容器层 -->
      <div
        v-for="tbl in tableLayouts"
        :key="tbl.group.assetId"
        class="table-node-card"
        :class="{ 'center-card': tbl.group.isCenter }"
        :style="{
          left: `${tbl.x}px`,
          top: `${tbl.y}px`,
          width: `${tbl.width}px`,
        }"
      >
        <div class="table-card-header">
          <span class="role-tag" :class="tbl.group.role">
            {{ tbl.group.isCenter ? '中心资产' : tbl.group.role === 'upstream' ? '上游表' : '下游表' }}
          </span>
          <span class="table-name" :title="tbl.group.assetName">{{ tbl.group.assetName }}</span>
        </div>

        <div class="table-card-columns">
          <div
            v-for="col in tbl.group.columns"
            :key="col.columnId"
            class="column-row"
            :class="{
              'row-active': selectedColumnKey === colKey(col.assetId, col.columnName),
              'row-matched': isMatchedKeyword(col.columnName),
            }"
            @mouseenter="hoveredColumnKey = colKey(col.assetId, col.columnName)"
            @mouseleave="hoveredColumnKey = null"
            @click="handleColumnClick(col)"
          >
            <div class="col-left">
              <KeyOutlined v-if="col.isPrimaryKey" class="pk-icon" title="主键" />
              <span class="col-name" :title="col.columnName">{{ col.columnName }}</span>
            </div>

            <div class="col-right">
              <span class="data-type">{{ col.dataType || 'VARCHAR' }}</span>
              <a-tooltip title="爆炸半径影响分析">
                <ThunderboltOutlined class="impact-icon" @click="handleImpactClick(col, $event)" />
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.column-lineage-canvas-wrapper {
  position: relative;
  width: 100%;
  min-height: 650px;
  background: #f7f9fc;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: auto;

  .canvas-toolbar {
    position: sticky;
    top: 12px;
    left: 12px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.95);
    padding: 6px 12px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    .zoom-text {
      font-size: 12px;
      color: #8c8c8c;
      width: 36px;
    }
  }

  .canvas-viewport {
    position: relative;
    width: 1200px;
    min-height: 650px;
    padding: 20px;
  }

  .lineage-svg-layer {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1;

    .bezier-edge {
      fill: none;
      stroke: #adc6ff;
      stroke-width: 1.5;
      transition:
        stroke 0.2s,
        stroke-width 0.2s;

      &--active {
        stroke: #1890ff;
        stroke-width: 2.5;
      }
    }

    .edge-label {
      font-size: 10px;
      fill: #eb2f96;
      font-family: monospace;
      background: #ffffff;
    }
  }

  .table-node-card {
    position: absolute;
    z-index: 2;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    overflow: hidden;

    &.center-card {
      border: 2px solid #1890ff;
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);

      .table-card-header {
        background: #e6f7ff;
      }
    }

    .table-card-header {
      height: 38px;
      padding: 0 10px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 6px;

      .role-tag {
        font-size: 10px;
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: 500;

        &.upstream {
          background: #f6ffed;
          color: #52c41a;
          border: 1px solid #b7eb8f;
        }
        &.center {
          background: #e6f7ff;
          color: #1890ff;
          border: 1px solid #91d5ff;
        }
        &.downstream {
          background: #fffbe6;
          color: #faad14;
          border: 1px solid #ffe58f;
        }
      }

      .table-name {
        font-size: 12px;
        font-weight: 600;
        color: #262626;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .table-card-columns {
      display: flex;
      flex-direction: column;

      .column-row {
        height: 32px;
        padding: 0 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        border-bottom: 1px solid #f8f8f8;
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
          background: #f0f7ff;
        }

        &.row-active {
          background: #bae7ff;
          font-weight: 600;
        }

        &.row-matched {
          background: #fffb8f;
        }

        .col-left {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow: hidden;

          .pk-icon {
            color: #faad14;
            font-size: 11px;
          }

          .col-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #262626;
          }
        }

        .col-right {
          display: flex;
          align-items: center;
          gap: 6px;

          .data-type {
            font-size: 10px;
            color: #8c8c8c;
            font-family: monospace;
          }

          .impact-icon {
            color: #fa8c16;
            font-size: 12px;
            cursor: pointer;
            padding: 2px;
            border-radius: 2px;

            &:hover {
              background: #ffe7ba;
            }
          }
        }
      }
    }
  }
}
</style>
