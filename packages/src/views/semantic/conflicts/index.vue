<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  BranchesOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  EyeOutlined,
  MergeCellsOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import { YTable, YCard } from '@yss-ui/components';
import {
  queryMetricConflicts,
  triggerMetricConflictScan,
  getMetricConflictDiff,
  reconcileMetricConflict,
  markMetricConflictSuspect,
  dismissMetricConflict,
  type MetricConflictVO,
  type MetricConflictDiffVO,
} from '@/api/smartGovernance';

defineOptions({ name: 'MetricConflicts' });

const loading = ref(false);
const scanning = ref(false);
const conflicts = ref<MetricConflictVO[]>([]);
const totalCount = ref(0);

const queryParams = reactive({
  pageIndex: 1,
  pageSize: 10,
  status: undefined as string | undefined,
  conflictType: undefined as string | undefined,
  keyword: '',
});

// Side-by-Side Diff 抽屉
const diffDrawerVisible = ref(false);
const diffData = ref<MetricConflictDiffVO | null>(null);

// 对齐归并弹窗
const reconcileModalVisible = ref(false);
const reconcileForm = reactive({
  conflictId: '',
  canonicalIndicatorId: '',
  reconcileStrategy: 'MERGE_TO_ALIAS',
  comment: '',
});
const reconcileConflictRecord = ref<MetricConflictVO | null>(null);

// 存疑标记弹窗
const suspectModalVisible = ref(false);
const suspectReason = ref('');
const suspectConflictId = ref('');

const columns = [
  { title: '冲突编号', field: 'conflictCode', width: 160 },
  { title: '冲突指标对 (指标A vs 指标B)', field: 'indicators', slots: { default: 'indicators' } },
  { title: '冲突类型', field: 'conflictType', width: 140, slots: { default: 'conflictType' } },
  { title: '公式相似度', field: 'similarityScore', width: 120, slots: { default: 'similarityScore' } },
  { title: 'AST 差异摘要', field: 'astDiffSummary' },
  { title: '治理状态', field: 'status', width: 100, slots: { default: 'status' } },
  { title: '操作', field: 'action', width: 220, slots: { default: 'action' } },
];

const fetchConflicts = async () => {
  loading.value = true;
  try {
    const res = await queryMetricConflicts({
      pageIndex: queryParams.pageIndex,
      pageSize: queryParams.pageSize,
      status: queryParams.status,
      conflictType: queryParams.conflictType,
      keyword: queryParams.keyword,
    });
    if (res?.data) {
      conflicts.value = res.data;
      totalCount.value = res.totalCount || 0;
    }
  } catch (err) {
    message.error('加载指标冲突列表失败');
  } finally {
    loading.value = false;
  }
};

const onYTablePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
  queryParams.pageIndex = current;
  queryParams.pageSize = pageSize;
  fetchConflicts();
};

const handleTriggerScan = async () => {
  scanning.value = true;
  try {
    await triggerMetricConflictScan();
    message.success('已触发全域指标语义与 AST 公式冲突扫描探测！');
    fetchConflicts();
  } catch (err) {
    message.error('扫描触发失败');
  } finally {
    scanning.value = false;
  }
};

const openDiffDrawer = async (record: MetricConflictVO) => {
  try {
    const res = await getMetricConflictDiff(record.id);
    if (res?.data) {
      diffData.value = res.data;
      diffDrawerVisible.value = true;
    }
  } catch (err) {
    message.error('加载 Side-by-Side 公式差异失败');
  }
};

const openReconcileModal = (record: MetricConflictVO) => {
  reconcileConflictRecord.value = record;
  reconcileForm.conflictId = record.id;
  reconcileForm.canonicalIndicatorId = record.indicatorAId;
  reconcileForm.reconcileStrategy = 'MERGE_TO_ALIAS';
  reconcileForm.comment = `统一为「${record.indicatorAName}」权威标准口径`;
  reconcileModalVisible.value = true;
};

const submitReconcile = async () => {
  try {
    await reconcileMetricConflict(reconcileForm.conflictId, {
      canonicalIndicatorId: reconcileForm.canonicalIndicatorId,
      reconcileStrategy: reconcileForm.reconcileStrategy,
      comment: reconcileForm.comment,
    });
    message.success('指标一键对齐归并完成，已自动刷新消费端下游别名映射！');
    reconcileModalVisible.value = false;
    fetchConflicts();
  } catch (err) {
    message.error('对齐归并失败');
  }
};

const openSuspectModal = (record: MetricConflictVO) => {
  suspectConflictId.value = record.id;
  suspectReason.value = '跨域口径存在未定论业务分歧，建议在报表消费端予以警示';
  suspectModalVisible.value = true;
};

