<template>
  <a-result status="404" title="404" sub-title="页面不存在">
    <template #extra>
      <a-button type="primary" @click="$router.push('/dashboard')">返回健康分仪表盘</a-button>
    </template>
  </a-result>
</template>
