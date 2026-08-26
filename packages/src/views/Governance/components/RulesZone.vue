/** * 分级分类页 - 识别规则区组件（WU-FE-08） * 规则列表 + 类型/启停插槽；修正经 action-config；启停切换 emit
由父级处理（乐观更新 + 审计提示）。 */
<script setup lang="ts">
import { YCard, YTable } from '@yss-ui/components';
import type { YTableActionConfig } from '@yss-ui/components';
import { RULE_COLUMNS, getRuleTypeMeta } from '../constant';
import type { ClassRuleItem } from '../type';

defineProps<{
  loading: boolean;
  rules: ClassRuleItem[];
  actionConfig: YTableActionConfig;
  /** 规则启停请求进行中的行 id（该行 Switch 禁用防重复提交） */
  togglingId: string;
}>();

const emit = defineEmits<{
  (e: 'toggle', row: ClassRuleItem, checked: unknown): void;
}>();

defineOptions({ name: 'GovernanceRulesZone' });
</script>

<template>
  <YCard title="识别规则" class="governance-page__section" :bordered="false" size="small">
    <YTable
      :data="rules"
      :columns="RULE_COLUMNS"
      :action-config="actionConfig"
      :loading="loading"
      :row-config="{ keyField: 'id', useKey: true }"
    >
      <template #type="{ row }">
        <a-tag>{{ getRuleTypeMeta(row.type) }}</a-tag>
      </template>
      <template #enabled="{ row }">
        <a-switch
          :checked="row.enabled"
          :disabled="loading || togglingId === row.id"
          @change="(checked: unknown) => emit('toggle', row, checked)"
        />
      </template>
    </YTable>
  </YCard>
</template>

<style scoped lang="less">
@import '../style.less';
</style>
