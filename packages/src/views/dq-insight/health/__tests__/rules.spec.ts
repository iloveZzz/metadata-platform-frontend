import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import RuleDetailPage from '../rules.vue';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

/** YTable 桩：按列渲染插槽 / 原始值，用于断言规则明细数据接线（async 工厂内动态构建） */
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
  GetDqHealthassetIdDetails: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { assetId: 'a5' } }),
  useRouter: () => ({ push: pushMock }),
}));

import { GetDqHealthassetIdDetails } from '@/api';

const getRulesMock = vi.mocked(GetDqHealthassetIdDetails);

const rulesResponse = (overrides: any = {}) => ({
  success: true,
  code: 'DM-A0001',
  data: {
    assetId: 'a5',
    assetName: 'dwd_customer_phone_di',
    state: 'ok',
    score: 60,
    band: '差',
    expired: false,
    lastResultAt: '2026-08-10 08:47',
    validUntil: '2026-09-09',
    passRate: '60%',
    batchNo: 'B-20260810-0009',
    ruleVersion: 'v3',
    algorithm: {
      formula: '健康分 = Σ(规则权重 × 规则得分)，规则得分：通过=100、通过·告警=80、失败=0',
      weights: [
        { ruleName: '非空率校验', ruleType: 'non-null-rate', weight: 0.25 },
        { ruleName: '格式校验', ruleType: 'format', weight: 0.25 },
      ],
    },
    rules: [
      {
        fieldName: null,
        ruleName: '非空率校验',
        ruleType: 'non-null-rate',
        status: 'passed',
        failureReason: null,
        weight: 0.25,
        toolTime: '2026-08-10 08:47',
      },
      {
        fieldName: null,
        ruleName: '格式校验',
        ruleType: 'format',
        status: 'failed',
        failureReason: '1,284 行 phone_no 不匹配 ^1[3-9]\\d{9}$',
        weight: 0.25,
        toolTime: '2026-08-10 08:47',
      },
    ],
    ...overrides,
  },
});

const notFoundError = { response: { status: 404 } } as any;
const forbiddenError = { response: { status: 403 } } as any;

describe('RuleDetailPage 规则明细钻取（行为测试：分数来源区 / 规则明细 / 空态 / 过期标识 / 无权限）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常数据：分数来源区（算法说明 + 权重）+ 规则明细列表', async () => {
    getRulesMock.mockResolvedValueOnce(rulesResponse() as any);
    const wrapper = mount(RuleDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('规则明细 · a5');
    expect(wrapper.text()).toContain('分数来源区（透明可解释）');
    expect(wrapper.text()).toContain('健康分 = Σ(规则权重 × 规则得分)');
    expect(wrapper.text()).toContain('非空率校验 25%');
    expect(wrapper.text()).toContain('格式校验 25%');

    const rows = wrapper.findAll('.ytable-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('非空率校验');
    expect(rows[1].text()).toContain('格式校验');
    expect(wrapper.text()).toContain('失败');
    expect(wrapper.text()).toContain('1,284 行 phone_no');
  });

  it('空态（后端 404，无规则结果）→ 「暂无规则结果」+ 前往通道管理（空态，非错误）', async () => {
    getRulesMock.mockRejectedValueOnce(notFoundError);
    const wrapper = mount(RuleDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('暂无规则结果');
    expect(wrapper.text()).toContain('前往通道管理');
  });

  it('过期标识：历史批次展示 + 标灰提示（OQ-03 / 恢复路径）', async () => {
    getRulesMock.mockResolvedValueOnce(
      rulesResponse({ state: 'expired', expired: true, validUntil: '2026-08-19' }) as any
    );
    const wrapper = mount(RuleDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('结果已过期（历史批次展示）');
    expect(wrapper.text()).toContain('重新推送或通道重试拉取后，恢复为已计算档位');
  });

  it('无权限（403）→ Perm403（域外不展示明细，DQI-007）', async () => {
    getRulesMock.mockRejectedValueOnce(forbiddenError);
    const wrapper = mount(RuleDetailPage);
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('无权限访问');
  });
});
