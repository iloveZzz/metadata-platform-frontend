<script setup lang="ts">
import { computed } from 'vue';
import type { RuleStatus } from '@/api';
import { RULE_STATUS_META } from './constants';

defineOptions({ name: 'StatusTag' });

const props = defineProps<{
  /** 规则结果（passed / warn / failed / error） */
  status: RuleStatus;
}>();

const meta = computed(() => RULE_STATUS_META[props.status]);
</script>

<template>
  <a-tag :color="meta.color">{{ meta.text }}</a-tag>
</template>
