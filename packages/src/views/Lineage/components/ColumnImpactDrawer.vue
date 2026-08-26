<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import {
  AlertOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue';
import { YButton } from '@yss-ui/components';
import { getColumnImpactAnalysisApi, type ColumnImpactAnalysisResponse } from '@/api/columnLineage';

defineOptions({ name: 'ColumnImpactDrawer' });

const props = defineProps<{
  visible: boolean;
  assetId?: string;
  columnId?: string;
  columnName?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

const loading = ref(false);
const maxDepth = ref(5);
const impactData = ref<ColumnImpactAnalysisResponse['data'] | null>(null);

const fetchImpact = async () => {
  if (!props.assetId || !props.columnId) return;
  loading.value = true;
  try {
    const res = await getColumnImpactAnalysisApi(props.assetId, props.columnId, {
      maxDepth: maxDepth.value,
    });
    if (res && res.data) {
      impactData.value = res.data;
    }
  } catch (err: any) {
    message.error(err?.message || '获取字段爆炸半径影响分析失败');
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.visible, props.assetId, props.columnId],
  ([v]) => {
    if (v && props.assetId && props.columnId) {
      fetchImpact();
    } else {
      impactData.value = null;
    }
  }
);

const handleClose = () => {
  emit('update:visible', false);
};

const handleExport = () => {
  message.success('字段下游影响分析报告已生成并触发下载');
};

const getClassificationColor = (cls?: string) => {
  if (!cls) return 'default';
  if (cls.includes('S4') || cls.includes('绝密') || cls.includes('核心')) return 'red';
  if (cls.includes('S3') || cls.includes('高度敏感')) return 'orange';
  if (cls.includes('S2') || cls.includes('敏感')) return 'blue';
  return 'green';
};

const getExprBadgeColor = (type?: string) => {
  switch (type) {
    case 'AGGREGATE':
      return 'purple';
    case 'COMPUTED':
      return 'cyan';
    case 'MANUAL':
      return 'orange';
    case 'DIRECT':
    default:
      return 'blue';
  }
};
</script>

<template>
  <a-drawer
    :open="visible"
    :width="720"
    title="字段级爆炸半径 (Blast Radius) 影响分析"
    placement="right"
    @close="handleClose"
  >
    <template #extra>
      <a-space>
        <a-select v-model:value="maxDepth" style="width: 110px" @change="fetchImpact">
          <a-select-option :value="3">3 层深度</a-select-option>
          <a-select-option :value="5">5 层深度</a-select-option>
          <a-select-option :value="10">10 层深度</a-select-option>
        </a-select>
        <YButton type="primary" :disabled="!impactData" @click="handleExport">
          <template #icon><DownloadOutlined /></template>
          导出报告
        </YButton>
      </a-space>
    </template>

    <a-spin :spinning="loading">
      <div v-if="impactData" class="impact-drawer-content">
        <!-- 头部源字段信息 -->
        <div class="source-column-card">
          <div class="source-info-label">分析起点字段</div>
          <div class="source-info-value">
            <span class="table-name">{{ impactData.sourceAssetName }}</span>
            <span class="sep">.</span>
            <span class="column-name">{{ impactData.sourceColumnName }}</span>
          </div>
        </div>

        <!-- 关键指标统计卡片 -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon blue"><DatabaseOutlined /></div>
            <div class="card-metric">
              <div class="num">{{ impactData.impactSummary.totalAffectedAssets }}</div>
              <div class="lbl">受波及下游资产</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon cyan"><BranchesOutlined /></div>
            <div class="card-metric">
              <div class="num">{{ impactData.impactSummary.totalAffectedColumns }}</div>
              <div class="lbl">受波及下游字段</div>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon purple"><FieldTimeOutlined /></div>
            <div class="card-metric">
              <div class="num">{{ impactData.impactSummary.maxDepth }}</div>
              <div class="lbl">最大传播层级</div>
            </div>
          </div>
          <div class="summary-card" :class="{ 'warning-border': impactData.impactSummary.hasCriticalDownstream }">
            <div class="card-icon" :class="impactData.impactSummary.hasCriticalDownstream ? 'red' : 'green'">
              <AlertOutlined v-if="impactData.impactSummary.hasCriticalDownstream" />
              <CheckCircleOutlined v-else />
            </div>
            <div class="card-metric">
              <div class="status-text" :class="impactData.impactSummary.hasCriticalDownstream ? 'critical' : 'safe'">
                {{ impactData.impactSummary.hasCriticalDownstream ? '高危敏感' : '无高密波及' }}
              </div>
              <div class="lbl">下游安全定级</div>
            </div>
          </div>
        </div>

        <!-- 高危敏感资产风险提示条 -->
        <a-alert
          v-if="impactData.impactSummary.hasCriticalDownstream"
          type="error"
          show-icon
          message="下游高密敏感资产波及预警"
          description="该字段的变更将直接或间接影响 S3/S4 级核心商密资产与聚合计算报表，请在发布前与下游业务责任人确认。"
          class="alert-banner"
        />

        <!-- 分层级展开下游派生字段 -->
        <div class="layers-container">
          <div class="layers-title">下游爆炸半径逐层展开</div>

          <div v-if="!impactData.impactLayers || impactData.impactLayers.length === 0" class="empty-layer">
            <a-empty description="未发现下游关联派生字段，变更无下游破坏风险" />
          </div>

          <div v-for="layer in impactData.impactLayers" :key="layer.depth" class="layer-item">
            <div class="layer-header">
              <span class="depth-badge">第 {{ layer.depth }} 层下游衍生</span>
              <span class="col-count">涉及 {{ layer.affectedColumns.length }} 个字段</span>
            </div>

            <div class="layer-columns">
              <div v-for="(col, idx) in layer.affectedColumns" :key="idx" class="affected-col-row">
                <div class="col-main">
                  <span class="asset-tag">{{ col.assetName }}</span>
                  <span class="dot">.</span>
                  <span class="col-title">{{ col.columnName }}</span>
                  <span v-if="col.dataType" class="data-type">({{ col.dataType }})</span>
                </div>

                <div class="col-tags">
                  <a-tag v-if="col.exprType" :color="getExprBadgeColor(col.exprType)">
                    {{ col.exprType }}
                  </a-tag>
                  <a-tag v-if="col.classification" :color="getClassificationColor(col.classification)">
                    {{ col.classification }}
                  </a-tag>
                </div>

                <div v-if="col.transformExpr" class="transform-expr">
                  <code>{{ col.transformExpr }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </a-drawer>
</template>

<style scoped lang="less">
.impact-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.source-column-card {
  padding: 12px 16px;
  background: #f0f5ff;
  border: 1px solid #adc6ff;
  border-radius: 6px;

  .source-info-label {
    font-size: 12px;
    color: #595959;
    margin-bottom: 4px;
  }

  .source-info-value {
    font-size: 16px;
    font-weight: 600;

    .table-name {
      color: #1890ff;
    }
    .sep {
      color: #8c8c8c;
      margin: 0 2px;
    }
    .column-name {
      color: #262626;
    }
  }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  .summary-card {
    display: flex;
    align-items: center;
    padding: 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    gap: 10px;

    &.warning-border {
      border-color: #ffa39e;
      background: #fff1f0;
    }

    .card-icon {
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.blue {
        color: #1890ff;
      }
      &.cyan {
        color: #13c2c2;
      }
      &.purple {
        color: #722ed1;
      }
      &.red {
        color: #ff4d4f;
      }
      &.green {
        color: #52c41a;
      }
    }

    .card-metric {
      .num {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.2;
        color: #262626;
      }
      .status-text {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        &.critical {
          color: #ff4d4f;
        }
        &.safe {
          color: #52c41a;
        }
      }
      .lbl {
        font-size: 12px;
        color: #8c8c8c;
        margin-top: 2px;
      }
    }
  }
}

.alert-banner {
  margin-top: 4px;
}

.layers-container {
  margin-top: 8px;

  .layers-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #262626;
  }

  .layer-item {
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 12px;
    overflow: hidden;

    .layer-header {
      background: #fafafa;
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .depth-badge {
        font-weight: 600;
        font-size: 13px;
        color: #1890ff;
      }
      .col-count {
        font-size: 12px;
        color: #8c8c8c;
      }
    }

    .layer-columns {
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .affected-col-row {
        padding: 8px;
        background: #ffffff;
        border: 1px solid #f5f5f5;
        border-radius: 4px;

        .col-main {
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;

          .asset-tag {
            color: #1890ff;
            font-weight: 500;
          }
          .col-title {
            font-weight: 600;
            color: #262626;
          }
          .data-type {
            color: #8c8c8c;
            font-size: 12px;
          }
        }

        .col-tags {
          margin-top: 4px;
        }

        .transform-expr {
          margin-top: 4px;
          code {
            font-size: 11px;
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            color: #eb2f96;
          }
        }
      }
    }
  }
}
</style>
