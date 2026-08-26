/** * 分级分类页 - 传播区组件（WU-FE-08） *
传播中进度（状态矩阵「传播中」）、完成/失败提示（覆盖范围可核验）、未触发空态。 */
<script setup lang="ts">
import { YCard } from '@yss-ui/components';
import type { PropagateTaskItem } from '../type';

defineProps<{
  propagating: boolean;
  task: PropagateTaskItem | null;
  description: string;
}>();

defineOptions({ name: 'GovernancePropagateZone' });
</script>

<template>
  <YCard title="分类传播" class="governance-page__section" :bordered="false" size="small">
    <a-spin :spinning="propagating">
      <a-alert v-if="propagating" type="info" show-icon message="分类传播中…（同版本只跑一次，幂等）" />
      <a-alert
        v-else-if="task"
        :type="task.status === 'failed' ? 'error' : task.status === 'success' ? 'success' : 'info'"
        show-icon
        :message="task.status === 'failed' ? '分类传播失败' : task.status === 'success' ? '分类传播完成' : '分类传播中'"
        :description="description"
      />
      <a-alert
        v-else
        type="info"
        show-icon
        message="尚未触发传播"
        description="在识别结果行选择「传播」将候选分类沿血缘传播到下游资产（同版本只跑一次，覆盖范围可核验）"
      />
    </a-spin>
  </YCard>
</template>

<style scoped lang="less">
@import '../style.less';
</style>
