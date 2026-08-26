/** * 分级分类页 - 识别结果区组件（WU-FE-08） * 候选列表（资产/字段/候选分类/敏感等级/状态）+ 空态（0
候选空结构非错误）+ 行操作（确认/修正/传播）。 */
<script setup lang="ts">
import { YCard, YTable } from '@yss-ui/components';
import type { YTableActionConfig } from '@yss-ui/components';
import { RESULT_COLUMNS, getClassificationMeta, getResultStatusMeta } from '../constant';
import type { ClassificationItem } from '../type';

defineProps<{
  loading: boolean;
  results: ClassificationItem[];
  actionConfig: YTableActionConfig;
}>();

defineOptions({ name: 'GovernanceResultsZone' });
</script>

<template>
  <YCard title="识别结果（待确认 / 已确认 / 已修正）" class="governance-page__section" :bordered="false" size="small">
    <a-empty
      v-if="!loading && results.length === 0"
      class="governance-page__empty"
      description="暂无识别结果：采集任务开启「采集时自动识别敏感分类」后，命中字段将在此生成待确认候选（0 候选空结构非错误）"
    />
    <YTable
      v-else
      :data="results"
      :columns="RESULT_COLUMNS"
      :action-config="actionConfig"
      :loading="loading"
      :row-config="{ keyField: 'id', useKey: true }"
    >
      <template #name="{ row }">
        <a-tag :color="getClassificationMeta(row.name).color">{{ row.name || '—' }}</a-tag>
      </template>
      <template #status="{ row }">
        <a-tag :color="getResultStatusMeta(row.status).color">
          {{ getResultStatusMeta(row.status).label }}
        </a-tag>
      </template>
    </YTable>
  </YCard>
</template>

<style scoped lang="less">
@import '../style.less';
</style>
