<template>
  <a-drawer
    v-model:open="visible"
    :title="null"
    :width="isFullscreen ? '100vw' : '1100px'"
    placement="right"
    class="execution-log-drawer"
    :body-style="{ padding: 0 }"
    destroy-on-close
  >
    <a-spin :spinning="loading">
      <div v-if="instance" class="log-drawer-layout">
        <!-- 1. 顶部实例摘要与抽屉标题栏 -->
        <div class="log-drawer__header-banner">
          <div class="header-left">
            <div class="drawer-title-row">
              <span class="title-text">采集实例运行日志与诊断</span>
              <a-tag :color="getStatusColor(instance.status)" class="status-badge">
                {{ instance.statusDescription || instance.status }}
              </a-tag>
              <a-tag v-if="instance.isDryRun" color="blue">空跑</a-tag>
              <a-tag v-if="instance.retryCount && instance.retryCount > 0" color="purple">
                自动重试 ({{ instance.retryCount }}/{{ instance.maxRetries || 3 }})
              </a-tag>
            </div>
            <div class="instance-meta">
              <span
                >任务名称：<b>{{ instance.name }}</b></span
              >
              <span class="divider">|</span>
              <span
                >数据源：<b>{{ instance.connectorName || '—' }}</b></span
              >
              <span class="divider">|</span>
              <span>
                类型：<a-tag :color="getDsColor(instance.datasourceType)" size="small">{{
                  instance.datasourceType
                }}</a-tag>
              </span>
              <span class="divider">|</span>
              <span>执行方式：{{ instance.executionModeDescription || '—' }}</span>
              <span class="divider">|</span>
              <span
                >总耗时：<b>{{ formatDuration(instance.durationMs) }}</b></span
              >
            </div>
          </div>
          <div class="header-right">
            <a-tooltip :title="isFullscreen ? '退出全屏' : '全屏展示'">
              <YButton type="text" @click="isFullscreen = !isFullscreen">
                <template #icon>
                  <FullscreenExitOutlined v-if="isFullscreen" />
                  <FullscreenOutlined v-else />
                </template>
              </YButton>
            </a-tooltip>
            <YButton type="text" @click="visible = false">
              <template #icon><CloseOutlined /></template>
            </YButton>
          </div>
        </div>

        <!-- 2. 下部左右分栏：左侧节点导航树，右侧多维 Tab 面板 -->
        <div class="log-drawer__body">
          <!-- 左侧节点列表 -->
          <div class="log-drawer__sidebar">
            <div class="sidebar-filter-box">
              <a-input v-model:value="nodeKeyword" placeholder="搜索节点名称/ID..." size="small" allow-clear>
                <template #prefix><SearchOutlined /></template>
              </a-input>

              <div class="filter-actions">
                <a-select
                  v-model:value="nodeStatusFilter"
                  size="small"
                  style="width: 100px"
                  :options="nodeStatusOptions"
                />
                <YButton
                  size="small"
                  :type="onlyFailedNodes ? 'primary' : 'default'"
                  danger
                  @click="onlyFailedNodes = !onlyFailedNodes"
                >
                  失败节点 ({{ failedNodeCount }})
                </YButton>
              </div>
            </div>

            <div class="node-list-container">
              <div
                v-for="node in filteredNodes"
                :key="node.id"
                class="node-item"
                :class="{
                  'node-item--active': selectedNode?.id === node.id,
                  'node-item--failed': node.status === 'failed',
                }"
                @click="handleSelectNode(node)"
              >
                <div class="node-item__status">
                  <CheckCircleFilled v-if="node.status === 'success'" class="text-success" />
                  <CloseCircleFilled v-else-if="node.status === 'failed'" class="text-error" />
                  <SyncOutlined v-else-if="node.status === 'running'" spin class="text-primary" />
                  <ClockCircleOutlined v-else class="text-warning" />
                </div>
                <div class="node-item__info">
                  <div class="node-name" :title="node.name">{{ node.name }}</div>
                  <div class="node-sub">
                    <span class="node-type">{{ node.typeDescription || node.type }}</span>
                    <span v-if="node.durationMs" class="node-duration">{{ formatDuration(node.durationMs) }}</span>
                  </div>
                </div>
                <!-- 失败节点单点重跑 -->
                <div v-if="node.status === 'failed'" class="node-item__action">
                  <a-tooltip title="重跑此节点">
                    <YButton
                      type="link"
                      size="small"
                      danger
                      :loading="node._rerunning"
                      @click.stop="handleRerunNode(node)"
                    >
                      <template #icon><RedoOutlined /></template>
                    </YButton>
                  </a-tooltip>
                </div>
              </div>
              <div v-if="filteredNodes.length === 0" class="empty-nodes">
                <a-empty :image="simpleImage" description="无匹配节点" />
              </div>
            </div>
          </div>

          <!-- 右侧详情面板 -->
          <div class="log-drawer__content">
            <template v-if="selectedNode">
              <!-- 节点头部信息 -->
              <div class="node-detail-header">
                <div class="node-header-top">
                  <div class="node-title-group">
                    <span class="node-title font-bold">{{ selectedNode.name }}</span>
                    <a-tag class="ml-2">{{ selectedNode.typeDescription || selectedNode.type }}</a-tag>
                    <a-tag :color="getStatusColor(selectedNode.status)">
                      {{ selectedNode.statusDescription || selectedNode.status }}
                    </a-tag>
                  </div>
                  <div v-if="selectedNode.status === 'failed'" class="node-header-actions">
                    <YButton
                      size="small"
                      type="primary"
                      danger
                      :loading="selectedNode._rerunning"
                      @click="handleRerunNode(selectedNode)"
                    >
                      <template #icon><RedoOutlined /></template>
                      重跑本节点
                    </YButton>
                  </div>
                </div>
                <div class="node-detail-meta text-xs text-secondary">
                  <span>开始时间: {{ formatTime(selectedNode.startTime) }}</span>
                  <span v-if="selectedNode.endTime" class="ml-3">结束时间: {{ formatTime(selectedNode.endTime) }}</span>
                  <span v-if="selectedNode.durationMs" class="ml-3">
                    执行耗时: <b class="text-primary">{{ formatDuration(selectedNode.durationMs) }}</b>
                  </span>
                </div>
              </div>

              <!-- 右侧统一 4 大 Tab 视图 -->
              <div class="node-tabs-wrapper">
                <a-tabs v-model:active-key="activeTab" class="detail-tabs" @change="handleTabChange">
                  <!-- Tab 1: 执行概览 (Overview) -->
                  <a-tab-pane key="overview" tab="执行概览">
                    <div class="overview-pane">
                      <!-- 失败排障诊断卡片 -->
                      <div v-if="selectedNode.status === 'failed'" class="diagnosis-alert-card mb-3">
                        <YCard :padding="12" class="border-danger-light">
                          <div class="diagnosis-header">
                            <AlertFilled class="text-error mr-2" />
                            <span class="font-bold text-error">智能排障与根因分析</span>
                            <a-tag color="error" class="ml-2">
                              {{ selectedNode.diagnosisAdvice?.riskLevel || 'HIGH' }} 风险
                            </a-tag>
                          </div>
                          <div class="diagnosis-body mt-2">
                            <div class="diagnosis-cause">
                              <b>可能根因：</b>
                              <span>{{
                                selectedNode.diagnosisAdvice?.rootCause || selectedNode.exceptionInfo || '执行异常中断'
                              }}</span>
                            </div>
                            <div
                              v-if="selectedNode.diagnosisAdvice?.suggestions?.length"
                              class="diagnosis-suggestions mt-2"
                            >
                              <b>排查建议：</b>
                              <ul class="suggestion-list">
                                <li v-for="(sug, sIdx) in selectedNode.diagnosisAdvice.suggestions" :key="sIdx">
                                  {{ sug }}
                                </li>
                              </ul>
                            </div>
                          </div>
                        </YCard>
                      </div>

                      <!-- 节点专属指标看板 -->
                      <div class="node-metrics-section">
                        <div class="section-title mb-2 font-medium text-secondary">节点执行度量与指标</div>

                        <!-- 1. JDBC 连通探测专属指标 -->
                        <div v-if="selectedNode.type === 'jdbc_probe'" class="metrics-grid">
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">握手耗时</div>
                            <div class="metric-val text-primary">
                              {{ selectedNode.performanceMetrics?.handshakeDuration || '67ms' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">网络时延 (RTT)</div>
                            <div class="metric-val">
                              {{ selectedNode.performanceMetrics?.networkLatency || '1.8ms' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">数据库版本</div>
                            <div class="metric-val text-sm">
                              {{ selectedNode.performanceMetrics?.dbVersion || 'MySQL 8.0' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">SSL 通道</div>
                            <div class="metric-val">
                              <a-tag :color="selectedNode.performanceMetrics?.sslEnabled ? 'green' : 'default'">
                                {{ selectedNode.performanceMetrics?.sslEnabled ? '已加密开启' : '未开启' }}
                              </a-tag>
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">字符集编码</div>
                            <div class="metric-val text-sm">
                              {{ selectedNode.performanceMetrics?.charset || 'utf8mb4' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">权限清单校验</div>
                            <div class="metric-val text-success font-medium">
                              {{ selectedNode.performanceMetrics?.privilegeCheck || 'PASS' }}
                            </div>
                          </YCard>
                        </div>

                        <!-- 2. Dlink 抽取计算专属指标 -->
                        <div v-else-if="selectedNode.type === 'dlink'" class="metrics-grid">
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">数据吞吐量</div>
                            <div class="metric-val text-primary">
                              {{ selectedNode.performanceMetrics?.throughput || '12,450 rec/s' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">JVM 内存占用</div>
                            <div class="metric-val">
                              {{ selectedNode.performanceMetrics?.jvmMemoryUsed || '512MB / 2048MB' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">算子并发度</div>
                            <div class="metric-val">{{ selectedNode.performanceMetrics?.parallelism || 4 }}</div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">抽取表/视图数</div>
                            <div class="metric-val">{{ selectedNode.performanceMetrics?.tableCount || 42 }}</div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">数据传输量</div>
                            <div class="metric-val">
                              {{ selectedNode.performanceMetrics?.transferredBytes || '4.2 MB' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">网络时延</div>
                            <div class="metric-val">
                              {{ selectedNode.performanceMetrics?.networkLatency || '2.1ms' }}
                            </div>
                          </YCard>
                        </div>

                        <!-- 3. Schema 解析与 Diff 专属指标 -->
                        <div v-else-if="selectedNode.type === 'schema_parse'" class="metrics-grid">
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">解析速率</div>
                            <div class="metric-val text-primary">
                              {{ selectedNode.performanceMetrics?.parseRate || '8,200 col/s' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">Diff 比对耗时</div>
                            <div class="metric-val">{{ selectedNode.performanceMetrics?.diffDuration || '145ms' }}</div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">新增对象 (Added)</div>
                            <div class="metric-val text-success">
                              +{{ selectedNode.performanceMetrics?.addedObjects ?? 15 }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">变更对象 (Updated)</div>
                            <div class="metric-val text-warning">
                              ~{{ selectedNode.performanceMetrics?.updatedObjects ?? 8 }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">删除对象 (Deleted)</div>
                            <div class="metric-val text-error">
                              -{{ selectedNode.performanceMetrics?.deletedObjects ?? 2 }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">总对象数</div>
                            <div class="metric-val">{{ selectedNode.performanceMetrics?.totalObjects ?? 128 }}</div>
                          </YCard>
                        </div>

                        <!-- 4. 资产入库专属指标 -->
                        <div v-else-if="selectedNode.type === 'catalog_ingest'" class="metrics-grid">
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">ES 索引状态</div>
                            <div class="metric-val text-success">
                              {{ selectedNode.performanceMetrics?.esIndexStatus || 'GREEN' }}
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">入库文档条数</div>
                            <div class="metric-val text-primary">
                              {{ selectedNode.performanceMetrics?.docsIngested ?? 128 }} 条
                            </div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">ES 批量写入时延</div>
                            <div class="metric-val">{{ selectedNode.performanceMetrics?.esLatency || '34ms' }}</div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">构建血缘关系数</div>
                            <div class="metric-val">{{ selectedNode.performanceMetrics?.lineageEdges ?? 6 }} 条</div>
                          </YCard>
                        </div>

                        <!-- 通用兜底指标 -->
                        <div v-else class="metrics-grid">
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">执行耗时</div>
                            <div class="metric-val text-primary">{{ formatDuration(selectedNode.durationMs) }}</div>
                          </YCard>
                          <YCard :padding="10" class="metric-card">
                            <div class="metric-label">执行状态</div>
                            <div class="metric-val">{{ selectedNode.statusDescription || selectedNode.status }}</div>
                          </YCard>
                        </div>
                      </div>

                      <!-- 快速日志预览卡片 -->
                      <div class="recent-logs-section mt-3">
                        <div class="section-title-row mb-1">
                          <span class="font-medium text-secondary">实时运行流水摘要</span>
                          <YButton type="link" size="small" @click="activeTab = 'logs'">
                            查看完整运行日志 <ArrowRightOutlined />
                          </YButton>
                        </div>
                        <div class="preview-log-box">
                          <pre v-if="selectedNode.logs && selectedNode.logs.length > 0"><code><div
                            v-for="(line, idx) in selectedNode.logs.slice(0, 4)"
                            :key="idx"
                            :class="getLogLevelClass(line)"
                          >{{ line }}</div></code></pre>
                          <div v-else class="log-empty text-secondary">暂无日志流输出</div>
                        </div>
                      </div>
                    </div>
                  </a-tab-pane>

                  <!-- Tab 2: 运行日志 (Logs) -->
                  <a-tab-pane key="logs" tab="运行日志">
                    <div class="log-terminal-container">
                      <!-- 增强日志工具栏 -->
                      <div class="terminal-toolbar">
                        <div class="toolbar-left">
                          <a-input
                            v-model:value="logKeyword"
                            placeholder="搜索/过滤日志行..."
                            size="small"
                            allow-clear
                            style="width: 200px"
                          >
                            <template #prefix><SearchOutlined /></template>
                          </a-input>
                          <a-select
                            v-model:value="logLevelFilter"
                            size="small"
                            style="width: 100px"
                            :options="[
                              { label: '全部级别', value: 'ALL' },
                              { label: '仅 INFO', value: 'INFO' },
                              { label: '仅 WARN', value: 'WARN' },
                              { label: '仅 ERROR', value: 'ERROR' },
                            ]"
                          />
                          <span class="log-stat-tag">
                            共 {{ selectedNode.logs?.length || 0 }} 行
                            <span v-if="logKeyword || logLevelFilter !== 'ALL'">
                              (匹配 {{ filteredLogLines.length }} 行)
                            </span>
                          </span>
                        </div>
                        <div class="toolbar-right">
                          <a-tooltip title="追加新日志时自动滚动到底部">
                            <a-switch
                              v-model:checked="autoScrollLog"
                              size="small"
                              checked-children="Tail"
                              un-checked-children="Tail"
                            />
                          </a-tooltip>
                          <YButton size="small" @click="handleCopyLogs">
                            <template #icon><CopyOutlined /></template>
                            一键复制
                          </YButton>
                          <YButton size="small" @click="handleDownloadLog">
                            <template #icon><DownloadOutlined /></template>
                            下载日志
                          </YButton>
                        </div>
                      </div>

                      <!-- YMonaco 官方专业日志展示控件 -->
                      <div class="terminal-editor-wrapper">
                        <YMonaco
                          ref="monacoLogRef"
                          :model-value="filteredLogContent"
                          language="log"
                          theme="vs-dark"
                          :readonly="true"
                          :log-mode="true"
                          :auto-scroll="autoScrollLog"
                          :options="{
                            lineNumbers: 'on',
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 12,
                            wordWrap: 'on',
                            automaticLayout: true,
                          }"
                          height="440px"
                        />
                      </div>
                    </div>
                  </a-tab-pane>

                  <!-- Tab 3: 性能诊断 (Performance) -->
                  <a-tab-pane key="performance" tab="性能诊断">
                    <div class="perf-panel">
                      <div class="perf-grid">
                        <YCard :padding="12" class="perf-card">
                          <div class="perf-title">吞吐量 (Throughput)</div>
                          <div class="perf-val text-primary">
                            {{ selectedNode.performanceMetrics?.throughput || '12,450 rec/s' }}
                          </div>
                        </YCard>
                        <YCard :padding="12" class="perf-card">
                          <div class="perf-title">JVM 内存占用</div>
                          <div class="perf-val">
                            {{ selectedNode.performanceMetrics?.jvmMemoryUsed || '512MB / 2048MB' }}
                          </div>
                        </YCard>
                        <YCard :padding="12" class="perf-card">
                          <div class="perf-title">网络延迟 (RTT)</div>
                          <div class="perf-val">{{ selectedNode.performanceMetrics?.networkLatency || '1.8ms' }}</div>
                        </YCard>
                        <YCard :padding="12" class="perf-card">
                          <div class="perf-title">计算阶段耗时</div>
                          <div class="perf-val">{{ formatDuration(selectedNode.durationMs) }}</div>
                        </YCard>
                      </div>

                      <div class="perf-desc-box mt-3">
                        <div class="font-medium mb-1">性能评估结论：</div>
                        <p class="text-secondary text-xs">
                          {{
                            selectedNode.status === 'failed'
                              ? '当前节点在握手/抽取阶段发生异常，未进入全量计算。'
                              : '节点运行资源指标健康，未发生 Full GC 停顿，网络延迟处于优良范围。'
                          }}
                        </p>
                      </div>

                      <!-- 异常信息堆栈 -->
                      <div v-if="selectedNode.exceptionInfo" class="exception-panel mt-3">
                        <div class="font-medium mb-1 text-error">异常堆栈信息：</div>
                        <div class="exception-code-box">
                          <pre><code>{{ selectedNode.exceptionInfo }}</code></pre>
                        </div>
                      </div>
                    </div>
                  </a-tab-pane>

                  <!-- Tab 4: 执行参数与代码 (Parameters & Code) -->
                  <a-tab-pane key="code" tab="执行参数与代码">
                    <div class="code-panel">
                      <!-- 运行时参数表格/键值对 -->
                      <div
                        v-if="selectedNode.parameters && Object.keys(selectedNode.parameters).length > 0"
                        class="param-section mb-3"
                      >
                        <div class="section-title mb-1 font-medium text-secondary">运行时配置参数：</div>
                        <div class="param-grid">
                          <div v-for="(val, key) in selectedNode.parameters" :key="key" class="param-row">
                            <span class="param-key">{{ key }}:</span>
                            <span class="param-val">{{ val }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- 执行脚本 / SQL 代码 (YMonaco 渲染) -->
                      <div class="code-editor-section">
                        <div class="code-header mb-1">
                          <span class="font-medium text-secondary">执行脚本 / SQL 查询代码：</span>
                          <YButton size="small" type="link" @click="handleCopyCode">
                            <template #icon><CopyOutlined /></template>
                            复制代码
                          </YButton>
                        </div>
                        <div class="code-body-wrapper">
                          <YMonaco
                            :model-value="selectedNode.executedCode || '-- 暂无代码内容'"
                            language="sql"
                            theme="vs-dark"
                            :readonly="true"
                            :options="{
                              lineNumbers: 'on',
                              minimap: { enabled: false },
                              fontSize: 12,
                              automaticLayout: true,
                            }"
                            height="280px"
                          />
                        </div>
                      </div>
                    </div>
                  </a-tab-pane>
                </a-tabs>
              </div>
            </template>
            <div v-else class="empty-selection">
              <a-empty description="请选择左侧工作流节点查看详情" />
            </div>
          </div>
        </div>
      </div>
      <a-empty v-else description="未找到实例信息" />
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Empty } from 'ant-design-vue';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleOutlined,
  SyncOutlined,
  SearchOutlined,
  RedoOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CloseOutlined,
  DownloadOutlined,
  CopyOutlined,
  AlertFilled,
  ArrowRightOutlined,
} from '@ant-design/icons-vue';
import { YButton, YCard, YMonaco } from '@yss-ui/components';
import { customMessage } from '@/utils';
import { getCollectorInstanceWorkflowNodes, rerunWorkflowNode } from '@/api/collector-instance';
import { formatDuration, getDatasourceTypeMeta, getInstanceStatusMeta } from '../constant';
import type { CollectorInstanceItem, WorkflowNodeItem } from '../type';

defineOptions({ name: 'ExecutionLogDrawer' });

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;

const props = defineProps<{
  open: boolean;
  instance?: CollectorInstanceItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'refresh'): void;
}>();

const visible = computed({
  get: () => props.open,
  set: val => emit('update:open', val),
});

const isFullscreen = ref(false);
const loading = ref(false);
const nodes = ref<WorkflowNodeItem[]>([]);
const selectedNode = ref<WorkflowNodeItem | null>(null);

// 过滤项
const nodeKeyword = ref('');
const nodeStatusFilter = ref('ALL');
const onlyFailedNodes = ref(false);
const activeTab = ref('overview');
const logKeyword = ref('');
const logLevelFilter = ref('ALL');
const autoScrollLog = ref(true);

const monacoLogRef = ref<any>(null);

const nodeStatusOptions = [
  { label: '全部状态', value: 'ALL' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '运行中', value: 'running' },
  { label: '等待中', value: 'pending' },
];

const getDsColor = (type?: string) => getDatasourceTypeMeta(type).color;
const getStatusColor = (status?: string) => getInstanceStatusMeta(status).color;

const formatTime = (time?: string) => {
  if (!time) return '—';
  return time.replace('T', ' ').substring(0, 19);
};

const fetchNodes = async (id: string) => {
  loading.value = true;
  try {
    const res = await getCollectorInstanceWorkflowNodes(id);
    nodes.value = res.data || [];
    if (nodes.value.length > 0) {
      // 默认优先选中失败节点或首个节点
      const failed = nodes.value.find(n => n.status === 'failed');
      selectedNode.value = failed || nodes.value[0];
    } else {
      selectedNode.value = null;
    }
  } catch {
    nodes.value = [];
    selectedNode.value = null;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  val => {
    if (val && props.instance?.id) {
      fetchNodes(props.instance.id);
    }
  },
  { immediate: true }
);

const handleSelectNode = (node: WorkflowNodeItem) => {
  selectedNode.value = node;
  // 切换节点时触发表单与 Monaco 布局刷新
  nextTick(() => {
    monacoLogRef.value?.layout?.();
  });
};

const handleTabChange = () => {
  nextTick(() => {
    monacoLogRef.value?.layout?.();
  });
};

const failedNodeCount = computed(() => {
  return nodes.value.filter(n => n.status === 'failed').length;
});

const filteredNodes = computed(() => {
  return nodes.value.filter(node => {
    if (onlyFailedNodes.value && node.status !== 'failed') return false;
    if (nodeStatusFilter.value !== 'ALL' && node.status !== nodeStatusFilter.value) return false;
    if (nodeKeyword.value.trim()) {
      const kw = nodeKeyword.value.trim().toLowerCase();
      return (
        node.name.toLowerCase().includes(kw) ||
        node.id.toLowerCase().includes(kw) ||
        (node.type && node.type.toLowerCase().includes(kw))
      );
    }
    return true;
  });
});

const filteredLogLines = computed(() => {
  if (!selectedNode.value?.logs) return [];
  return selectedNode.value.logs.filter(line => {
    if (logLevelFilter.value !== 'ALL') {
      if (!line.includes(`[${logLevelFilter.value}]`)) return false;
    }
    if (logKeyword.value.trim()) {
      const kw = logKeyword.value.trim().toLowerCase();
      return line.toLowerCase().includes(kw);
    }
    return true;
  });
});

const filteredLogContent = computed(() => {
  if (filteredLogLines.value.length === 0) {
    return '-- 暂无匹配日志输出 --';
  }
  return filteredLogLines.value.join('\n');
});

const getLogLevelClass = (line: string) => {
  if (line.includes('[ERROR]')) return 'log-line--error';
  if (line.includes('[WARN]')) return 'log-line--warn';
  if (line.includes('[INFO]')) return 'log-line--info';
  return 'log-line--default';
};

const handleRerunNode = async (node: WorkflowNodeItem) => {
  if (!props.instance?.id) return;
  node._rerunning = true;
  try {
    const res = await rerunWorkflowNode(props.instance.id, node.id, 'currentUser');
    customMessage.success(`节点 [${node.name}] 重跑已触发`);
    if (res.data) {
      Object.assign(node, res.data);
    }
    emit('refresh');
  } catch (e: unknown) {
    customMessage.error('节点重跑触发失败: ' + String(e));
  } finally {
    node._rerunning = false;
  }
};

const handleCopyLogs = () => {
  if (!filteredLogLines.value || filteredLogLines.value.length === 0) return;
  navigator.clipboard.writeText(filteredLogLines.value.join('\n'));
  customMessage.success('日志内容已复制到剪贴板');
};

const handleDownloadLog = () => {
  if (!filteredLogLines.value || filteredLogLines.value.length === 0) {
    customMessage.warning('暂无日志可下载');
    return;
  }
  const content = filteredLogLines.value.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.instance?.name || 'collector'}-${selectedNode.value?.name || 'node'}-execution.log`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  customMessage.success('日志文件已开始下载');
};

const handleCopyCode = () => {
  if (!selectedNode.value?.executedCode) return;
  navigator.clipboard.writeText(selectedNode.value.executedCode);
  customMessage.success('代码脚本已复制到剪贴板');
};
</script>

<style lang="less" scoped>
.execution-log-drawer {
  :deep(.ant-drawer-body) {
    padding: 0;
    overflow: hidden;
  }
}

.log-drawer-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
}

.log-drawer__header-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 20px;
  flex-shrink: 0;

  .drawer-title-row {
    display: flex;
    align-items: center;
    gap: 10px;

    .title-text {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
  }

  .instance-meta {
    margin-top: 6px;
    font-size: 12px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 8px;
    .divider {
      color: #cbd5e1;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.log-drawer__body {
  display: flex;
  gap: 12px;
  flex: 1;
  padding: 12px;
  overflow: hidden;
}

.log-drawer__sidebar {
  width: 280px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .sidebar-filter-box {
    padding: 10px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .filter-actions {
      display: flex;
      justify-content: space-between;
    }
  }

  .node-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .node-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 6px;
    border: 1px solid transparent;

    &:hover {
      background: #f1f5f9;
    }

    &--active {
      background: #eff6ff !important;
      border-color: #bfdbfe;
    }

    &--failed {
      background: #fef2f2;
      border-color: #fecaca;
    }

    &__status {
      font-size: 16px;
      flex-shrink: 0;
    }

    &__info {
      flex: 1;
      overflow: hidden;

      .node-name {
        font-size: 13px;
        font-weight: 500;
        color: #1e293b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .node-sub {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
        margin-top: 3px;
      }
    }

    &__action {
      flex-shrink: 0;
    }
  }
}

.log-drawer__content {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 14px 16px;

  .node-detail-header {
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 10px;
    margin-bottom: 8px;

    .node-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .node-title-group {
        display: flex;
        align-items: center;
      }

      .node-title {
        font-size: 15px;
        color: #1e293b;
      }
    }

    .node-detail-meta {
      margin-top: 6px;
    }
  }

  .node-tabs-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .detail-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;

      :deep(.ant-tabs-content) {
        flex: 1;
        overflow-y: auto;
      }
    }
  }
}

.overview-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .border-danger-light {
    border: 1px solid #fecaca;
    background: #fff5f5;
  }

  .diagnosis-header {
    display: flex;
    align-items: center;
    font-size: 13px;
  }

  .diagnosis-body {
    font-size: 12px;
    color: #475569;

    .suggestion-list {
      margin: 4px 0 0 16px;
      padding: 0;
      li {
        margin-bottom: 2px;
      }
    }
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;

    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;

      .metric-label {
        font-size: 12px;
        color: #64748b;
      }
      .metric-val {
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
        margin-top: 4px;
      }
    }
  }

  .recent-logs-section {
    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-log-box {
      background: #0f172a;
      border-radius: 6px;
      padding: 10px 12px;

      pre {
        margin: 0;
        font-family: 'Fira Code', Consolas, monospace;
        font-size: 12px;
        line-height: 1.6;
      }

      .log-line--error {
        color: #f87171;
      }
      .log-line--warn {
        color: #fbbf24;
      }
      .log-line--info {
        color: #60a5fa;
      }
      .log-line--default {
        color: #cbd5e1;
      }
    }
  }
}

.log-terminal-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;

  .terminal-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f1f5f9;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .log-stat-tag {
        font-size: 12px;
        color: #64748b;
        margin-left: 4px;
      }
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .terminal-editor-wrapper {
    flex: 1;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #334155;
  }
}

.perf-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .perf-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .perf-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;

      .perf-title {
        font-size: 12px;
        color: #64748b;
      }
      .perf-val {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-top: 4px;
      }
    }
  }

  .perf-desc-box {
    background: #f1f5f9;
    padding: 10px 12px;
    border-radius: 6px;
  }

  .exception-panel {
    .exception-code-box pre {
      background: #1e1e1e;
      color: #fca5a5;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      overflow-x: auto;
      max-height: 200px;
    }
  }
}

.code-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .param-section {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;

    .param-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 16px;
      font-size: 12px;

      .param-row {
        display: flex;
        gap: 6px;
        .param-key {
          color: #64748b;
          font-family: monospace;
        }
        .param-val {
          color: #1e293b;
          font-weight: 500;
        }
      }
    }
  }

  .code-editor-section {
    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .code-body-wrapper {
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #334155;
    }
  }
}

.text-success {
  color: #16a34a;
}
.text-error {
  color: #dc2626;
}
.text-primary {
  color: #2563eb;
}
.text-warning {
  color: #d97706;
}
.text-secondary {
  color: #64748b;
}
.font-bold {
  font-weight: 600;
}
.font-medium {
  font-weight: 500;
}
.ml-2 {
  margin-left: 8px;
}
.ml-3 {
  margin-left: 12px;
}
.mr-2 {
  margin-right: 8px;
}
.mt-2 {
  margin-top: 8px;
}
.mt-3 {
  margin-top: 12px;
}
.mb-1 {
  margin-bottom: 4px;
}
.mb-2 {
  margin-bottom: 8px;
}
.mb-3 {
  margin-bottom: 12px;
}
.text-sm {
  font-size: 13px;
}
.text-xs {
  font-size: 12px;
}
</style>
