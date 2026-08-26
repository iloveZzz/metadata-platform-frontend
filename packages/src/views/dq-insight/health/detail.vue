<script setup lang="ts">
import { computed, h, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { YTable, type YTableColumn } from '@yss-ui/components';
import type { AssetHealthDetail } from '@/api';
import { customMessage } from '@/utils/message';
import BandTag from '@/components/dq-insight/BandTag.vue';
import StateTag from '@/components/dq-insight/StateTag.vue';
import ScoreChip from '@/components/dq-insight/ScoreChip.vue';
import Perm403 from '@/components/dq-insight/Perm403.vue';
import { useHealthDetail } from './hooks/useHealthDetail';

defineOptions({ name: 'HealthDetailPage' });

const route = useRoute();
const router = useRouter();
const assetId = computed(() => String(route.params.assetId ?? ''));

const { detail, fieldRows, loading, isForbidden, isNotFound, hasError, run, retry } = useHealthDetail(assetId.value);

onMounted(() => {
  run();
});

/** 分数钻取 → 规则明细（DQI-004） */
const goRules = () => {
  router.push(`/health/${assetId.value}/rules`);
};

const goChannels = () => {
  router.push('/channels');
};

const goDashboard = () => {
  router.push('/dashboard');
};

const showReadonlyNote = () => {
  customMessage.info('健康分视图为只读展示，无写操作（状态矩阵 §3·只读）');
};

/** 档位大数字环形图颜色（语义色） */
const bandColor = computed(() => {
  const d = detail.value;
  if (!d || d.expired || d.state === 'expired') return '#8c8c8c';
  return d.band === '优' ? '#52c41a' : d.band === '良' ? '#faad14' : '#ff4d4f';
});

const progressPercent = computed(() => {
  const d = detail.value;
  if (!d) return 0;
  if (d.expired || d.state === 'expired') return 100;
  return d.score ?? 0;
});

const sourceToolText = (d?: AssetHealthDetail) =>
  d?.sourceTool === 'great-expectations' ? 'Great Expectations' : d?.sourceTool === 'generic' ? '通用导入' : '—';

/** 资产级概览（items 的 children 用 h() 构造 vnode） */
const overviewItems = computed(() => {
  const d = detail.value;
  return [
    {
      key: 'band',
      label: '健康分档位',
      children:
        d?.state === 'ok' || d?.band
          ? h(BandTag, { band: d?.band })
          : d?.state === 'calculating'
            ? h('span', undefined, '计算中')
            : h(StateTag, { state: 'expired' }),
    },
    { key: 'lastResultAt', label: '最近结果时间', children: d?.lastResultAt || '—' },
    { key: 'passRate', label: '规则通过率', children: d?.passRate || '—' },
    {
      key: 'validUntil',
      label: '结果有效期至',
      children: d?.expired || d?.state === 'expired' ? `${d?.validUntil || '—'}（已过期）` : d?.validUntil || '—',
    },
    {
      key: 'ruleVersion',
      label: '计算规则版本',
      children: h('code', undefined, d?.ruleVersion || '—'),
    },
    { key: 'sourceTool', label: '结果来源', children: h('span', undefined, sourceToolText(d)) },
  ];
});

const fieldColumns: YTableColumn[] = [
  { field: 'fieldName', title: '字段名', minWidth: 180 },
  { field: 'score', title: '健康分', width: 170 },
  { field: 'band', title: '档位', width: 110 },
  { field: 'ruleCount', title: '规则数', width: 90 },
  { field: 'low', title: '低分标识', width: 120 },
];

/** 低分字段标红置顶：排序在 buildFieldRows（过期置顶 → 低分置顶），标红由 API lowScore 驱动 */
const isLowField = (row: { low?: boolean; expired?: boolean }) => !!row.low && !row.expired;
</script>

<template>
  <div class="health-detail-page">
    <a-breadcrumb style="margin-bottom: 12px">
      <a-breadcrumb-item>
        <a @click="goDashboard">数据质量</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>{{ detail?.assetName || assetId }}</a-breadcrumb-item>
    </a-breadcrumb>

    <Perm403
      v-if="isForbidden"
      desc="您不在该资产所属数据域内，无法查看健康分详情。域外资产质量结果不展示，请联系管理员申请数据域权限（DQI-007）。"
    />

    <!-- 无结果空态：后端 404 = 该资产无健康分结果（状态矩阵 §3 资产级与字段级健康分视图·无结果） -->
    <div v-else-if="isNotFound">
      <div class="page-header-row">
        <div>
          <h4 class="page-title">{{ assetId }}</h4>
          <span class="page-desc">资产健康分详情（该资产暂无健康分结果）</span>
        </div>
      </div>
      <a-card :bordered="false">
        <a-empty>
          <template #description>
            <div>
              未接入质量结果
              <span class="empty-desc"
                >该资产从未接入或接入失败（对应通道拉取失败），暂无健康分。覆盖率口径见 SB-07（已确认）。</span
              >
            </div>
          </template>
          <a-space wrap>
            <a-button type="primary" @click="goChannels">前往通道管理</a-button>
            <a-button @click="goRules">查看规则明细（空态）</a-button>
          </a-space>
        </a-empty>
      </a-card>
    </div>

    <!-- 错误态：可重试，不清空已展示数据（状态矩阵 §3 资产级与字段级健康分视图·错误） -->
    <a-card v-else-if="hasError" :bordered="false">
      <a-alert type="error" show-icon message="健康分详情请求失败">
        <template #description>可重试错误，不影响已展示数据。</template>
        <template #action>
          <a-button size="small" @click="retry">重试</a-button>
        </template>
      </a-alert>
    </a-card>

    <template v-else>
      <div class="page-header-row">
        <div>
          <h4 class="page-title">{{ detail?.assetName || assetId }}</h4>
          <a-space wrap style="margin-top: 8px">
            <a-tag>{{ detail?.domain || '—' }}</a-tag>
            <a-tag>{{ detail?.assetType === 'table' ? '表' : '视图' }}</a-tag>
          </a-space>
        </div>
        <a-space wrap>
          <a-button size="small" @click="showReadonlyNote">只读说明</a-button>
        </a-space>
      </div>

      <a-spin :spinning="loading">
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :xs="24" :lg="8">
            <a-card :bordered="false">
              <div class="score-center">
                <a-progress
                  type="dashboard"
                  :percent="progressPercent"
                  :stroke-color="bandColor"
                  :trail-color="'#f0f0f0'"
                >
                  <template #format>
                    <ScoreChip
                      :state="detail?.state"
                      :score="detail?.score"
                      :band="detail?.band"
                      :expired="detail?.expired"
                      big
                      clickable
                      @click="goRules"
                    />
                  </template>
                </a-progress>
                <div style="margin-top: 8px">
                  <StateTag v-if="detail?.expired || detail?.state === 'expired'" state="expired" />
                  <span v-else class="page-desc">点击分数进入规则明细钻取（DQI-004）</span>
                </div>
                <a-alert
                  v-if="detail?.expired || detail?.state === 'expired'"
                  type="warning"
                  show-icon
                  message="结果已过期，请重新接入"
                  style="margin-top: 8px; text-align: left"
                  description="过期由系统按结果有效期自动流转，非用户动作（OQ-03 已确认）；恢复路径 = 重新推送或通道重试拉取。"
                />
              </div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="16">
            <a-card title="资产级概览" :bordered="false">
              <a-descriptions :column="{ xs: 1, sm: 2 }" size="small" bordered :items="overviewItems" />
            </a-card>
          </a-col>
        </a-row>

        <a-card title="字段级健康分" :bordered="false" class="table-card">
          <template #extra>
            <span class="card-extra">低分字段标红置顶（低保真 §4 字段级区）</span>
          </template>
          <YTable
            :columns="fieldColumns"
            :data="fieldRows()"
            :row-config="{ keyField: 'fieldName', useKey: true }"
            :loading="loading"
          >
            <template #fieldName="{ row }">
              <a-typography-text code :type="row.expired ? 'secondary' : undefined">
                {{ row.fieldName }}
              </a-typography-text>
            </template>
            <template #score="{ row }">
              <ScoreChip
                :state="row.state"
                :score="row.score"
                :band="row.band"
                :expired="row.expired"
                clickable
                @click="goRules"
              />
            </template>
            <template #band="{ row }">
              <a-tag v-if="row.expired">过期</a-tag>
              <BandTag v-else :band="row.band" />
            </template>
            <template #ruleCount="{ row }">
              {{ row.expired ? '—' : (row.ruleCount ?? '—') }}
            </template>
            <template #low="{ row }">
              <span v-if="isLowField(row)" class="low-field">● 低分字段</span>
              <span v-else class="page-desc">—</span>
            </template>
          </YTable>
          <div class="ref-note">
            状态矩阵 §3 资产级与字段级健康分视图（加载 / 无结果 / 过期 / 错误 / 只读 / 无权限）；字段分数点击 =
            规则明细钻取入口（DQI-004）
          </div>
        </a-card>
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
.score-center {
  text-align: center;
  padding: 8px 0;
}
.danger-text {
  color: #ff4d4f;
}
.low-field {
  color: #cf1322;
  font-weight: 600;
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
