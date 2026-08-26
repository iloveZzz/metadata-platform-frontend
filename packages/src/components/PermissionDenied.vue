<template>
  <a-result status="403" title="无权限访问" :sub-title="desc">
    <template #extra>
      <YButton type="primary" @click="goBack">返回上页</YButton>
    </template>
  </a-result>
</template>

<script setup lang="ts">
/**
 * 无权限兜底组件（WU-FE-11；状态矩阵"无权限"：浏览隐藏/操作禁用/403 兜底展示）。
 * 非管理员访问管理端页面时展示；desc 说明权限缺失原因（不泄露受限数据）。
 */
import { YButton } from '@yss-ui/components';

defineProps<{ desc?: string }>();

const goBack = () => {
  if (history.length > 1) {
    history.back();
  } else {
    window.location.hash = '#/';
  }
};
</script>
