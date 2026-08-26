<template>
  <a-modal
    v-model:open="visible"
    width="75%"
    :footer="null"
    :destroy-on-close="true"
    centered
    class="collector-detail-modal"
    wrap-class-name="collector-detail-modal-wrap"
  >
    <template #title>
      <div class="modal-header-title">
        <span class="title-text">采集任务详情</span>
        <a-space size="small" class="title-tags">
          <a-tag :color="statusMeta.color" class="detail-status-tag">
            {{ statusMeta.label }}
          </a-tag>
          <a-tag :color="collector?.enabled !== false ? 'green' : 'default'">
            {{ collector?.enabled !== false ? '已生效' : '已停用' }}
          </a-tag>
        </a-space>
      </div>
    </template>

    <div v-if="collector" class="collector-detail-body">
      <!-- 顶部基础概览条 -->
      <div class="detail-header-card">
        <div class="task-icon-box">
          <DatabaseFilled class="task-icon" />
        </div>
        <div class="task-header-info">
          <div class="task-name-text" :title="collector.name">
            {{ collector.name }}
          </div>
          <div class="task-id-text">
            任务 ID: <code>{{ collector.id }}</code>
          </div>
        </div>
      </div>

      <!-- 1. 基础属性 -->
      <a-descriptions title="基础属性" :column="2" size="small" bordered class="detail-section">
        <a-descriptions-item label="数据源类型">
          <a-tag :color="getDatasourceColor(collector.datasourceType)">
            {{ collector.datasourceType || 'MySQL' }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item label="数据来源 (连接器)">
          <div class="connector-desc-line">
            <span v-if="envBadge" :class="['env-badge-small', envBadge.toLowerCase()]">
              {{ envBadge }}
            </span>
            <span class="connector-name-text">{{ cleanConnectorName }}</span>
          </div>
        </a-descriptions-item>

        <a-descriptions-item label="采集模式">
          {{ collector.mode === 'full' ? '全量采集' : '增量采集' }}
        </a-descriptions-item>

        <a-descriptions-item label="覆盖策略">
          {{ formatStrategy(collector.strategy) }}
        </a-descriptions-item>

        <a-descriptions-item label="自动识别分类">
          <a-badge
            :status="collector.autoClassify !== false ? 'success' : 'default'"
            :text="collector.autoClassify !== false ? '已开启' : '未开启'"
          />
        </a-descriptions-item>

        <a-descriptions-item label="负责人">
          {{ collector.owner || '—' }}
        </a-descriptions-item>

        <a-descriptions-item label="业务来源系统">
          {{ collector.sourceSystem || '—' }}
        </a-descriptions-item>

        <a-descriptions-item label="采集范围">
          <span v-if="collector.scopeType === 'custom'">
            自定义库表 ({{ collector.selectedDatabases || '未指定' }})
          </span>
          <span v-else>全量采集 (所有库表)</span>
        </a-descriptions-item>

        <a-descriptions-item label="创建时间">
          {{ collector.createdAt || '—' }}
        </a-descriptions-item>

        <a-descriptions-item label="最后更新时间">
          {{ collector.updatedAt || '—' }}
        </a-descriptions-item>

        <a-descriptions-item label="任务描述" :span="2">
          <div class="desc-text-box">{{ collector.description || '暂无描述' }}</div>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 2. 调度与排程配置 -->
      <a-card size="small" title="调度与执行机制" class="detail-section">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="采集方式">
            <a-tag :color="collector.schedule === 'manual' ? 'orange' : 'blue'">
              {{ collector.schedule === 'manual' ? '手动触发' : '定时排程' }}
            </a-tag>
          </a-descriptions-item>

          <a-descriptions-item label="调度表达式 (Cron)">
            <code>{{ collector.schedule === 'manual' ? '—' : collector.schedule }}</code>
          </a-descriptions-item>

          <a-descriptions-item v-if="collector.schedule !== 'manual'" label="排程描述">
            {{ collector.cronDescription || '按照指定周期自动调度' }}
          </a-descriptions-item>

          <a-descriptions-item v-if="collector.schedule !== 'manual'" label="下次计划执行时间">
            <span class="text-blue-600 font-mono">{{ collector.nextRunAt || '依据 Cron 表达式自动排程' }}</span>
          </a-descriptions-item>

          <a-descriptions-item label="失败重试机制" :span="2">
            <div v-if="collector.retryEnabled" class="retry-config-line">
              <CheckCircleFilled style="color: #52c41a; margin-right: 4px" />
              开启重试（失败后自动重试 <strong>{{ collector.retryCount || 3 }}</strong> 次，间隔
              <strong>{{ collector.retryInterval || 5 }}</strong> 分钟）
            </div>
            <div v-else class="text-gray-500">未开启自动重试</div>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 3. 最近执行状况 -->
      <a-card size="small" title="最近执行状态" class="detail-section">
        <div class="last-run-box">
          <div class="last-run-info-row">
            <span class="info-label">最近执行时间：</span>
            <span class="info-val">{{ collector.lastRunAt || '暂无执行记录' }}</span>
          </div>

          <div v-if="collector.status === 'running'" class="running-indicator-box">
            <SyncOutlined spin style="color: #1890ff; font-size: 16px; margin-right: 8px" />
            <span class="running-text">任务正在执行后台元数据抽取与扫描分析...</span>
          </div>

          <div v-if="collector.status === 'failed' && collector.failReason" class="fail-alert-box">
            <a-alert type="error" show-icon message="最近一次执行失败原因" :description="collector.failReason" />
          </div>

          <div class="history-link-row">
            <a-button type="link" size="small" class="p-0" @click="handleGoToHistory">
              <ProfileOutlined /> 查看该任务的采集实例历史记录 &gt;
            </a-button>
          </div>
        </div>
      </a-card>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { DatabaseFilled, CheckCircleFilled, SyncOutlined, ProfileOutlined } from '@ant-design/icons-vue';
import {
  getCollectorStatusMeta,
  getDatasourceTypeMeta,
  getEnvBadge,
  getCleanConnectorName,
  formatStrategy,
} from '../constant';
import type { CollectorItem } from '../type';

defineOptions({ name: 'CollectorDetailModal' });

const props = defineProps<{
  open: boolean;
  collector: CollectorItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const router = useRouter();

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const statusMeta = computed(() => getCollectorStatusMeta(props.collector?.status));

const getDatasourceColor = (type?: string) => {
  return getDatasourceTypeMeta(type).color;
};

const envBadge = computed(() => getEnvBadge(props.collector?.connectorName));

const cleanConnectorName = computed(() => {
  if (!props.collector?.connectorName) return props.collector?.connectorId || '—';
  return getCleanConnectorName(props.collector.connectorName);
});

const handleGoToHistory = () => {
  if (!props.collector) return;
  visible.value = false;
  router.push({
    path: '/collector-instances',
    query: { keyword: props.collector.name },
  });
};
</script>

<style scoped lang="less">
.modal-header-title {
  display: flex;
  align-items: center;
  gap: 12px;

  .title-text {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }
}

.collector-detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 16px;

  .task-icon-box {
    width: 40px;
    height: 40px;
    background: #e6f7ff;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1890ff;
    font-size: 20px;
  }

  .task-header-info {
    flex: 1;
    overflow: hidden;

    .task-name-text {
      font-size: 16px;
      font-weight: 600;
      color: #262626;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-id-text {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 2px;

      code {
        background: #f5f5f5;
        padding: 1px 4px;
        border-radius: 3px;
        color: #595959;
      }
    }
  }
}

.connector-desc-line {
  display: flex;
  align-items: center;
  gap: 6px;

  .env-badge-small {
    display: inline-block;
    padding: 0 4px;
    font-size: 10px;
    border-radius: 2px;
    line-height: 16px;

    &.dev {
      background: #e6f7ff;
      color: #096dd9;
      border: 1px solid #91d5ff;
    }

    &.prod {
      background: #fff7e6;
      color: #d46b08;
      border: 1px solid #ffd591;
    }
  }

  .connector-name-text {
    font-weight: 500;
  }
}

.desc-text-box {
  color: #595959;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.last-run-box {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .last-run-info-row {
    font-size: 13px;
    .info-label {
      color: #8c8c8c;
    }
    .info-val {
      color: #262626;
      font-weight: 500;
    }
  }

  .running-indicator-box {
    display: flex;
    align-items: center;
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    color: #0050b3;
  }

  .fail-alert-box {
    margin-top: 4px;
  }

  .history-link-row {
    margin-top: 4px;
  }
}
</style>

<style lang="less">
.collector-detail-modal-wrap {
  .collector-detail-modal {
    width: 75% !important;
    max-width: 75% !important;
    top: 0;
    padding-bottom: 0;

    .ant-modal-content {
      height: 70vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .ant-modal-header {
      flex-shrink: 0;
      padding: 16px 24px;
      margin-bottom: 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .ant-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
    }
  }
}
</style>
