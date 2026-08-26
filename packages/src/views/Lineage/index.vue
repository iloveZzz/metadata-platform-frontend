/** * 血缘图谱页（支持表级血缘与深层字段级血缘切换、爆炸半径分析与人工补录） */
<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { YButton, YCard } from '@yss-ui/components';
import { ApartmentOutlined, EditOutlined, BranchesOutlined, AppstoreOutlined } from '@ant-design/icons-vue';
import { useLineageGraph } from './hooks/useLineageGraph';
import { useLineageEditor } from './hooks/useLineageEditor';
import LineageGraphCanvas from './components/LineageGraphCanvas.vue';
import LineageEditor from './components/LineageEditor.vue';
import ColumnLineageGraphCanvas from './components/ColumnLineageGraphCanvas.vue';
import ColumnImpactDrawer from './components/ColumnImpactDrawer.vue';
import ColumnLineageManualModal from './components/ColumnLineageManualModal.vue';
import { CONFIDENCE_FILTER_OPTIONS } from './constant';
import { getColumnLineageApi, type ColumnLineageNode, type ColumnLineageEdge } from '@/api/columnLineage';

defineOptions({ name: 'AssetLineage' });

const withQuality = ref(false);
const viewMode = ref<'table' | 'column'>('table');

const {
  loading,
  loadError,
  centerAsset,
  edges,
  graphVersionToken,
  confidence,
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
} = useLineageGraph();

const {
  visible: editorVisible,
  submitting: editorSubmitting,
  dirty: editorDirty,
  cycleError,
  conflictError,
  form: editorForm,
  scope: editorScope,
  open: openEditor,
  close: closeEditor,
  submit: submitEditor,
} = useLineageEditor({
  centerId: () => centerAsset.value.id,
  getGraphVersionToken: () => graphVersionToken.value,
  getEdges: () => edges.value,
  onSuccess: fetchGraph,
});

// 字段级血缘状态
const columnLoading = ref(false);
const columnNodes = ref<ColumnLineageNode[]>([]);
const columnEdges = ref<ColumnLineageEdge[]>([]);
const columnManualModalVisible = ref(false);

// 爆炸半径抽屉状态
const impactDrawerVisible = ref(false);
const selectedImpactCol = ref<{ assetId: string; columnId: string; columnName: string } | null>(null);

const fetchColumnLineage = async () => {
  if (!centerAsset.value.id) return;
  columnLoading.value = true;
  try {
    const res = await getColumnLineageApi(centerAsset.value.id, { depth: 3, direction: 'BOTH' });
    if (res && res.data) {
      columnNodes.value = res.data.nodes || [];
      columnEdges.value = res.data.edges || [];
    }
  } catch (err: any) {
    message.error(err?.message || '获取字段级血缘失败');
  } finally {
    columnLoading.value = false;
  }
};

watch(
  () => [viewMode.value, centerAsset.value.id],
  ([mode, id]) => {
    if (mode === 'column' && id) {
      fetchColumnLineage();
    }
  }
);

const handleOpenImpact = (col: ColumnLineageNode) => {
  selectedImpactCol.value = {
    assetId: col.assetId,
    columnId: col.columnId,
    columnName: col.columnName,
  };
  impactDrawerVisible.value = true;
};
</script>

