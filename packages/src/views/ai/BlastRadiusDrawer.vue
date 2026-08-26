<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { RadiusSettingOutlined, WarningOutlined, TableOutlined, CloseOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { YTable } from '@yss-ui/components';
import { getBlastRadius, setTaintStatus, type BlastRadiusVO } from '@/api/dq';

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
const maxDepth = ref<number>(5);
const report = ref<BlastRadiusVO | null>(null);

const loadReport = async () => {
  if (!props.assetId) return;
  loading.value = true;
  try {
    const res = await getBlastRadius(props.assetId, maxDepth.value);
    report.value = res.data || (res as any);
  } catch (e: any) {
    message.error('获取下游爆炸半径分析失败');
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

const handleTaintAll = async (status: 'TAINTED' | 'NORMAL') => {
  if (!report.value || !report.value.impactedAssets.length) return;
  taintLoading.value = true;
  try {
    for (const item of report.value.impactedAssets) {
      await setTaintStatus(item.assetId, {
        taintStatus: status,
        reason: status === 'TAINTED' ? `受上游 ${props.assetName || props.assetId} 故障扩散` : '全链路解除存疑',
      });
      item.taintStatus = status;
    }
    message.success(status === 'TAINTED' ? '已将下游受影响资产全量标记为数据存疑' : '已解除全量存疑状态');
    emit('taint-updated');
  } catch (e: any) {
    message.error('批量更新存疑状态失败');
  } finally {
    taintLoading.value = false;
  }
};

const jumpToAsset = (id: string) => {
  handleClose();
  router.push(`/assets/${id}`);
};

const columns = [
  { title: '受影响资产', field: 'assetName', slots: { default: 'assetName' } },
  { title: '下游深度', field: 'depth', width: 90, slots: { default: 'depth' } },
  { title: '业务域', field: 'domain', width: 90 },
  { title: '健康度', field: 'healthScore', width: 100, slots: { default: 'healthScore' } },
  { title: '存疑状态', field: 'taintStatus', width: 110, slots: { default: 'taintStatus' } },
  { title: '操作', field: 'action', width: 80, slots: { default: 'action' } },
];

const getHealthColor = (score?: number) => {
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
    :width="640"
    placement="right"
    :closable="false"
    :body-style="{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }"
    @close="handleClose"
  >
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-title-box">
        <RadiusSettingOutlined class="header-icon" />
        <div>
          <div class="title-text">下游爆炸半径与受影响资产分析</div>
          <div class="sub-text">源资产: {{ assetName || assetId }}</div>
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
          <!-- 统计指标卡 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-num alert-num">{{ report.totalImpactedCount }}</div>
              <div class="stat-label">受影响下游表/视图</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ report.maxDepth }}</div>
              <div class="stat-label">最大向下污染深度</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">{{ report.impactedDomains.length }}</div>
              <div class="stat-label">波及业务域数量</div>
            </div>
          </div>

          <!-- 批量操作与控制栏 -->
          <div class="control-bar">
            <div class="control-left">
              <span class="ctrl-label">波及业务域:</span>
              <a-tag v-for="dom in report.impactedDomains" :key="dom" color="blue">{{ dom }}</a-tag>
            </div>
            <div class="control-right">
              <a-button type="primary" danger size="small" :loading="taintLoading" @click="handleTaintAll('TAINTED')">
                <WarningOutlined /> 一键全链路标记存疑
              </a-button>
              <a-button type="dashed" size="small" :loading="taintLoading" @click="handleTaintAll('NORMAL')">
                解除全链路存疑
              </a-button>
            </div>
          </div>

          <!-- 下游资产列表 -->
          <div class="table-section">
            <YTable
              :data="report.impactedAssets"
              :columns="columns"
              :row-config="{ keyField: 'assetId', useKey: true }"
              pageable
              :pagination="{ pageSize: 8 }"
            >
              <template #assetName="{ row }">
                <div class="asset-cell">
                  <TableOutlined />
                  <span class="cell-name">{{ row.assetName }}</span>
                </div>
              </template>
              <template #depth="{ row }">
                <a-tag color="purple">第 {{ row.depth }} 层</a-tag>
              </template>
              <template #healthScore="{ row }">
                <a-tag :color="getHealthColor(row.healthScore)"> {{ row.healthScore }} 分 </a-tag>
              </template>
              <template #taintStatus="{ row }">
                <a-tag v-if="row.taintStatus === 'TAINTED'" color="error">数据存疑</a-tag>
                <a-tag v-else color="success">正常</a-tag>
              </template>
              <template #action="{ row }">
                <a-button type="link" size="small" @click="jumpToAsset(row.assetId)"> 详情 </a-button>
              </template>
            </YTable>
          </div>
        </div>

        <a-empty v-else-if="!loading" description="下游无受影响资产（叶子节点）" />
      </a-spin>
    </div>

    <!-- Footer -->
    <div class="drawer-footer">
      <a-button @click="handleClose">关闭</a-button>
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
  color: #fa8c16;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8edf2;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #1f1f1f;
}

.alert-num {
  color: #cf1322;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.control-bar {
  background: #fff;
  border: 1px solid #e8edf2;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ctrl-label {
  font-size: 12px;
  color: #595959;
  margin-right: 6px;
}

.control-right {
  display: flex;
  gap: 8px;
}

.table-section {
  background: #fff;
  border: 1px solid #e8edf2;
  border-radius: 8px;
  padding: 12px;
}

.asset-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cell-name {
  font-weight: 500;
  font-size: 12px;
}

.drawer-footer {
  padding: 12px 20px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
}
</style>
