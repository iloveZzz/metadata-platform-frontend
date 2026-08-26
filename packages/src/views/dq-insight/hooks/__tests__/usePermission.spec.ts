import { describe, expect, it } from 'vitest';
import { usePermission } from '../usePermission';

describe('usePermission 权限体验 Hook（05-WU3：操作类无权限 403 兜底禁用，DQI-007）', () => {
  it('初始全部可操作', () => {
    const p = usePermission();
    expect(p.can('channel-create')).toBe(true);
    expect(p.can('channel-update')).toBe(true);
    expect(p.can('channel-retry')).toBe(true);
    expect(p.can('linkage-map')).toBe(true);
    expect(p.can('audit-query')).toBe(true);
  });

  it('403 拒绝 → 对应能力被禁用（本次会话）', () => {
    const p = usePermission();
    const denied = p.recordDenied('channel-create', { response: { status: 403 } });
    expect(denied).toBe(true);
    expect(p.can('channel-create')).toBe(false);
    // 其他能力不受影响
    expect(p.can('channel-update')).toBe(true);
  });

  it('非 403 错误不触发禁用', () => {
    const p = usePermission();
    const denied = p.recordDenied('channel-update', new Error('timeout'));
    expect(denied).toBe(false);
    expect(p.can('channel-update')).toBe(true);
  });

  it('重复 403 不重复记录', () => {
    const p = usePermission();
    p.recordDenied('linkage-map', { response: { status: 403 } });
    p.recordDenied('linkage-map', { response: { status: 403 } });
    expect(p.denied.value).toHaveLength(1);
  });

  it('能力提示文案（无权限原因）', () => {
    const p = usePermission();
    expect(p.hintOf('channel-create')).toContain('仅管理员');
    expect(p.hintOf('linkage-map')).toContain('人工映射');
  });
});
