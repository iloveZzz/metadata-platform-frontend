import { ref } from 'vue';
import { isForbiddenError } from '@/views/dq-insight/types';

/**
 * 05-WU3 权限体验 Hook（状态矩阵 §4 决策 DQI-007：浏览无权限隐藏；操作类无权限禁用；调用后 403 兜底）。
 *
 * 冻结契约无 capabilities 端点，前端无法预知角色；采用「操作触发 403 → 记录该能力被拒 → 本次会话禁用该类操作 + tooltip 提示」的
 * 403 兜底模型：首次点击由 mutator 统一 toast（"您没有权限访问该资源"），此后对应按钮禁用并展示原因提示，不再重复请求。
 */
export type DqCapability = 'channel-create' | 'channel-update' | 'channel-retry' | 'linkage-map' | 'audit-query';

const CAPABILITY_HINTS: Record<DqCapability, string> = {
  'channel-create': '仅管理员可新建通道（DQI-005）',
  'channel-update': '仅管理员可启停 / 配置通道（DQI-005）',
  'channel-retry': '仅管理员 / 接入方可重试拉取',
  'linkage-map': '仅治理专员 / 管理员可人工映射（DQI-006）',
  'audit-query': '仅管理员可查看审计日志（DQI-007）',
};

export function usePermission() {
  /** 已被 403 拒绝的能力（本次会话内禁用） */
  const denied = ref<DqCapability[]>([]);

  const can = (cap: DqCapability) => !denied.value.includes(cap);

  /** 记录 403 拒绝（仅当错误确为 403 时），返回是否被拒绝 */
  const recordDenied = (cap: DqCapability, e: unknown): boolean => {
    if (isForbiddenError(e)) {
      if (!denied.value.includes(cap)) {
        denied.value.push(cap);
      }
      return true;
    }
    return false;
  };

  /** 按钮禁用提示（无权限原因） */
  const hintOf = (cap: DqCapability) => CAPABILITY_HINTS[cap];

  return { denied, can, recordDenied, hintOf };
}

export type ReturnPermission = ReturnType<typeof usePermission>;
