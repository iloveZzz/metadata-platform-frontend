/**
 * 当前用户角色 seam（WU-FE-11）
 * 管理员判定经 localStorage user_role 读取（PoC 缺省 admin；qiankun 主应用接入后由平台提供）。
 * 与后端 RbacContext（X-User-Role 头）对齐：缺省 admin = 兼容既有行为，平台认证接入后收敛。
 */
import { computed } from 'vue';

const USER_ROLE_KEY = 'user_role';
const ROLE_ADMIN = 'admin';

export function useUserRole() {
  /** 是否管理员：localStorage user_role 缺省 admin（PoC 兼容）；user 为普通用户 */
  const isAdmin = computed(() => {
    const role = localStorage.getItem(USER_ROLE_KEY);
    return !role || role === ROLE_ADMIN;
  });

  return { isAdmin };
}