<template>
  <div class="lineage-page">
    <YCard class="lineage-page__card" :bordered="false">
      <div class="lineage-page__header">
        <div>
          <a-breadcrumb>
            <a-breadcrumb-item>
              <a class="lineage-page__breadcrumb-link" @click="goDetail">{{ centerAsset.name || '资产详情' }}</a>
            </a-breadcrumb-item>
            <a-breadcrumb-item>血缘图谱</a-breadcrumb-item>
          </a-breadcrumb>
          <div class="lineage-page__title">
            <span>血缘图谱</span>
            <a-radio-group v-model:value="viewMode" size="small" button-style="solid" style="margin-left: 16px">
              <a-radio-button value="table"> <AppstoreOutlined /> 表级血缘 </a-radio-button>
              <a-radio-button value="column"> <BranchesOutlined /> 字段级血缘 </a-radio-button>
            </a-radio-group>
          </div>
          <div class="lineage-page__desc">
            {{
              viewMode === 'table'
                ? '混合血缘：自动解析 + 人工补录 + 置信度标识；成环阻断；影响分析全量召回'
                : '深层字段级血缘：SQL AST 精准抽取 + 字段变换表达式 + 爆炸半径 BFS 下游影响分析'
            }}
          </div>
        </div>

        <a-space wrap>
          <!-- 表级血缘模式工具 -->
          <template v-if="viewMode === 'table'">
            <a-switch v-model:checked="withQuality" checked-children="质量热力" un-checked-children="普通图谱" />
            <a-select
              :value="confidence"
              style="width: 140px"
              :options="CONFIDENCE_FILTER_OPTIONS"
              :disabled="loading"
              @change="handleConfidenceChange"
            />
            <a-button :disabled="readonly || loading || isEmpty" @click="openEditor">
              <template #icon><EditOutlined /></template>
              人工补录
            </a-button>
            <YButton type="primary" :disabled="loading" @click="goImpact">
              <template #icon><ApartmentOutlined /></template>
              表影响分析
            </YButton>
          </template>

          <!-- 字段级血缘模式工具 -->
          <template v-else>
            <a-button type="primary" :disabled="readonly || columnLoading" @click="columnManualModalVisible = true">
              <template #icon><EditOutlined /></template>
              补录字段血缘
            </a-button>
            <a-button :disabled="columnLoading" @click="fetchColumnLineage"> 刷新字段血缘 </a-button>
          </template>
        </a-space>
      </div>

      <!-- 表级血缘模式图例 -->
      <div v-if="viewMode === 'table'" class="lineage-page__legend">
        <span class="lineage-page__legend-item">
          <i class="lineage-page__legend-line lineage-page__legend-line--solid" />
          自动-高 / 自动-中（实线）
        </span>
        <span class="lineage-page__legend-item">
          <i class="lineage-page__legend-line lineage-page__legend-line--dashed" />
          人工-高 / 低置信来源（虚线）
        </span>
        <span class="lineage-page__legend-item">
          <a-tag color="blue">中心资产</a-tag>
          上游为绿色、下游为黄色
        </span>
      </div>

      <!-- 字段级血缘模式图例 -->
      <div v-else class="lineage-page__legend">
        <span class="lineage-page__legend-item">
          <a-tag color="blue">DIRECT 直接映射</a-tag>
          <a-tag color="cyan">COMPUTED 计算派生</a-tag>
          <a-tag color="purple">AGGREGATE 聚合运算</a-tag>
          <a-tag color="orange">MANUAL 手工补录</a-tag>
        </span>
        <span class="lineage-page__legend-item">
          点击字段闪电图标 ⚡ 可实时弹出下游爆炸半径 (Blast Radius) 逐层影响分析
        </span>
      </div>

      <a-alert
        v-if="loadError && viewMode === 'table'"
        class="lineage-page__error"
        type="error"
        show-icon
        message="血缘图谱加载失败"
        description="请检查网络或稍后重试"
      >
        <template #action>
          <YButton size="small" @click="fetchGraph">重试</YButton>
          <YButton size="small" @click="goDetail">返回详情</YButton>
        </template>
      </a-alert>

      <!-- 表级血缘内容 -->
      <a-spin v-if="viewMode === 'table'" :spinning="loading">
        <div v-if="!loadError" class="lineage-page__canvas-area">
          <a-empty v-if="isEmpty" class="lineage-page__empty" :description="emptyDescription">
            <YButton type="primary" :disabled="readonly" @click="openEditor">人工补录</YButton>
            <YButton @click="goImpact">执行影响分析</YButton>
          </a-empty>
          <LineageGraphCanvas
            v-else
            :nodes="nodes"
            :edges="edges"
            :height="canvasHeight"
            :center-name="centerAsset.name"
            :with-quality="withQuality"
            :node-label="getNodeLabel"
            @node-click="goAssetDetail"
          />
        </div>
      </a-spin>

      <!-- 字段级血缘内容 -->
      <a-spin v-else :spinning="columnLoading">
        <div class="lineage-page__canvas-area">
          <ColumnLineageGraphCanvas
            :center-asset-id="centerAsset.id"
            :nodes="columnNodes"
            :edges="columnEdges"
            @analyze-impact="handleOpenImpact"
          />
        </div>
      </a-spin>
    </YCard>

    <!-- 表级血缘补录 -->
    <LineageEditor
      :visible="editorVisible"
      :center-name="centerAsset.name"
      :submitting="editorSubmitting"
      :dirty="editorDirty"
      :form="editorForm"
      :scope="editorScope"
      :cycle-error="cycleError"
      :conflict-error="conflictError"
      @close="closeEditor"
      @submit="submitEditor"
    />

    <!-- 字段级血缘补录 Modal -->
    <ColumnLineageManualModal
      v-model:visible="columnManualModalVisible"
      :center-asset-id="centerAsset.id"
      :center-asset-name="centerAsset.name"
      @success="fetchColumnLineage"
    />

    <!-- 字段下游爆炸半径影响分析抽屉 -->
    <ColumnImpactDrawer
      v-model:visible="impactDrawerVisible"
      :asset-id="selectedImpactCol?.assetId"
      :column-id="selectedImpactCol?.columnId"
      :column-name="selectedImpactCol?.columnName"
    />
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
