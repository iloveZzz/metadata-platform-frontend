import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AuditLogsPage from '../index.vue';

vi.mock('@yss-ui/components', async () => {
  const { defineComponent, h: hh } = await import('vue');
  return {
    YTable: defineComponent({
      name: 'YTableStub',
      props: {
        data: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
        loading: { type: Boolean, default: false },
      },
      emits: ['page-change', 'size-change'],
      setup(props, { slots }) {
        return () =>
          hh(
            'div',
            { class: 'ytable-stub' },
            ((props.data as any[]) ?? []).map((row, i) =>
              hh(
                'div',
                { class: 'ytable-row', key: i },
                ((props.columns as any[]) ?? []).map(col => {
                  const slot = slots[col.field as string];
                  const content = slot ? slot({ row }) : String(row[col.field] ?? '');
                  return hh('div', { class: 'ytable-cell', key: col.field }, content);
                })
              )
            )
          );
      },
    }),
  };
});

vi.mock('@/api', () => ({
  GetDqAuditlogs: vi.fn(),
}));

import { GetDqAuditlogs } from '@/api';

const getAuditMock = vi.mocked(GetDqAuditlogs);

const auditResponse = {
  success: true,
  code: 'DM-A0001',
  data: [
    {
      id: 'log1',
      time: '2026-08-10 09:22',
      operator: '系统',
      action: 'channel-retry',
      object: '财务域 GaussDB 拉取',
      result: 'success',
      detail: '重试成功',
    },
    {
      id: 'log2',
      time: '2026-08-10 09:20',
      operator: '平台管理员',
      action: 'channel-toggle',
      object: '通用 API 网关通道',
      result: 'success',
      detail: '停用',
    },
  ],
  totalCount: 2,
  pageIndex: 1,
  pageSize: 10,
};

const forbiddenError = { response: { status: 403 } } as any;

describe('AuditLogsPage 审计日志（05-WU3 行为测试：只读不可变 + admin 403 兑底）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('审计记录渲染（动作文案 / 结果徽标）', async () => {
    getAuditMock.mockResolvedValueOnce(auditResponse as any);
    const wrapper = mount(AuditLogsPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const rows = wrapper.findAll('.ytable-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('2026-08-10 09:22');
    expect(rows[0].text()).toContain('通道重试拉取');
    expect(rows[0].text()).toContain('成功');
    expect(wrapper.text()).toContain('接入 / 计算 / 配置变更审计（只读不可变）');
  });

  it('403 → Perm403（仅管理员可查，AUDIT_QUERY，DQI-007）', async () => {
    getAuditMock.mockRejectedValueOnce(forbiddenError);
    const wrapper = mount(AuditLogsPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('无权限访问');
    expect(wrapper.text()).toContain('仅管理员可查看审计日志');
  });

  it('空分页提示（0 条为空分页结果，非错误）', async () => {
    getAuditMock.mockResolvedValueOnce({ ...auditResponse, data: [], totalCount: 0 } as any);
    const wrapper = mount(AuditLogsPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('当前筛选条件下无审计记录');
  });
});
