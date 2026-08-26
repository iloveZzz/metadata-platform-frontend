<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { YButton } from '@yss-ui/components';

defineOptions({ name: 'Exception404' });

const route = useRoute();
const router = useRouter();

/** 当前未匹配的子应用路由。 */
const missingPath = computed(() => route.fullPath);

/** 返回当前微应用首页。 */
const goHome = async (): Promise<void> => {
  await router.replace('/');
};
</script>

<template>
  <a-result status="404" title="404" :sub-title="`抱歉，您访问的页面不存在：${missingPath}`">
    <template #extra>
      <YButton type="primary" @click="goHome">返回首页</YButton>
    </template>
  </a-result>
</template>
