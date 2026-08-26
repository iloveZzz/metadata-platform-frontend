<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AimOutlined,
  AlertOutlined,
  ApartmentOutlined,
  CloseOutlined,
  ArrowRightOutlined,
  TableOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { getRootCause, setTaintStatus, type RootCauseVO } from '@/api/dq';

interface Props {
  open: boolean;
  assetId: string;
  assetName?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'taint-updated'): void;
}>();

const router = useRouter();
const loading = ref(false);
const taintLoading = ref(false);
const report = ref<RootCauseVO | null>(null);

const loadReport = async () => {
  if (!props.assetId) return;
  loading.value = true;
  try {
    const res = await getRootCause(props.assetId);
    report.value = res.data || (res as any);
  } catch (e: any) {
    message.error('获取质量根因溯源分析失败');
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  val => {
    if (val && props.assetId) {
      loadReport();
    }
  }
);

const handleClose = () => {
  emit('update:open', false);
};

const handleTaint = async (status: 'TAINTED' | 'NORMAL') => {
  if (!report.value?.rootAsset?.assetId) return;
  taintLoading.value = true;
  try {
    await setTaintStatus(report.value.rootAsset.assetId, {
      taintStatus: status,
      reason: status === 'TAINTED' ? '根因分析定位故障源' : '人工核实解除存疑',
    });
    message.success(status === 'TAINTED' ? '已标记根因资产为数据存疑' : '已解除根因资产存疑状态');
    if (report.value.rootAsset) {
      report.value.rootAsset.taintStatus = status;
    }
    emit('taint-updated');
  } catch (e: any) {
    message.error('更新存疑状态失败');
  } finally {
    taintLoading.value = false;
  }
};

const jumpToAsset = (id: string) => {
  handleClose();
  router.push(`/assets/${id}`);
};

const jumpToLineage = (id: string) => {
  handleClose();
  router.push(`/assets/${id}/lineage`);
};

const getHealthBadgeColor = (score?: number) => {
  if (!score) return 'blue';
  if (score >= 90) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 60) return 'orange';
  return 'red';
};
</script>

