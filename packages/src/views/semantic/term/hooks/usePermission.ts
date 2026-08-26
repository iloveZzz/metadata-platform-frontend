/**
 * 术语管理页 - 权限 Hook（只读 / 编辑）
 * RBAC 复用主平台角色（SL-008），属切片 06 横切 seam_deferred（合同 seam_deferred：
 * 审计查询复用主平台 GET /api/audit-logs 的跨平台聚合未落地）。
 * MVP 以本地角色 seam 注入（localStorage: semantic-layer:mock-role = governor | engineer），
 * 默认数据治理专员（可编辑）；切片 06 接入主平台角色后替换为真实角色来源。
 * 权限语义（状态矩阵 §3）：浏览类隐藏、操作类禁用 + 调用后 403 兜底（mutator 拦截器）。
 */
import { computed, ref } from 'vue';

export type SemanticRole = 'governor' | 'engineer';

const ROLE_STORAGE_KEY = 'semantic-layer:mock-role';

/** 角色 seam：读取当前用户角色（默认 governor；engineer 为只读视角） */
export const getCurrentRole = (): SemanticRole => {
  if (typeof localStorage === 'undefined') return 'governor';
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  return stored === 'engineer' ? 'engineer' : 'governor';
};

/** 仅测试 / 演示用：切换本地角色 seam */
export const setMockRole = (role: SemanticRole) => {
  localStorage.setItem(ROLE_STORAGE_KEY, role);
};

export function usePermission() {
  const role = ref<SemanticRole>(getCurrentRole());
  const isGov = computed(() => role.value === 'governor');
  const isReadonly = computed(() => role.value === 'engineer');

  /** 无权限提示文案（操作类禁用 tooltip / 只读横幅） */
  const noPermissionTip = '无权限：仅治理专员可操作（SL-008），直接调用写接口返回 403 兜底';

  return { role, isGov, isReadonly, noPermissionTip };
}
