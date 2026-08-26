<script setup lang="ts">
import { computed, h } from 'vue';
import { RouterLink } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import type { ItemType } from 'ant-design-vue';
import { useUserRole } from '@/hooks/useUserRole';

interface Props {
  routes: RouteRecordRaw[];
  selectedKeys?: string[];
  theme?: 'dark' | 'light';
  mode?: 'horizontal' | 'vertical' | 'inline';
}

const props = withDefaults(defineProps<Props>(), {
  selectedKeys: () => [],
  theme: 'dark',
  mode: 'horizontal',
});

const { isAdmin } = useUserRole();

const resolveMenuPath = (path: string, parentPath = '') => {
  if (path.startsWith('/')) return path;
  const normalizedParent = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
  return `${normalizedParent}/${path}` || '/';
};

// Transform routes to Ant Design Vue menu items
const transformRoutesToItems = (routes: RouteRecordRaw[], parentPath = ''): ItemType[] => {
  return routes
    .filter(
      route =>
        (!route.redirect || (route.children && route.children.length > 0)) &&
        route.meta?.title &&
        // 详情/异常等页面通过 meta.hidden 标识，不进入导航菜单
        !route.meta?.hidden &&
        // 切片 06（WU-FE-11）：管理端 adminOnly 路由非管理员隐藏（浏览隐藏）
        !(route.meta?.adminOnly && !isAdmin.value)
    )
    .map(route => {
      const fullPath = resolveMenuPath(route.path, parentPath);
      const hasChildren = route.children && route.children.length > 0;
      const children = hasChildren ? transformRoutesToItems(route.children!, fullPath) : undefined;

      // 如果节点有子项配置但在当前权限/状态下子项全部被过滤（如非 admin），则不显示该节点
      if (hasChildren && (!children || children.length === 0)) {
        return null;
      }

      const key = (route.name as string) || fullPath || route.path;

      // 支持 MenuItemGroup 业务分组小标题
      if (route.meta?.isGroup) {
        return {
          type: 'group',
          key,
          label: route.meta?.title as string,
          children: children || [],
        } as ItemType;
      }

      const label =
        hasChildren || !route.path
          ? (route.meta?.title as string)
          : h(RouterLink, { to: fullPath }, () => route.meta?.title as string);

      const icon = route.meta?.icon ? () => h(route.meta!.icon as any) : undefined;

      return {
        key,
        label,
        title: route.meta?.title as string,
        icon,
        children,
      } as ItemType;
    })
    .filter(Boolean) as ItemType[];
};

const menuItems = computed(() => transformRoutesToItems(props.routes));
</script>

<template>
  <a-menu :selected-keys="selectedKeys" :theme="theme" :mode="mode" :items="menuItems" class="recursive-menu" />
</template>

<style scoped lang="less">
.recursive-menu {
  background: transparent;
  border-bottom: none;
  line-height: 64px;

  :deep(.ant-menu-item),
  :deep(.ant-menu-submenu-title) {
    padding: 0 16px;

    &:hover {
      color: v-bind('theme === "dark" ? "#fff" : "var(--ant-primary-color)"');
    }
  }

  :deep(.ant-menu-item-selected) {
    font-weight: 500;
  }
}
</style>
