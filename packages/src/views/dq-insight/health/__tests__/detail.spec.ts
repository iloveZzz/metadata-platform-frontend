import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import HealthDetailPage from '../detail.vue';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

/** YTable 桩：按列渲染插槽 / 原始值，用于断言字段排序（低分置顶）与列行为（async 工厂内动态构建） */
vi.mock('@yss-ui/components', async () => {
  const { defineComponent, h } = await import('vue');
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
          h(
            'div',
            { class: 'ytable-stub' },
            ((props.data as any[]) ?? []).map((row, i) =>
              h(
                'div',
                { class: 'ytable-row', key: i },
                ((props.columns as any[]) ?? []).map(col => {
                  const slot = slots[col.field as string];
                  const content = slot ? slot({ row }) : String(row[col.field] ?? '');
                  return h('div', { class: 'ytable-cell', key: col.field }, content);
                })
              )
            )
          );
      },
    }),
  };
});

vi.mock('@/api', () => ({
  GetDqHealthassetId: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { assetId: 'a5' } }),
  useRouter: () => ({ push: pushMock }),
}));

import { GetDqHealthassetId } from '@/api';

const getDetailMock = vi.mocked(GetDqHealthassetId);

const detailResponse = (overrides: any = {}) => ({
  success: true,
  code: 'DM-A0001',
  data: {
    assetId: 'a5',
    assetName: 'dwd_customer_phone_di',
    domain: '客户域',
    assetType: 'table',
    state: 'ok',
    score: 71,
    band: '差',
    expired: false,
    lastResultAt: '2026-08-10 08:47',
    validUntil: '2026-09-09',
    passRate: '60%',
    ruleVersion: 'v3',
    sourceTool: 'great-expectations',
    fields: [
      { fieldName: 'order_id', state: 'ok', score: 100, band: '优', ruleCount: 4, lowScore: false, expired: false },
      { fieldName: 'phone_no', state: 'ok', score: 60, band: '差', ruleCount: 4, lowScore: true, expired: false },
      { fieldName: 'phone_status', state: 'ok', score: 88, band: '良', ruleCount: 4, lowScore: false, expired: false },
      {
        fieldName: 'fin_balance',
        state: 'expired',
        score: 80,
        band: null,
        ruleCount: 0,
        lowScore: false,
        expired: true,
      },
    ],
    ...overrides,
  },
});

const forbiddenError = { response: { status: 403 } } as any;
const notFoundError = { response: { status: 404 } } as any;
const genericError = new Error('err.dq.timeout');

describe('HealthDetailPage 资产级与字段级健康分视图（行为测试：无结果空态 / 低分置顶 / 过期态 / 无权限）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常数据：渲染资产名 + 字段表低分置顶（过期置顶 → 低分升序）', async () => {
    getDetailMock.mockResolvedValueOnce(detailResponse() as any);
    const wrapper = mount(HealthDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('dwd_customer_phone_di');
    expect(wrapper.text()).toContain('字段级健康分');
    expect(wrapper.text()).toContain('低分字段标红置顶');

    const rows = wrapper.findAll('.ytable-row');
    expect(rows).toHaveLength(4);
    // 排序：过期 fin_balance 置顶 → 低分 phone_no(60) → phone_status(88) → order_id(100)
    expect(rows[0].text()).toContain('fin_balance');
    expect(rows[1].text()).toContain('phone_no');
    expect(rows[2].text()).toContain('phone_status');
    expect(rows[3].text()).toContain('order_id');
  });

  it('无结果（后端 404）→ 「未接入质量结果」空态 + 前往通道管理 / 查看规则明细（空态）', async () => {
    getDetailMock.mockRejectedValueOnce(notFoundError);
    const wrapper = mount(HealthDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('未接入质量结果');
    expect(wrapper.text()).toContain('前往通道管理');
    expect(wrapper.text()).toContain('查看规则明细（空态）');
  });

  it('过期独立展示态：标灰 + 「结果已过期，请重新接入」提示（OQ-03）', async () => {
    getDetailMock.mockResolvedValueOnce(
      detailResponse({
        state: 'expired',
        expired: true,
        validUntil: '2026-08-19',
      }) as any
    );
    const wrapper = mount(HealthDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('结果已过期，请重新接入');
    expect(wrapper.text()).toContain('已过期');
  });

  it('无权限（403）→ Perm403（域外详情不展示，DQI-007）', async () => {
    getDetailMock.mockRejectedValueOnce(forbiddenError);
    const wrapper = mount(HealthDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('无权限访问');
  });

  it('可重试错误 → 内嵌 Alert + 重试按钮；重试成功恢复', async () => {
    getDetailMock.mockRejectedValueOnce(genericError);
    getDetailMock.mockResolvedValueOnce(detailResponse() as any);
    const wrapper = mount(HealthDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('健康分详情请求失败');

    const retryBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('重试'));
    expect(retryBtn).toBeTruthy();
    if (retryBtn) {
      await retryBtn.trigger('click');
    }
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(getDetailMock).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('dwd_customer_phone_di');
  });
});
