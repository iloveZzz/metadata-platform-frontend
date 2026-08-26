<template>
  <a-config-provider :theme="themeConfig" :locale="zhCN">
    <div class="micro-app">
      <!-- 独立运行或本地开发模式 -->
      <MainLayout v-if="showLayout" :routes="menuRoutes" :selected-keys="selectedKeys" />

      <!-- qiankun 环境中运行 -->
      <div v-else class="micro-content">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <keep-alive>
              <component :is="Component" v-if="route.meta.keepAlive === true" :key="route.name || route.fullPath" />
            </keep-alive>
          </transition>
          <transition name="fade" mode="out-in">
            <component :is="Component" v-if="route.meta.keepAlive !== true" :key="route.fullPath" />
          </transition>
        </router-view>
      </div>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import routes, { menuRoutes } from './router';
import { useQiankun } from './hooks/useQiankun';
import { useRouteMenu } from './hooks/useRouteMenu';
import { useThemeStore } from './store/theme';
import { onMounted, computed } from 'vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import MainLayout from '@/layout/MainLayout.vue';

const { isInQiankun } = useQiankun();
const isDev = import.meta.env.MODE.includes('development');
// 是否在独立部署时强制显示导航布局
// 在packages/.env.production 里 VITE_STANDALONE_LAYOUT 改为false 单独部署之后，就不显示导航了
const showStandaloneLayout = import.meta.env.VITE_STANDALONE_LAYOUT === 'true';

// 是否显示导航布局：非 qiankun 环境下，开发模式或环境变量配置为 true 时显示
const showLayout = computed(() => !isInQiankun.value && (isDev || showStandaloneLayout));

// 本地服务 路由菜单
const { selectedKeys } = useRouteMenu(routes);

// 主题配置
const themeStore = useThemeStore();
const themeConfig = computed(() => themeStore.themeConfig);

// 主题初始化：当作为微应用被加载时，主应用会通过 props 传入 themeConfig（在 main.ts 中处理）
onMounted(() => {
  themeStore.init();
});
</script>

<style lang="less" scoped>
.micro-app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100%;
}

// qiankun 环境下的样式
.micro-content {
  width: 100%;
  height: 100%;
  padding: 12px;
  background: #f0f2f5;
  overflow: auto;

  // 确保在 qiankun 环境下内容能够正确显示
  :deep(.ant-layout-content) {
    padding: 24px;
  }

  // 过渡动画
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
}
</style>
