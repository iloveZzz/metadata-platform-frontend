<script setup lang="ts">
import RecursiveMenu from '@components/RecursiveMenu.vue';
import AskMetadataCopilot from '@/components/AskMetadataCopilot/AskMetadataCopilot.vue';
import {
  BellOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloudOutlined,
} from '@ant-design/icons-vue';

import type { RouteRecordRaw } from 'vue-router';
import { computed } from 'vue';

interface Props {
  routes: RouteRecordRaw[];
  selectedKeys: string[];
}

const props = defineProps<Props>();

/**
 * 过滤导航菜单路由
 * 过滤掉配置了 meta.menuType === 'INNER_MENU' 的内嵌路由
 */
const visibleRoutes = computed(() => {
  const filterInnerMenus = (routes: RouteRecordRaw[]): RouteRecordRaw[] => {
    return routes
      .filter(route => {
        // 过滤掉内嵌菜单
        return route.meta?.menuType !== 'INNER_MENU';
      })
      .map(route => {
        // 如果有子路由，递归过滤
        if (route.children && route.children.length > 0) {
          return {
            ...route,
            children: filterInnerMenus(route.children),
          };
        }
        return route;
      });
  };

  return filterInnerMenus(props.routes);
});
</script>

<template>
  <a-layout class="main-layout">
    <a-layout-header class="header">
      <div class="header-inner">
        <!-- Brand / Logo -->
        <div class="brand">
          <div class="logo-icon">
            <CloudOutlined />
          </div>
          <span class="brand-text">微应用平台</span>
        </div>

        <!-- Navigation -->
        <div class="nav-container">
          <RecursiveMenu
            :routes="visibleRoutes"
            :selected-keys="selectedKeys"
            theme="light"
            mode="horizontal"
            class="custom-menu"
          />
        </div>

        <!-- Right Actions -->
        <div class="actions">
          <a-tooltip title="帮助文档">
            <div class="action-item icon-btn">
              <QuestionCircleOutlined />
            </div>
          </a-tooltip>

          <a-tooltip title="消息通知">
            <div class="action-item icon-btn">
              <a-badge dot>
                <BellOutlined />
              </a-badge>
            </div>
          </a-tooltip>

          <a-dropdown placement="bottomRight" :trigger="['click']">
            <div class="action-item user-profile">
              <a-avatar size="small" src="https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png" />
              <span class="username">Admin</span>
            </div>
            <template #overlay>
              <a-menu class="user-dropdown-menu">
                <a-menu-item key="center">
                  <template #icon><UserOutlined /></template>
                  个人中心
                </a-menu-item>
                <a-menu-item key="settings">
                  <template #icon><SettingOutlined /></template>
                  个人设置
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" danger>
                  <template #icon><LogoutOutlined /></template>
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </a-layout-header>

    <a-layout-content class="main-content">
      <router-view v-slot="{ Component, route }">
        <transition name="fade-transform" mode="out-in">
          <keep-alive>
            <component :is="Component" v-if="route.meta.keepAlive === true" :key="route.name || route.fullPath" />
          </keep-alive>
        </transition>
        <transition name="fade-transform" mode="out-in">
          <component :is="Component" v-if="route.meta.keepAlive !== true" :key="route.fullPath" />
        </transition>
      </router-view>
    </a-layout-content>

    <!-- 全局 Ask Metadata Copilot 助手 -->
    <AskMetadataCopilot />
  </a-layout>
</template>

<style scoped lang="less">
.main-layout {
  height: 100%;
  background-color: #f0f2f5;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  height: 64px;
  padding: 0;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  /* justify-content: center; Removed to fill width */

  .header-inner {
    width: 100%;
    /* max-width: 1440px; Removed to fill width */
    display: flex;
    align-items: center;
    padding: 0 24px;
    height: 100%;
  }
}

.brand {
  display: flex;
  align-items: center;
  margin-right: 48px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    opacity: 0.8;
  }

  .logo-icon {
    font-size: 28px;
    color: #1890ff;
    margin-right: 12px;
    display: flex;
    align-items: center;
  }

  .brand-text {
    font-size: 20px;
    font-weight: 600;
    color: #001529;
    background: linear-gradient(45deg, #1890ff, #001529);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: 0.5px;
  }
}

.nav-container {
  flex: 1;
  min-width: 0; // Prevent overflow

  .custom-menu {
    border-bottom: none;
    background: transparent;
    line-height: 64px;

    :deep(.ant-menu-item) {
      top: 0; // Fix alignment
      &::after {
        bottom: 0;
      }
    }
  }
}

.actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  height: 100%;

  .action-item {
    display: flex;
    align-items: center;
    padding: 0 12px;
    height: 100%;
    cursor: pointer;
    transition: all 0.3s;
    color: rgba(0, 0, 0, 0.65);

    &:hover {
      background: rgba(0, 0, 0, 0.025);
      color: #1890ff;
    }

    &.search-wrapper {
      padding: 0 8px;
      &:hover {
        background: transparent;
      }
    }
  }

  .icon-btn {
    font-size: 18px;
  }

  .user-profile {
    margin-left: 8px;

    .username {
      margin-left: 8px;
      font-size: 14px;
      font-weight: 500;
    }
  }
}

.header-search {
  :deep(.ant-input) {
    border-radius: 4px;
    background-color: #f5f5f5;
    border: none;
    transition: all 0.3s;

    &:focus {
      background-color: #fff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
  }
}

.main-content {
  padding: 16px;
}

// Transitions
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
