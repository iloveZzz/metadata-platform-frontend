/** * 集成配置页（WU-FE-09，路由 /integration） * Gravitino 互补集成（消费 OpenLineage + REST 作采集上游）；OpenLineage
事件接收；DataHub 导出。 * 仅负责组合 Hooks 与渲染视图模板（≤150 行），业务逻辑见 hooks/useIntegrationConfig.ts。 */
<script setup lang="ts">
import { computed, ref } from 'vue';
import { YButton, YCard, YssFormily } from '@yss-ui/components';
import { ExportOutlined } from '@ant-design/icons-vue';
import { useUserRole } from '@/hooks/useUserRole';
import PermissionDenied from '@/components/PermissionDenied.vue';
import { useIntegrationConfig } from './hooks/useIntegrationConfig';
import { DATAHUB_FORM_SCHEMA, GRAVITINO_FORM_SCHEMA, getExportTaskStatusMeta } from './constant';
import type { YssFormilyExpose } from './type';

defineOptions({ name: 'IntegrationManage' });

// 切片 06：管理端面门禁（菜单 adminOnly 隐藏 + 页面 403 兜底；浏览 API 保持开放）
const { isAdmin } = useUserRole();

const gravitinoFormRef = ref<YssFormilyExpose>();
const datahubFormRef = ref<YssFormilyExpose>();

const {
  loading,
  loadError,
  formReloadKey,
  testing,
  saving,
  exporting,
  config,
  lastExportTask,
  fetchConfig,
  saveGravitino,
  saveDatahub,
  triggerExport,
} = useIntegrationConfig({ gravitinoFormRef, datahubFormRef });

const gravitinoEnabled = computed(() => Boolean(config.value.gravitino?.enabled));
const gravitinoInitial = computed(() => ({
  endpoint: config.value.gravitino?.endpoint ?? '',
  enabled: gravitinoEnabled.value,
}));
const datahubInitial = computed(() => ({ endpoint: config.value.datahub?.endpoint ?? '' }));
const lastTest = computed(() => config.value.gravitino?.lastTest || '尚未测试连接');
const ol = computed(() => config.value.openLineage ?? {});
const exportMeta = computed(() => getExportTaskStatusMeta(lastExportTask.value?.status));
</script>

<template>
  <div class="integration-page">
    <PermissionDenied v-if="!isAdmin" desc="集成配置由平台管理员管理；当前用户非管理员（X-User-Role seam）" />
    <YCard v-else class="integration-page__card" :bordered="false">
      <div class="integration-page__header">
        <div>
          <div class="integration-page__title">集成配置</div>
          <div class="integration-page__desc">
            Gravitino 互补集成（消费 OpenLineage + REST 作采集上游）；OpenLineage 事件接收；DataHub 导出
          </div>
        </div>
        <YButton type="primary" :loading="exporting" @click="triggerExport">
          <template #icon><ExportOutlined /></template>
          触发 DataHub 导出
        </YButton>
      </div>

      <a-alert
        v-if="loadError"
        class="integration-page__error"
        type="error"
        show-icon
        message="集成配置加载失败"
        description="请检查网络或稍后重试"
      >
        <template #action>
          <YButton size="small" @click="fetchConfig">重试</YButton>
        </template>
      </a-alert>

      <div class="integration-page__grid">
        <YCard title="Gravitino 上游" :bordered="true">
          <template #extra>
            <a-tag :color="gravitinoEnabled ? 'success' : 'default'">{{
              gravitinoEnabled ? '已启用' : '已停用'
            }}</a-tag>
          </template>
          <YssFormily
            v-if="!loading"
            :key="`gravitino-${formReloadKey}`"
            ref="gravitinoFormRef"
            :schema="GRAVITINO_FORM_SCHEMA"
            :initial-values="gravitinoInitial"
          />
          <div class="integration-page__actions">
            <YButton :loading="testing" :disabled="saving || loading" @click="saveGravitino(true)">测试连接</YButton>
            <YButton type="primary" :loading="saving" :disabled="testing || loading" @click="saveGravitino(false)">
              保存配置
            </YButton>
          </div>
          <a-divider />
          <div class="integration-page__meta">最近测试：{{ lastTest }}</div>
        </YCard>

        <YCard title="OpenLineage 事件接收" :bordered="true">
          <template #extra><a-tag color="blue">标准协议</a-tag></template>
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="接收端点">
              <a-typography-text code>{{ ol.receiveEndpoint || '—' }}</a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item label="近 24h 事件">{{ ol.recent24h ?? '—' }}</a-descriptions-item>
            <a-descriptions-item label="解析成功率">{{ ol.parseSuccessRate || '—' }}</a-descriptions-item>
          </a-descriptions>
          <a-alert
            class="integration-page__tip"
            type="info"
            show-icon
            message="事件端点只读展示"
            description="外部系统按 OpenLineage 标准推送事件，平台接收后写入资产与血缘。"
          />
        </YCard>

        <YCard title="DataHub 导出" :bordered="true">
          <template #extra><a-tag color="purple">互导验证</a-tag></template>
          <YssFormily
            v-if="!loading"
            :key="`datahub-${formReloadKey}`"
            ref="datahubFormRef"
            :schema="DATAHUB_FORM_SCHEMA"
            :initial-values="datahubInitial"
          />
          <div class="integration-page__actions">
            <YButton type="primary" :loading="saving" :disabled="loading" @click="saveDatahub">保存配置</YButton>
            <YButton :loading="exporting" :disabled="loading" @click="triggerExport">触发导出</YButton>
          </div>
          <a-divider />
          <div class="integration-page__meta">
            最近任务：
            <template v-if="lastExportTask">
              <a-tag :color="exportMeta.color">{{ exportMeta.label }}</a-tag>
              <span class="integration-page__task-id">{{ lastExportTask.id }}</span>
            </template>
            <template v-else>尚未触发</template>
          </div>
        </YCard>
      </div>
    </YCard>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