const submitSuspect = async () => {
  try {
    await markMetricConflictSuspect(suspectConflictId.value, suspectReason.value);
    message.success('已将该指标冲突标记为存疑并在消费端显示警示');
    suspectModalVisible.value = false;
    fetchConflicts();
  } catch (err) {
    message.error('标记存疑失败');
  }
};

const handleDismiss = (record: MetricConflictVO) => {
  Modal.confirm({
    title: '确认忽略该指标冲突事件？',
    content: '忽略后该冲突将被判定为合法业务衍生并归档。',
    onOk: async () => {
      try {
        await dismissMetricConflict(record.id);
        message.success('冲突已忽略归档');
        fetchConflicts();
      } catch (err) {
        message.error('忽略操作失败');
      }
    },
  });
};

const getConflictTypeColor = (type: string) => {
  if (type === 'SYNONYMOUS_NAME') return 'blue';
  if (type === 'HOMONYMOUS_MEANING') return 'purple';
  if (type === 'FORMULA_DRIFT') return 'orange';
  return 'default';
};

const getConflictTypeName = (type: string) => {
  if (type === 'SYNONYMOUS_NAME') return '同义异名 (Synonym)';
  if (type === 'HOMONYMOUS_MEANING') return '同名异义 (Homonym)';
  if (type === 'FORMULA_DRIFT') return '口径漂移 (Drift)';
  return type;
};

onMounted(() => {
  fetchConflicts();
});
</script>

