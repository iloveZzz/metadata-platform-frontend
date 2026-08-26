<script setup lang="ts">
defineOptions({ name: 'Perm403' });

withDefaults(
  defineProps<{
    /** 无权限提示说明（状态矩阵 §3 无权限 / 决策 DQI-007） */
    desc?: string;
  }>(),
  {
    desc: '您不在该数据域内或角色权限不足。域外资产质量结果不展示；操作类无权限时按钮禁用；直接调用接口将返回 403。',
  }
);
</script>

<template>
  <div class="perm-403">
    <a-result status="403" title="无权限访问" :sub-title="desc" />
  </div>
</template>

<style scoped>
.perm-403 {
  max-width: 480px;
  margin: 48px auto;
}
</style>
