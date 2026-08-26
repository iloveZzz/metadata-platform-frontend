import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DashboardPage from '../index.vue';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

/** YTable 桩：按列渲染插槽 / 原始值，用于断言页面 → 表格的数据接线与列行为（async 工厂内动态构建） */
vi.mock('@yss-ui/components', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    YTable: defineComponent({
      name: 'YTableStub',
      props: {
        data: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
        pagination: { type: Object, default: null },
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
  GetDqDashboard: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: pushMock }),
}));

import { GetDqDashboard } from '@/api';

const getDqDashboardMock = vi.mocked(GetDqDashboard);

const okResponse = (overrides: any = {}) => ({
  success: true,
  code: 'DM-A0001',
  data: {
    stats: {
      bandDistribution: { good: 3, fair: 2, poor: 1, expired: 1, noResult: 3 },
      ingestedAssetCount: 7,
      lowScoreAssetCount: 1,
      targetAssetCount: 10,
      coverage: 70,
    },
    assets: {
      data: [
        {
          assetId: 'a1',
          assetName: 'dwd_trade_order_di',
          domain: '交易域',
          assetType: 'table',
          state: 'ok',
          score: 100,
          band: '优',
          expired: false,
          hasResult: true,
          lastResultAt: '2026-08-10 09:12',
          validUntil: '2026-09-09',
          passRate: '100%',
        },
        {
          assetId: 'a7',
          assetName: 'ods_customer_iceberg',
          domain: '客户域',
          assetType: 'view',
          state: 'noresult',
          score: null,
          band: null,
          expired: false,
          hasResult: false,
          lastResultAt: null,
          validUntil: null,
          passRate: null,
        },
      ],
      totalCount: 2,
      pageIndex: 1,
      pageSize: 10,
    },
  },
  ...overrides,
});

const forbiddenError = { response: { status: 403 } } as any;
const genericError = new Error('err.dq.dashboard.timeout');

describe('DashboardPage 健康分仪表盘页（行为测试：总览渲染 / 列表 / 空态引导 / 错误重试 / 无权限）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('总览统计与资产列表渲染（stats + YTable 数据接线）', async () => {
    getDqDashboardMock.mockResolvedValueOnce(okResponse() as any);
    const wrapper = mount(DashboardPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    // 总览指标（已接入资产数 / 低分资产数 / 覆盖率）
    expect(wrapper.text()).toContain('已接入资产数');
    expect(wrapper.text()).toContain('低分资产数（档位=差）');
    expect(wrapper.text()).toContain('健康分覆盖率');

    // 分布条与图例（优 3 / 无结果 3）
    expect(wrapper.text()).toContain('优 3');
    expect(wrapper.text()).toContain('无结果（独立态） 3');

    // 资产列表数据接线（含无结果独立展示态行）
    const rows = wrapper.findAll('.ytable-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('dwd_trade_order_di');
    expect(rows[1].text()).toContain('ods_customer_iceberg');

    expect(getDqDashboardMock).toHaveBeenCalledTimes(1);
  });

  it('空态引导：0 条记录且无筛选 → 「未接入质量结果」+ 前往通道管理主操作（空态主操作 = 引导接入）', async () => {
    getDqDashboardMock.mockResolvedValueOnce({
      success: true,
      code: 'DM-A0001',
      data: {
        stats: {
          bandDistribution: { good: 0, fair: 0, poor: 0, expired: 0, noResult: 0 },
          ingestedAssetCount: 0,
          lowScoreAssetCount: 0,
          targetAssetCount: 0,
          coverage: 0,
        },
        assets: { data: [], totalCount: 0, pageIndex: 1, pageSize: 10 },
      },
    } as any);
    const wrapper = mount(DashboardPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('未接入质量结果');
    expect(wrapper.text()).toContain('前往通道管理 · 新建通道');

    const btn = wrapper.findAll('button').find(b => b.text().includes('前往通道管理'));
    expect(btn).toBeTruthy();
    if (btn) {
      await btn.trigger('click');
    }
    expect(pushMock).toHaveBeenCalledWith('/channels');
  });

  it('无权限（403）→ 渲染 Perm403 提示（域外不展示，DQI-007）', async () => {
    getDqDashboardMock.mockRejectedValueOnce(forbiddenError);
    const wrapper = mount(DashboardPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('无权限访问');
    expect(wrapper.text()).toContain('无法查看质量结果');
  });

  it('可重试错误 → 内嵌 Alert + 重试按钮；重试成功恢复展示（不清空筛选条件）', async () => {
    getDqDashboardMock.mockRejectedValueOnce(genericError);
    getDqDashboardMock.mockResolvedValueOnce(okResponse() as any);
    const wrapper = mount(DashboardPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('列表请求失败');

    // ant-design-vue 会在两个中文字符的按钮文本间插空格（"重 试"），匹配时去除空白
    const retryBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('重试'));
    expect(retryBtn).toBeTruthy();
    if (retryBtn) {
      await retryBtn.trigger('click');
    }
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(getDqDashboardMock).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('dwd_trade_order_di');
  });

  it('点击资产名称 → 跳转资产级与字段级健康分视图（主流程闭环 DQI-003）', async () => {
    getDqDashboardMock.mockResolvedValueOnce(okResponse() as any);
    const wrapper = mount(DashboardPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const link = wrapper.findAll('a').find(a => a.text() === 'dwd_trade_order_di');
    expect(link).toBeTruthy();
    if (link) {
      await link.trigger('click');
    }
    expect(pushMock).toHaveBeenCalledWith('/health/a1');
  });
});
