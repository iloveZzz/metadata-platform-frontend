<script setup lang="ts">
import { computed, h, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { YTable, type YTableColumn } from '@yss-ui/components';
import type { RuleDetailRulesItem } from '@/api';
import { customMessage } from '@/utils/message';
import BandTag from '@/components/dq-insight/BandTag.vue';
import StateTag from '@/components/dq-insight/StateTag.vue';
import ScoreChip from '@/components/dq-insight/ScoreChip.vue';
import StatusTag from '@/components/dq-insight/StatusTag.vue';
import Perm403 from '@/components/dq-insight/Perm403.vue';
import { useRuleDetail } from './hooks/useRuleDetail';

defineOptions({ name: 'RuleDetailPage' });

const route = useRoute();
const router = useRouter();
const assetId = computed(() => String(route.params.assetId ?? ''));

const { detail, passRateText, loading, isForbidden, isNotFound, hasError, run, retry } = useRuleDetail(assetId.value);

onMounted(() => {
  run();
});

const goDashboard = () => {
  router.push('/dashboard');
};

const goAssetDetail = () => {
  router.push(`/health/${assetId.value}`);
};

const goChannels = () => {
  router.push('/channels');
};

const showReadonlyNote = () => {
  customMessage.info('规则明细为只读展示，无写操作（状态矩阵 §3·只读）');
};

/** 分数来源区展示用 Descriptions（h() 构造 vnode；规则通过率派生已下沉 useRuleDetail） */
const scoreSourceItems = computed(() => {
  const d = detail.value;
  return [
    {
      key: 'band',
      label: '档位',
      children: d?.state === 'ok' || d?.band ? h(BandTag, { band: d?.band }) : h(StateTag, { state: 'expired' }),
    },
    { key: 'passRate', label: '规则通过率', children: passRateText.value },
    { key: 'ruleVersion', label: '计算规则版本', children: h('code', undefined, d?.ruleVersion || '—') },
    { key: 'batchNo', label: '结果批次', children: h('code', undefined, d?.batchNo || '—') },
    { key: 'lastResultAt', label: '工具执行时间', children: d?.lastResultAt || '—' },
  ];
});

/** 算法说明：权重清单（MVP 固定默认系数，OQ-02 / SB-02 已确认） */
const weightTexts = computed(() => {
  const weights = detail.value?.algorithm?.weights ?? [];
  return weights
    .filter(w => w.ruleName)
    .map(w => `${w.ruleName} ${Math.round((w.weight ?? 0) * 100)}%`)
    .join('；');
});

const isExpired = computed(() => !!detail.value?.expired || detail.value?.state === 'expired');

const ruleColumns: YTableColumn[] = [
  { field: 'ruleName', title: '规则名', minWidth: 200 },
  { field: 'weight', title: '权重', width: 90 },
  { field: 'status', title: '结果', width: 130 },
  { field: 'failureReason', title: '失败原因 / 说明', minWidth: 260 },
  { field: 'toolTime', title: '工具结果时间', width: 170 },
];

const weightText = (row: RuleDetailRulesItem) => `${Math.round((row.weight ?? 0) * 100)}%`;

const reasonText = (row: RuleDetailRulesItem) => {
  if (row.status === 'failed' || row.status === 'error') {
    return row.failureReason || '—';
  }
  if (row.status === 'warn') {
    return row.failureReason || '通过 · 告警';
  }
  return '通过';
};
</script>

<template>
  <div class="rule-detail-page">
    <a-breadcrumb style="margin-bottom: 12px">
      <a-breadcrumb-item>
        <a @click="goDashboard">数据质量</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="goAssetDetail">{{ assetId }}</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>规则明细</a-breadcrumb-item>
    </a-breadcrumb>

    <Perm403
      v-if="isForbidden"
      desc="您不在该资产所属数据域内，无法查看规则明细。域外资产质量结果不展示，请联系管理员申请数据域权限（DQI-007）。"
    />

    <!-- 空态（暂无规则结果）：后端 404 = 无健康分结果 / 无规则明细（状态矩阵 §3 规则明细钻取·空） -->
    <div v-else-if="isNotFound">
      <div class="page-header-row">
        <div>
          <h4 class="page-title">规则明细 · {{ assetId }}</h4>
        </div>
      </div>
      <a-card :bordered="false">
        <a-empty>
          <template #description>
            <div>
              暂无规则结果
              <span class="empty-desc">该资产无 DQ 结果，无法展示规则级明细（空态，非错误）。</span>
            </div>
          </template>
          <a-button type="primary" @click="goChannels">前往通道管理</a-button>
        </a-empty>
      </a-card>
    </div>

    <!-- 错误态：明细请求失败，分数来源区不受影响（可重试） -->
    <a-card v-else-if="hasError" :bordered="false">
      <a-alert type="error" show-icon message="规则明细请求失败">
        <template #description>可重试错误，分数来源区不受影响（不清空已展示数据）。</template>
        <template #action>
          <a-button size="small" @click="retry">重试</a-button>
        </template>
      </a-alert>
    </a-card>

    <template v-else>
      <div class="page-header-row">
        <div>
          <h4 class="page-title">规则明细 · {{ assetId }}</h4>
          <span class="page-desc">验证「分数为什么低」30 秒内可答（低保真 §4 规则明细钻取 / DQI-004）</span>
        </div>
        <a-space wrap>
          <a-button size="small" @click="showReadonlyNote">只读说明</a-button>
        </a-space>
      </div>

      <a-alert
        v-if="isExpired"
        style="margin-bottom: 16px"
        type="warning"
        show-icon
        message="结果已过期（历史批次展示）"
        description="过期由系统按结果有效期自动流转，非用户动作；重新推送或通道重试拉取后，恢复为已计算档位（状态矩阵 §2 健康分·恢复路径）。"
      />

      <a-spin :spinning="loading">
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :xs="24" :lg="10">
            <a-card title="分数来源区（透明可解释）" :bordered="false">
              <div class="score-source">
                <ScoreChip
                  :state="detail?.state"
                  :score="detail?.score"
                  :band="detail?.band"
                  :expired="detail?.expired"
                  big
                />
              </div>
              <a-descriptions :column="1" size="small" :items="scoreSourceItems" />
              <a-divider style="margin: 16px 0" />
              <div class="algorithm-text">
                <div class="algorithm-title">算法说明：</div>
                <div>
                  {{
                    detail?.algorithm?.formula ||
                    '健康分 = Σ(规则权重 × 规则得分)，规则得分：通过=100、通过·告警=80、失败=0；权重为 MVP 固定默认系数（OQ-02 / SB-02 已确认，配置化 P1）。'
                  }}
                </div>
                <div v-if="weightTexts" class="algorithm-weights">{{ weightTexts }}</div>
              </div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="14">
            <a-card title="规则明细" :bordered="false" class="table-card">
              <template #extra>
                <span class="card-extra">资产级规则明细（DQI-004）</span>
              </template>
              <YTable
                :columns="ruleColumns"
                :data="detail?.rules ?? []"
                :row-config="{ keyField: 'ruleName', useKey: true }"
                :row-class-name="() => (isExpired ? 'gray-row' : '')"
                :loading="loading"
              >
                <template #ruleName="{ row }">
                  <a-space>
                    <span>{{ row.ruleName }}</span>
                    <a-tag v-if="row.status === 'failed'" color="error">failed</a-tag>
                  </a-space>
                </template>
                <template #weight="{ row }">
                  {{ weightText(row) }}
                </template>
                <template #status="{ row }">
                  <StatusTag :status="row.status" />
                </template>
                <template #failureReason="{ row }">
                  <span :class="row.status === 'failed' || row.status === 'error' ? 'danger-text' : 'secondary-text'">
                    {{ reasonText(row) }}
                  </span>
                </template>
                <template #toolTime="{ row }">
                  {{ row.toolTime || '—' }}
                </template>
              </YTable>
              <div class="ref-note">
                状态矩阵 §2 健康分（规则级得分明细）；§3 规则明细钻取（加载 / 空 / 过期标识 / 错误 / 只读）；低保真 §4
                规则明细钻取
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-spin>
    </template>
  </div>
</template>

<style scoped>
.page-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.page-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
.page-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
.card-extra {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.score-source {
  margin-bottom: 8px;
}
.algorithm-text {
  font-size: 13px;
  line-height: 1.8;
  color: rgba(0, 0, 0, 0.65);
}
.algorithm-title {
  font-weight: 600;
}
.algorithm-weights {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
}
.danger-text {
  color: #ff4d4f;
}
.secondary-text {
  color: rgba(0, 0, 0, 0.45);
}
.ref-note {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 8px;
}
.empty-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>

<style>
/* 过期明细行标灰（vxe 行渲染，需全局作用域） */
.gray-row td {
  color: #8c8c8c;
}
</style>
