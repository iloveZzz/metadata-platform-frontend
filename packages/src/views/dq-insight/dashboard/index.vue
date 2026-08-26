<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { YTable, type YTableColumn } from '@yss-ui/components';
import type { AssetHealthRow } from '@/api';
import HealthBandDistribution from '@/components/dq-insight/HealthBandDistribution.vue';
import BandTag from '@/components/dq-insight/BandTag.vue';
import StateTag from '@/components/dq-insight/StateTag.vue';
import ScoreChip from '@/components/dq-insight/ScoreChip.vue';
import Perm403 from '@/components/dq-insight/Perm403.vue';
import { useDashboard } from './hooks/useDashboard';

defineOptions({ name: 'DashboardPage' });

const router = useRouter();
const {
  filters,
  pagination,
  stats,
  list,
  loading,
  isForbidden,
  hasError,
  query,
  onFilterChange,
  onPageChange,
  onSizeChange,
  retry,
} = useDashboard();

onMounted(() => {
  query();
});

/** 主流程闭环（低保真 §3 流程一）：点击资产 → 资产级与字段级健康分视图（DQI-003） */
const goAsset = (row: AssetHealthRow) => {
  router.push(`/health/${row.assetId}`);
};

/** 分数钻取 → 规则明细（DQI-004） */
const goRules = (row: AssetHealthRow) => {
  router.push(`/health/${row.assetId}/rules`);
};

/** 空态主操作 = 引导接入（状态矩阵 §4 空态主操作） */
const goChannels = () => {
  router.push('/channels');
};

const hasActiveFilter = computed(() => !!(filters.domain || filters.band || filters.assetType));

/** 空态（未接入质量结果）：无任何记录且无筛选条件；覆盖率口径 SB-07 已确认 */
const showEmptyGuide = computed(() => pagination.total === 0 && !hasActiveFilter.value);

/** 空分页（筛选条件下 0 条 = 空分页结果，非错误，C28） */
const showEmptyPage = computed(() => list.value.length === 0 && pagination.total === 0 && hasActiveFilter.value);

const paginationProps = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  remote: true,
  showTotal: (total: number) => `共 ${total} 条`,
}));

/** 数据域候选（冻结契约无字典接口，MVP 用静态候选清单，与高保真原型一致） */
const domainOptions = ['交易域', '客户域', '财务域', '公共域', '风控域'].map(d => ({
  value: d,
  label: d,
}));

const bandOptions = [
  { value: '优', label: '优（可放心使用）' },
  { value: '良', label: '良（存在少量问题）' },
  { value: '差', label: '差（不建议直接使用）' },
  { value: 'expired', label: '过期（独立态）' },
  { value: 'noresult', label: '无结果（独立态）' },
];

const typeOptions = [
  { value: 'table', label: '表' },
  { value: 'view', label: '视图' },
];

/** 资产列表列（排序为当前页 vxe 本地排序；服务端 sort 参数默认 score） */
const columns: YTableColumn[] = [
  { field: 'assetName', title: '资产名称', sortable: true, minWidth: 200 },
  { field: 'domain', title: '数据域', width: 110 },
  { field: 'assetType', title: '类型', width: 90 },
  { field: 'score', title: '健康分', sortable: true, width: 170 },
  { field: 'band', title: '档位', width: 130 },
  { field: 'lastResultAt', title: '最近结果时间', sortable: true, minWidth: 170 },
  { field: 'hasResult', title: '是否有结果', width: 110 },
];

const assetTypeText = (type?: string) => (type === 'table' ? '表' : '视图');
</script>