<template>
  <a-drawer
    :visible="open"
    :width="540"
    placement="right"
    :closable="false"
    :body-style="{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }"
    @close="handleClose"
  >
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-title-box">
        <AimOutlined class="header-icon" />
        <div>
          <div class="title-text">质量-血缘联合根因溯源</div>
          <div class="sub-text">目标资产: {{ assetName || assetId }}</div>
        </div>
      </div>
      <a-button type="text" shape="circle" @click="handleClose">
        <CloseOutlined />
      </a-button>
    </div>

    <!-- Body -->
    <div class="drawer-body">
      <a-spin :spinning="loading">
        <div v-if="report" class="report-content">
          <!-- 总体摘要 -->
          <a-alert
            :message="'根因分析结论 (置信度 ' + (report.confidence || '94%') + ')'"
            :description="report.summary"
            type="warning"
            show-icon
            class="summary-alert"
          />

          <!-- 根因节点卡片 -->
          <div class="section-card">
            <div class="section-title"><AlertOutlined style="color: #ff4d4f" /> 最上游故障根因节点</div>

            <div class="root-asset-card">
              <div class="card-top">
                <div class="asset-name-line">
                  <TableOutlined />
                  <span class="name">{{ report.rootAsset.assetName }}</span>
                  <a-tag :color="getHealthBadgeColor(report.rootAsset.healthScore)">
                    质量 {{ report.rootAsset.healthScore }} 分
                  </a-tag>
                  <a-tag v-if="report.rootAsset.taintStatus === 'TAINTED'" color="error"> 数据存疑 </a-tag>
                </div>
                <div class="distance-badge">上游距离 {{ report.rootAsset.distance }} 步</div>
              </div>

              <div class="fault-details">
                <div class="detail-row">
                  <span class="detail-label">触发规则:</span>
                  <span class="detail-value rule-name">{{ report.rootAsset.ruleName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">实际指标:</span>
                  <span class="detail-value metric-val">{{ report.rootAsset.actualMetric }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">阈值范围:</span>
                  <span class="detail-value">{{ report.rootAsset.threshold }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">故障时间:</span>
                  <span class="detail-value">{{ report.rootAsset.faultTime }}</span>
                </div>
              </div>

              <div class="card-btn-bar">
                <a-button
                  v-if="report.rootAsset.taintStatus !== 'TAINTED'"
                  type="primary"
                  danger
                  size="small"
                  :loading="taintLoading"
                  @click="handleTaint('TAINTED')"
                >
                  标记该根因为存疑
                </a-button>
                <a-button v-else type="dashed" size="small" :loading="taintLoading" @click="handleTaint('NORMAL')">
                  解除存疑标记
                </a-button>
                <a-button type="link" size="small" @click="jumpToAsset(report.rootAsset.assetId)"> 资产详情 </a-button>
                <a-button type="link" size="small" @click="jumpToLineage(report.rootAsset.assetId)">
                  <ApartmentOutlined /> 全景血缘
                </a-button>
              </div>
            </div>
          </div>

          <!-- 故障向下污染传播链 -->
          <div class="section-card">
            <div class="section-title"><ApartmentOutlined style="color: #1677ff" /> 故障沿血缘传播路径</div>

            <div class="propagation-timeline">
              <div v-for="(step, idx) in report.propagationPath" :key="idx" class="timeline-step">
                <div class="step-num">{{ idx + 1 }}</div>
                <div class="step-content">
                  <div class="step-nodes">
                    <span class="node-badge source-node">{{ step.fromAssetName }}</span>
                    <ArrowRightOutlined class="arrow-icon" />
                    <span class="node-badge target-node">{{ step.toAssetName }}</span>
                  </div>
                  <div class="step-type">{{ step.propagationType }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 建议修复措施 -->
          <div class="section-card">
            <div class="section-title"><InfoCircleOutlined style="color: #52c41a" /> 处置建议</div>
            <ul class="suggestion-list">
              <li v-for="(sug, idx) in report.suggestions" :key="idx">{{ sug }}</li>
            </ul>
          </div>
        </div>

        <a-empty v-else-if="!loading" description="未检索到相关质量根因记录" />
      </a-spin>
    </div>

    <!-- Footer -->
    <div class="drawer-footer">
      <a-button @click="handleClose">关闭</a-button>
      <a-button type="primary" @click="jumpToLineage(assetId)"> <ApartmentOutlined /> 查看血缘热力图 </a-button>
    </div>
  </a-drawer>
</template>

<style scoped>
.drawer-header {
  padding: 16px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 22px;
  color: #ff4d4f;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.sub-text {
  font-size: 12px;
  color: #8c8c8c;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.summary-alert {
  margin-bottom: 16px;
  border-radius: 6px;
}

.section-card {
  background: #fff;
  border: 1px solid #eaedf1;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.root-asset-card {
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  padding: 12px 14px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.asset-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}

.distance-badge {
  font-size: 11px;
  color: #ff4d4f;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #ffa39e;
}

.fault-details {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.detail-row {
  display: flex;
  gap: 8px;
}

.detail-label {
  color: #8c8c8c;
  width: 65px;
}

.detail-value {
  color: #262626;
}

.rule-name {
  font-weight: 500;
  color: #cf1322;
}

.metric-val {
  color: #d4380d;
}

.card-btn-bar {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #ffccc7;
  display: flex;
  align-items: center;
  gap: 8px;
}

.propagation-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-step {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f6f8fb;
  padding: 8px 12px;
  border-radius: 6px;
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.step-content {
  flex: 1;
}

.step-nodes {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.source-node {
  background: #e6f4ff;
  color: #0958d9;
}

.target-node {
  background: #f5f5f5;
  color: #262626;
}

.arrow-icon {
  color: #8c8c8c;
  font-size: 11px;
}

.step-type {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
}

.suggestion-list {
  padding-left: 18px;
  margin: 0;
  font-size: 12px;
  color: #595959;
  line-height: 1.8;
}

.drawer-footer {
  padding: 12px 20px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
