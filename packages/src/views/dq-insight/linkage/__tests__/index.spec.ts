import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import LinkagePage from '../index.vue';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

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

/** a-modal 桩：内联渲染插槽 + ok/cancel（避免 teleport） */
const ModalStub = defineComponent({
  name: 'ModalStub',
  props: { open: Boolean, title: String, okText: String, cancelText: String, confirmLoading: Boolean },
  emits: ['update:open', 'ok', 'cancel'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { class: 'modal-stub' }, [
        props.open
          ? h('div', {}, [
              h('div', { class: 'modal-title' }, props.title || ''),
              slots.default?.(),
              h('button', { class: 'modal-ok', onClick: () => emit('ok') }, props.okText || '确定'),
              h('button', { class: 'modal-cancel', onClick: () => emit('cancel') }, props.cancelText || '取消'),
            ])
          : null,
      ]);
  },
});

vi.mock('@/api', () => ({
  GetDqAssetlinkagePending: vi.fn(),
  PostDqAssetlinkageidMap: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: pushMock }),
}));

import { GetDqAssetlinkagePending, PostDqAssetlinkageidMap } from '@/api';

const getPendingMock = vi.mocked(GetDqAssetlinkagePending);
const mapMock = vi.mocked(PostDqAssetlinkageidMap);

const pendingResponse = {
  success: true,
  code: 'DM-A0001',
  data: [
    {
      id: 'p1',
      assetId: 'dq_refund_snapshot_2026',
      batchNo: 'B-20260810-0010',
      sourceTool: 'great-expectations',
      receivedAt: '2026-08-10 09:14',
      rowCount: 1284,
      note: '',
    },
    {
      id: 'p2',
      assetId: 'ods_new_customer_2026',
      batchNo: 'B-20260809-0006',
      sourceTool: 'generic',
      receivedAt: '2026-08-09 20:30',
      rowCount: 324,
      note: '',
    },
  ],
  totalCount: 2,
  pageIndex: 1,
  pageSize: 10,
};

const forbiddenError = { response: { status: 403 } } as any;

describe('LinkagePage 待关联资产（04-WU5 行为测试：pending 队列 + 人工映射 + 409 覆盖确认）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('待关联队列渲染（资产 ID / 批次 / 来源 / 行数 + 人工映射入口）', async () => {
    getPendingMock.mockResolvedValueOnce(pendingResponse as any);
    const wrapper = mount(LinkagePage, { global: { stubs: { 'a-modal': ModalStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const rows = wrapper.findAll('.ytable-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('dq_refund_snapshot_2026');
    expect(wrapper.text()).toContain('人工映射');
    expect(wrapper.text()).toContain('存在未命中资产 ID 的结果批次');
  });

  it('列表 403 → Perm403（域外不展示，DQI-006）', async () => {
    getPendingMock.mockRejectedValueOnce(forbiddenError);
    const wrapper = mount(LinkagePage, { global: { stubs: { 'a-modal': ModalStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('无权限访问');
  });

  it('人工映射主流程：输入资产 ID → 二次确认 → 提交（不可逆操作二次确认）', async () => {
    getPendingMock.mockResolvedValueOnce(pendingResponse as any);
    mapMock.mockResolvedValueOnce({ success: true, data: {} } as any);
    getPendingMock.mockResolvedValueOnce({ ...pendingResponse, data: [pendingResponse.data[1]], totalCount: 1 } as any);
    const wrapper = mount(LinkagePage, { global: { stubs: { 'a-modal': ModalStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const mapBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('人工映射'));
    await mapBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    // 输入目标资产 ID（映射对话框内 a-input）
    const input = wrapper.find('input');
    await input.setValue('dwd_trade_order_di');

    // 映射（二次确认）→ 确认映射
    const okBtns = wrapper.findAll('.modal-ok');
    await okBtns[0].trigger('click'); // 映射（二次确认）打开确认弹窗
    await new Promise(r => setTimeout(r, 0));
    const okBtns2 = wrapper.findAll('.modal-ok');
    await okBtns2[okBtns2.length - 1].trigger('click'); // 确认映射
    await flushPromises();

    expect(mapMock).toHaveBeenCalledWith('p1', { assetId: 'dwd_trade_order_di', confirmOverwrite: false });
    expect(getPendingMock).toHaveBeenCalledTimes(2);
  });

  it('409 已关联 → 覆盖二次确认 → 携带 confirmOverwrite=true 重试', async () => {
    getPendingMock.mockResolvedValueOnce(pendingResponse as any);
    const conflictError = { response: { status: 409 } } as any;
    mapMock.mockRejectedValueOnce(conflictError);
    mapMock.mockResolvedValueOnce({ success: true, data: {} } as any);
    const wrapper = mount(LinkagePage, { global: { stubs: { 'a-modal': ModalStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const mapBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('人工映射'));
    await mapBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    const input = wrapper.find('input');
    await input.setValue('dwd_trade_order_di');

    const okBtns = wrapper.findAll('.modal-ok');
    await okBtns[0].trigger('click');
    await new Promise(r => setTimeout(r, 0));
    const okBtns2 = wrapper.findAll('.modal-ok');
    await okBtns2[okBtns2.length - 1].trigger('click');
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    // 409 → 覆盖确认弹窗出现
    expect(wrapper.text()).toContain('目标批次已关联');

    const okBtns3 = wrapper.findAll('.modal-ok');
    await okBtns3[okBtns3.length - 1].trigger('click'); // 确认覆盖
    await flushPromises();

    expect(mapMock).toHaveBeenCalledTimes(2);
    expect(mapMock).toHaveBeenLastCalledWith('p1', { assetId: 'dwd_trade_order_di', confirmOverwrite: true });
  });

  it('映射 403 → 能力被拒（按钮禁用 + 提示，无权限操作禁用，DQI-007）', async () => {
    getPendingMock.mockResolvedValueOnce(pendingResponse as any);
    mapMock.mockRejectedValueOnce(forbiddenError);
    const wrapper = mount(LinkagePage, { global: { stubs: { 'a-modal': ModalStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const mapBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('人工映射'));
    await mapBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    const input = wrapper.find('input');
    await input.setValue('dwd_trade_order_di');
    const okBtns = wrapper.findAll('.modal-ok');
    await okBtns[0].trigger('click');
    await new Promise(r => setTimeout(r, 0));
    const okBtns2 = wrapper.findAll('.modal-ok');
    await okBtns2[okBtns2.length - 1].trigger('click');
    await flushPromises();

    // 403 被记录 → 按钮禁用 + title 提示（无权限操作禁用，DQI-007）
    const disabledBtn = wrapper.findAll('button').find(b => b.attributes('disabled') !== undefined);
    expect(disabledBtn).toBeTruthy();
    expect(disabledBtn!.attributes('title')).toContain('仅治理专员 / 管理员可人工映射');
  });
});
