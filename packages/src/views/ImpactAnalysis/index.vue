/** * 影响分析页（WU-FE-07，路由 /assets/:id/impact） * 仅负责组合 Hooks 与渲染视图模板（≤150 行），业务逻辑见 hooks/ 与
constant.ts。 * 深度分组展平为行表；sortBy 切换组内排序；导出触发 202 异步任务。 */
<script setup lang="ts">
import { YButton, YCard, YTable } from '@yss-ui/components';
import { DownloadOutlined } from '@ant-design/icons-vue';
import { useImpactAnalysis } from './hooks/useImpactAnalysis';
import {
  EXPORT_FORMAT_OPTIONS,
  IMPACT_COLUMNS,
  IMPACT_SORT_OPTIONS,
  getImpactDepthMeta,
  getImpactRiskMeta,
} from './constant';
import { getClassificationMeta } from '../Asset/constant';

defineOptions({ name: 'AssetImpact' });

const {
  loading,
  loadError,
  exporting,
  centerAsset,
  sortBy,
  rows,
  isEmpty,
  summary,
  fetchImpact,
  handleSortByChange,
  handleExport,
  goAsset,
  goLineage,
  goDetail,
} = useImpactAnalysis();
</script>

<template>
  <div class="impact-page">
    <YCard class="impact-page__card" :bordered="false">
      <div class="impact-page__header">
        <div>
          <a-breadcrumb>
            <a-breadcrumb-item>
              <a class="impact-page__breadcrumb-link" @click="goDetail">{{ centerAsset.name || '资产详情' }}</a>
            </a-breadcrumb-item>
            <a-breadcrumb-item>影响分析</a-breadcrumb-item>
          </a-breadcrumb>
          <div class="impact-page__title">影响分析</div>
          <div class="impact-page__desc">
            变更「{{ centerAsset.name || centerAsset.id }}」将影响以下下游资产（全量召回，可按影响深度排序）
          </div>
        </div>
        <a-space wrap>
          <a-select
            :value="sortBy"
            style="width: 140px"
            :options="IMPACT_SORT_OPTIONS"
            :disabled="loading"
            @change="handleSortByChange"
          />
          <YButton
            v-for="option in EXPORT_FORMAT_OPTIONS"
            :key="option.value"
            :type="option.value === 'csv' ? 'primary' : 'default'"
            :loading="exporting"
            :disabled="loading || isEmpty"
            @click="handleExport(option.value)"
          >
            <template #icon><DownloadOutlined /></template>
            导出 {{ option.label }}
          </YButton>
        </a-space>
      </div>

      <a-alert
        v-if="!loadError && !loading && !isEmpty"
        type="info"
        show-icon
        class="impact-page__summary"
        :message="`全量召回：下游受影响资产 ${summary.total} 个（直接 ${summary.direct} / 间接 ${summary.indirect}），未发现遗漏路径。`"
      />

      <a-alert
        v-if="loadError"
        class="impact-page__error"
        type="error"
        show-icon
        message="影响分析加载失败"
        description="请检查网络或稍后重试"
      >
        <template #action>
          <YButton size="small" @click="fetchImpact">重试</YButton>
          <YButton size="small" @click="goDetail">返回详情</YButton>
        </template>
      </a-alert>

      <a-spin :spinning="loading">
        <div v-if="!loadError" class="impact-page__table-area">
          <a-empty
            v-if="isEmpty"
            class="impact-page__empty"
            :description="`「${centerAsset.name || centerAsset.id}」暂无下游依赖（0 影响以空结构表达，非错误）`"
          >
            <YButton type="primary" @click="goLineage">返回血缘图谱</YButton>
          </a-empty>
          <YTable v-else :data="rows" :columns="IMPACT_COLUMNS" :row-config="{ keyField: '_rowKey', useKey: true }">
            <template #name="{ row }">
              <a class="impact-page__asset-link" @click="goAsset(row.assetId)">{{ row.name || row.assetId }}</a>
            </template>
            <template #depth="{ row }">
              <a-tag :color="getImpactDepthMeta(row.depth).color">
                {{ getImpactDepthMeta(row.depth).label }}
              </a-tag>
            </template>
            <template #type="{ row }">
              <a-tag>{{ row.type }}</a-tag>
            </template>
            <template #risk="{ row }">
              <a-tag :color="getImpactRiskMeta(row.risk).color">
                {{ getImpactRiskMeta(row.risk).label }}
              </a-tag>
            </template>
            <template #classification="{ row }">
              <a-tag :color="getClassificationMeta(row.classification).color">
                {{ getClassificationMeta(row.classification).label }}
              </a-tag>
            </template>
          </YTable>
        </div>
      </a-spin>
    </YCard>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
