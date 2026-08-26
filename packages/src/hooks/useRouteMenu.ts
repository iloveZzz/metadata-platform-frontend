import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useUserRole } from './useUserRole';

/**
 * 路由菜单相关的 hook
 * @param routes 路由配置数组
 * @returns 返回菜单相关的响应式数据
 */
export function useRouteMenu(routes: RouteRecordRaw[]) {
  const route = useRoute();
  const { isAdmin } = useUserRole();

  /**
   * 当前选中的菜单项
   */
  const selectedKeys = computed(() => {
    const routeName = route.name as string;
    if (routeName) {
      return [routeName];
    }
    return [];
  });

  /**
   * 从路由配置中获取菜单项 - 过滤掉重定向路由 + 非管理员 adminOnly 路由（WU-FE-11 门禁）
   */
  const menuRoutes = computed(() => {
    return routes.filter((route: RouteRecordRaw) => {
      // 过滤掉重定向路由和没有名称的路由
      if (!route.name || route.redirect || !route.meta || !route.meta.title) {
        return false;
      }
      // 管理端门禁：adminOnly 路由非管理员隐藏（浏览隐藏；操作禁用由页面 403 兜底）
      if (route.meta.adminOnly && !isAdmin.value) {
        return false;
      }
      return true;
    });
  });

  /**
   * 获取菜单项标题
   * @param route 路由配置
   * @returns 菜单标题
   */
  const getMenuTitle = (route: RouteRecordRaw): string => {
    return (route.meta?.title as string) || (route.name as string) || '';
  };

  return {
    selectedKeys,
    menuRoutes,
    getMenuTitle,
    currentRoute: route,
  };
}