<template>
  <div class="dashboard-page">
    <a-breadcrumb style="margin-bottom: 12px" :items="[{ title: '数据质量' }, { title: '健康分仪表盘' }]" />

    <Perm403
      v-if="isForbidden"
      desc="您不在任何已授权数据域内，无法查看质量结果。域外资产质量结果不展示，请联系管理员申请数据域权限（状态矩阵 §3 无权限，DQI-007）。"
    />

    <template v-else>
      <div class="page-header-row">
        <div>
          <h4 class="page-title">健康分仪表盘</h4>
          <span class="page-desc">
            资产级 /
            字段级质量总览：档位由规则加权计算（透明可解释），点击资产进入健康分视图，点击分数钻取规则明细（低保真 §2
            页面地图 / DQI-003）
          </span>
        </div>
      </div>

      <a-spin :spinning="loading">
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :xs="24" :lg="10">
            <a-card title="资产健康分分布" :bordered="false" style="margin-bottom: 16px">
              <template #extra>
                <span class="card-extra">无结果 / 过期不归入档位</span>
              </template>
              <HealthBandDistribution :distribution="stats?.bandDistribution" :total="stats?.targetAssetCount" />
              <div class="ref-note">
                状态矩阵 §2 健康分（档位阈值 OQ-01 已确认 ≥90 优 / 75~89 良 / &lt;75 差）；覆盖率口径 SB-07 已确认
              </div>
            </a-card>
          </a-col>
          <a-col :xs="24" :lg="14">
            <a-row :gutter="16">
              <a-col :xs="24" :md="8">
                <a-card :bordered="false" style="margin-bottom: 16px">
                  <a-statistic title="已接入资产数" :value="stats?.ingestedAssetCount ?? 0" suffix="个" />
                  <div class="stat-note">已有 DQ 结果（含过期）</div>
                </a-card>
              </a-col>
              <a-col :xs="24" :md="8">
                <a-card :bordered="false" style="margin-bottom: 16px">
                  <a-statistic
                    title="低分资产数（档位=差）"
                    :value="stats?.lowScoreAssetCount ?? 0"
                    :value-style="{ color: '#cf1322' }"
                  />
                  <div class="stat-note">建议治理关注</div>
                </a-card>
              </a-col>
              <a-col :xs="24" :md="8">
                <a-card :bordered="false" style="margin-bottom: 16px">
                  <a-statistic title="健康分覆盖率" :value="Math.round(stats?.coverage ?? 0)" suffix="%" />
                  <div class="stat-note">
                    {{ stats?.ingestedAssetCount ?? 0 }}/{{ stats?.targetAssetCount ?? 0 }} 目标资产已有结果
                  </div>
                </a-card>
              </a-col>
            </a-row>
          </a-col>
        </a-row>
      </a-spin>

      <div class="toolbar">
        <a-select
          v-model:value="filters.domain"
          allow-clear
          placeholder="数据域"
          style="width: 140px"
          :options="domainOptions"
          @change="onFilterChange"
        />
        <a-select
          v-model:value="filters.band"
          allow-clear
          placeholder="档位"
          style="width: 160px"
          :options="bandOptions"
          @change="onFilterChange"
        />
        <a-select
          v-model:value="filters.assetType"
          allow-clear
          placeholder="资产类型"
          style="width: 130px"
          :options="typeOptions"
          @change="onFilterChange"
        />
        <span class="toolbar-hint">数据域筛选与 RBAC 一致生效，域外资产不可见（DQI-007）</span>
      </div>

      <!-- 错误态：可重试错误，不清空筛选条件（状态矩阵 §3 健康分仪表盘页·错误） -->
      <a-card v-if="hasError" :bordered="false">
        <a-alert type="error" show-icon message="列表请求失败">
          <template #description>可重试错误，不清空筛选条件。</template>
          <template #action>
            <a-button size="small" @click="retry">重试</a-button>
          </template>
        </a-alert>
      </a-card>

      <!-- 空态：未接入质量结果 → 引导接入（状态矩阵 §3 健康分仪表盘页·空数据） -->
      <a-card v-else-if="showEmptyGuide && !loading" :bordered="false">
        <a-empty>
          <template #description>
            <div>
              未接入质量结果
              <span class="empty-desc"
                >当前数据域内尚无 DQ 结果（覆盖率 0%）；完成外部工具接入后，健康分与档位将在此展示。覆盖率口径见
                SB-07（已确认）。</span
              >
            </div>
          </template>
          <a-button type="primary" @click="goChannels">前往通道管理 · 新建通道</a-button>
        </a-empty>
      </a-card>

      <!-- 资产列表（分页 / 筛选 / 排序；空分页非错误，C28） -->
      <a-card v-else :bordered="false" class="table-card">
        <YTable
          :columns="columns"
          :data="list"
          :pageable="true"
          :pagination="paginationProps"
          :row-config="{ keyField: 'assetId', useKey: true }"
          :loading="loading"
          @page-change="onPageChange"
          @size-change="onSizeChange"
        >
          <template #assetName="{ row }">
            <a @click="goAsset(row)">{{ row.assetName }}</a>
          </template>
          <template #assetType="{ row }">
            <a-tag>{{ assetTypeText(row.assetType) }}</a-tag>
          </template>
          <template #score="{ row }">
            <ScoreChip
              :state="row.state"
              :score="row.score"
              :band="row.band"
              :expired="row.expired"
              clickable
              @click="goRules(row)"
            />
          </template>
          <template #band="{ row }">
            <BandTag v-if="row.state === 'ok'" :band="row.band" />
            <a-tag v-else-if="row.state === 'calculating'" color="processing">计算中</a-tag>
            <StateTag v-else :state="row.state === 'expired' ? 'expired' : 'noresult'" />
          </template>
          <template #hasResult="{ row }">
            <a-tag v-if="row.hasResult" color="success">有结果</a-tag>
            <a-tag v-else>无结果</a-tag>
          </template>
        </YTable>
        <div v-if="showEmptyPage" class="empty-page">当前筛选条件下无资产（0 条记录为空分页结果，非错误）</div>
      </a-card>
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
.stat-note {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  align-items: center;
}
.toolbar-hint {
  font-size: 12px;
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
.empty-page {
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