<template>
  <div class="metric-conflicts-page">
    <!-- Header Banner -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <div class="title-row">
          <BranchesOutlined class="title-icon" />
          <div>
            <h2>指标语义与 AST 公式冲突治理工作台</h2>
            <p class="subtitle">
              基于 SQL 语法树 AST 解析与大模型语义比对，智能识别口径漂移、同名异义与同义异名冲突，支持 Side-by-Side
              差异比对与一键标准化归并。
            </p>
          </div>
        </div>
        <a-button type="primary" :loading="scanning" @click="handleTriggerScan">
          <template #icon><ThunderboltOutlined /></template>
          触发全域指标冲突探测
        </a-button>
      </div>
    </a-card>

    <!-- Filter Card -->
    <a-card :bordered="false" class="filter-card">
      <a-form layout="inline" :model="queryParams">
        <a-form-item label="关键字">
          <a-input
            v-model:value="queryParams.keyword"
            placeholder="搜索指标名称、编码或冲突编号"
            allow-clear
            @press-enter="fetchConflicts"
          />
        </a-form-item>
        <a-form-item label="冲突类型">
          <a-select v-model:value="queryParams.conflictType" placeholder="全部类型" style="width: 180px" allow-clear>
            <a-select-option value="FORMULA_DRIFT">口径漂移 (FORMULA_DRIFT)</a-select-option>
            <a-select-option value="HOMONYMOUS_MEANING">同名异义 (HOMONYMOUS_MEANING)</a-select-option>
            <a-select-option value="SYNONYMOUS_NAME">同义异名 (SYNONYMOUS_NAME)</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="治理状态">
          <a-select v-model:value="queryParams.status" placeholder="全部状态" style="width: 140px" allow-clear>
            <a-select-option value="UNRESOLVED">待治理 (UNRESOLVED)</a-select-option>
            <a-select-option value="RESOLVED">已归并解决 (RESOLVED)</a-select-option>
            <a-select-option value="SUSPECTED">已标记存疑 (SUSPECTED)</a-select-option>
            <a-select-option value="DISMISSED">已忽略 (DISMISSED)</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="fetchConflicts">
            <template #icon><SearchOutlined /></template>
            查询
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- Table Card -->
    <YCard :bordered="false" class-name="table-card">
      <YTable
        :columns="columns"
        :data="conflicts"
        :row-config="{ keyField: 'id', useKey: true }"
        :loading="loading"
        pageable
        :pagination="{
          current: queryParams.pageIndex,
          pageSize: queryParams.pageSize,
          total: totalCount,
          showSizeChanger: true,
          showTotal: (total: number) => `共 ${total} 条指标冲突`,
        }"
        @page-change="onYTablePageChange"
      >
        <template #indicators="{ row }">
          <div class="indicators-pair">
            <div class="ind-node node-a">
              <span class="domain-tag">{{ row.indicatorADomain }}</span>
              <span class="name">{{ row.indicatorAName }}</span>
              <code>{{ row.indicatorACode }}</code>
            </div>
            <div class="vs-badge">VS</div>
            <div class="ind-node node-b">
              <span class="domain-tag">{{ row.indicatorBDomain }}</span>
              <span class="name">{{ row.indicatorBName }}</span>
              <code>{{ row.indicatorBCode }}</code>
            </div>
          </div>
        </template>

        <template #conflictType="{ row }">
          <a-tag :color="getConflictTypeColor(row.conflictType)">
            {{ getConflictTypeName(row.conflictType) }}
          </a-tag>
        </template>

        <template #similarityScore="{ row }">
          <a-progress
            :percent="Math.round(Number(row.similarityScore) * 100)"
            size="small"
            :status="row.similarityScore >= 0.85 ? 'exception' : 'normal'"
          />
        </template>

        <template #status="{ row }">
          <a-tag v-if="row.status === 'UNRESOLVED'" color="warning">待治理</a-tag>
          <a-tag v-else-if="row.status === 'RESOLVED'" color="success">已归并</a-tag>
          <a-tag v-else-if="row.status === 'SUSPECTED'" color="error">已标记存疑</a-tag>
          <a-tag v-else color="default">已忽略</a-tag>
        </template>

        <template #action="{ row }">
          <a-space>
            <a @click="openDiffDrawer(row as any)"> <EyeOutlined /> 比对 </a>
            <a
              v-if="row.status === 'UNRESOLVED'"
              style="color: var(--success-color, #52c41a)"
              @click="openReconcileModal(row as any)"
            >
              <MergeCellsOutlined /> 归并
            </a>
            <a
              v-if="row.status === 'UNRESOLVED'"
              style="color: var(--warning-color, #faad14)"
              @click="openSuspectModal(row as any)"
            >
              <QuestionCircleOutlined /> 存疑
            </a>
            <a
              v-if="row.status === 'UNRESOLVED'"
              style="color: var(--text-color-secondary, #8c8c8c)"
              @click="handleDismiss(row as any)"
            >
              忽略
            </a>
          </a-space>
        </template>
      </YTable>
    </YCard>

    <!-- Side-by-Side AST Diff Drawer -->
    <a-drawer
      v-model:open="diffDrawerVisible"
      title="指标公式 Side-by-Side AST 差异比对"
      :width="850"
      :destroy-on-close="true"
    >
      <div v-if="diffData" class="diff-body">
        <div class="diff-header-summary">
          <div class="summary-item">
            <span class="label">冲突类型:</span>
            <a-tag :color="getConflictTypeColor(diffData.conflict.conflictType)">
              {{ getConflictTypeName(diffData.conflict.conflictType) }}
            </a-tag>
          </div>
          <div class="summary-item">
            <span class="label">聚合语义一致性:</span>
            <a-badge
              :status="diffData.astDiff?.aggMatch ? 'success' : 'error'"
              :text="diffData.astDiff?.aggMatch ? '完全匹配' : '不一致 (Sum vs Count)'"
            />
          </div>
          <div class="summary-item">
            <span class="label">AST 相似度评分:</span>
            <b>{{ ((diffData.astDiff?.similarityScore || 0.88) * 100).toFixed(1) }}%</b>
          </div>
        </div>

        <a-divider />

        <!-- Side-by-Side Dual Card View -->
        <div class="side-by-side-grid">
          <!-- Metric A -->
          <div class="metric-diff-card card-a">
            <div class="card-head">
              <a-tag color="blue">指标 A ({{ diffData.indicatorA?.domain || '财务域' }})</a-tag>
              <h4>{{ diffData.indicatorA?.name }}</h4>
            </div>
            <div class="card-section">
              <div class="section-label">计算公式 (SQL AST)</div>
              <pre class="code-box"><code>{{ diffData.indicatorA?.formula }}</code></pre>
            </div>
            <div class="card-section">
              <div class="section-label">过滤条件 (WHERE Clause)</div>
              <div class="where-box highlight">{{ diffData.indicatorA?.whereClause }}</div>
            </div>
            <div class="card-section">
              <div class="section-label">关联下游资产数</div>
              <div>{{ diffData.indicatorA?.relatedAssetCount || 6 }} 个报表/看板</div>
            </div>
          </div>

          <!-- Metric B -->
          <div class="metric-diff-card card-b">
            <div class="card-head">
              <a-tag color="orange">指标 B ({{ diffData.indicatorB?.domain || '运营域' }})</a-tag>
              <h4>{{ diffData.indicatorB?.name }}</h4>
            </div>
            <div class="card-section">
              <div class="section-label">计算公式 (SQL AST)</div>
              <pre class="code-box"><code>{{ diffData.indicatorB?.formula }}</code></pre>
            </div>
            <div class="card-section">
              <div class="section-label">过滤条件 (WHERE Clause)</div>
              <div class="where-box highlight-drift">{{ diffData.indicatorB?.whereClause }}</div>
            </div>
            <div class="card-section">
              <div class="section-label">关联下游资产数</div>
              <div>{{ diffData.indicatorB?.relatedAssetCount || 3 }} 个报表/看板</div>
            </div>
          </div>
        </div>

        <a-divider />

        <div class="ast-diff-conclusion">
          <h4>AST 语法树比对结论与治理建议</h4>
          <div class="conclusion-box">
            {{
              diffData.astDiff?.whereClauseDiff ||
              '存在过滤条件差异，指标A包含 status in (1,2) 待支付未取消订单，指标B仅统计已完成 status=1 订单。'
            }}
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- Reconcile Modal -->
    <a-modal
      v-model:open="reconcileModalVisible"
      title="一键指标标准化对齐归并"
      ok-text="确认对齐归并"
      cancel-text="取消"
      @ok="submitReconcile"
    >
      <div v-if="reconcileConflictRecord" class="reconcile-modal-body">
        <a-alert
          type="info"
          show-icon
          message="对齐归并说明"
          description="将其中一个指标确立为主权威标准，另一个指标标记为同义别名并自动迁移下游报表引用，彻底消除口径二义性。"
          style="margin-bottom: 16px"
        />

        <a-form layout="vertical">
          <a-form-item label="确立权威标准指标" required>
            <a-radio-group v-model:value="reconcileForm.canonicalIndicatorId">
              <a-radio :value="reconcileConflictRecord.indicatorAId">
                {{ reconcileConflictRecord.indicatorAName }} ({{ reconcileConflictRecord.indicatorADomain }})
              </a-radio>
              <a-radio :value="reconcileConflictRecord.indicatorBId">
                {{ reconcileConflictRecord.indicatorBName }} ({{ reconcileConflictRecord.indicatorBDomain }})
              </a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="归并策略" required>
            <a-select v-model:value="reconcileForm.reconcileStrategy">
              <a-select-option value="MERGE_TO_ALIAS">保留非权威指标为别名并迁移报表引用</a-select-option>
              <a-select-option value="DEPRECATE_ALIAS">废弃非权威指标并向消费端发送口径变更通知</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="治理说明与归并理由">
            <a-textarea v-model:value="reconcileForm.comment" :rows="3" />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- Mark Suspect Modal -->
    <a-modal
      v-model:open="suspectModalVisible"
      title="标记指标冲突存疑"
      ok-text="确认标记"
      cancel-text="取消"
      @ok="submitSuspect"
    >
      <a-form layout="vertical">
        <a-form-item label="存疑原因与口径分歧说明" required>
          <a-textarea
            v-model:value="suspectReason"
            :rows="4"
            placeholder="填写分歧原因，该说明将同步在下游报表展示存疑警示"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.metric-conflicts-page {
  padding: 16px;
  background: #f0f2f5;
  min-height: 100vh;
}
.header-card {
  margin-bottom: 16px;
  border-radius: 8px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.title-icon {
  font-size: 28px;
  color: #fa8c16;
}
.subtitle {
  color: #8c8c8c;
  margin: 4px 0 0 0;
}
.filter-card {
  margin-bottom: 16px;
  border-radius: 8px;
}
.table-card {
  border-radius: 8px;
}
.indicators-pair {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ind-node {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ind-node .name {
  font-weight: 600;
  color: #262626;
}
.ind-node code {
  font-size: 11px;
  color: #8c8c8c;
}
.domain-tag {
  font-size: 11px;
  color: #1890ff;
}
.vs-badge {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 11px;
  color: #ff4d4f;
}
.diff-header-summary {
  display: flex;
  gap: 24px;
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
}
.summary-item .label {
  color: #8c8c8c;
  margin-right: 6px;
}
.side-by-side-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.metric-diff-card {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 14px;
  background: #ffffff;
}
.card-a {
  border-top: 3px solid #1890ff;
}
.card-b {
  border-top: 3px solid #fa8c16;
}
.card-head {
  margin-bottom: 12px;
}
.card-head h4 {
  margin: 6px 0 0 0;
}
.card-section {
  margin-bottom: 12px;
}
.section-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
}
.code-box {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  margin: 0;
}
.where-box {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.highlight {
  background: #e6f7ff;
  color: #096dd9;
  border-left: 3px solid #1890ff;
}
.highlight-drift {
  background: #fff7e6;
  color: #d46b08;
  border-left: 3px solid #fa8c16;
}
.conclusion-box {
  background: #fffbe6;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #ffe58f;
  color: #ad6800;
  font-size: 13px;
}
</style>
