import { describe, expect, it, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import ChannelsPage from '../index.vue';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

/** YTable 桩：按列渲染插槽 / 原始值 */
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

/** ChannelDrawer 桩：渲染 保存/取消，emit save（固定 create payload） */
const DrawerStub = defineComponent({
  name: 'ChannelDrawerStub',
  props: { open: Boolean, mode: String, channel: Object, channels: Array },
  emits: ['close', 'dirty-close', 'save'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'drawer-stub' }, [
        props.open
          ? h('div', { class: 'drawer-body' }, [
              h(
                'button',
                {
                  class: 'drawer-save',
                  onClick: () =>
                    emit('save', {
                      create: { name: '新通道', type: 'scheduled-pull', formatType: 'ge', enabled: true },
                    }),
                },
                '保存'
              ),
              h('button', { class: 'drawer-cancel', onClick: () => emit('close') }, '取消'),
            ])
          : null,
      ]);
  },
});

/** a-modal 桩：内联渲染插槽 + ok/cancel 按钮（避免 teleport 影响断言） */
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
  GetDqChannels: vi.fn(),
  GetDqResults: vi.fn(),
  PostDqChannels: vi.fn(),
  PutDqChannelsid: vi.fn(),
  PostDqChannelsidRetry: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: pushMock }),
}));

import { GetDqChannels, GetDqResults, PostDqChannels, PutDqChannelsid, PostDqChannelsidRetry } from '@/api';

const getChannelsMock = vi.mocked(GetDqChannels);
const getResultsMock = vi.mocked(GetDqResults);
const postChannelsMock = vi.mocked(PostDqChannels);
const putChannelsMock = vi.mocked(PutDqChannelsid);
const retryMock = vi.mocked(PostDqChannelsidRetry);

const channelsResponse = (channels: any[]) => ({ success: true, code: 'DM-A0001', data: channels });
const emptyResults = { success: true, code: 'DM-A0001', data: [], totalCount: 0 };

const SAMPLE_CHANNELS = [
  {
    id: '1',
    name: 'GE 结果 API 推送',
    type: 'api-push',
    formatType: 'ge',
    state: 'enabled',
    authConfigured: true,
    lastPullAt: '2026-08-10 09:00',
    lastError: null,
    errorCategory: null,
    domain: '全数据域',
    schedule: null,
  },
  {
    id: '2',
    name: '财务域 GaussDB 拉取',
    type: 'scheduled-pull',
    formatType: 'csv',
    state: 'pull-failed',
    authConfigured: true,
    lastPullAt: '2026-08-10 08:00',
    lastError: '网络超时（GET 30s 无响应）',
    errorCategory: 'network',
    domain: '财务域',
    schedule: '每日 02:00',
  },
];

const forbiddenError = { response: { status: 403 } } as any;

describe('ChannelsPage 通道管理 / 接入记录（04-WU5 行为测试）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('通道列表渲染（状态徽标 / 拉取失败行）', async () => {
    getChannelsMock.mockResolvedValueOnce(channelsResponse(SAMPLE_CHANNELS) as any);
    getResultsMock.mockResolvedValueOnce(emptyResults as any);
    const wrapper = mount(ChannelsPage, { global: { stubs: { 'a-modal': ModalStub, ChannelDrawer: DrawerStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const rows = wrapper.findAll('.ytable-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('GE 结果 API 推送');
    expect(rows[0].text()).toContain('启用');
    expect(rows[1].text()).toContain('拉取失败');
    expect(rows[1].text()).toContain('重试拉取');
    expect(wrapper.text()).toContain('接入通道（2）');
  });

  it('空态：无通道 → 「暂无接入通道」+ 新建通道主操作（空态主操作 = 新建通道）', async () => {
    getChannelsMock.mockResolvedValueOnce(channelsResponse([]) as any);
    getResultsMock.mockResolvedValueOnce(emptyResults as any);
    const wrapper = mount(ChannelsPage, { global: { stubs: { 'a-modal': ModalStub, ChannelDrawer: DrawerStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('暂无接入通道');
    expect(wrapper.text()).toContain('新建通道');
  });

  it('列表 403 → Perm403（域外 / 无权限不展示，DQI-007）', async () => {
    getChannelsMock.mockRejectedValueOnce(forbiddenError);
    getResultsMock.mockResolvedValueOnce(emptyResults as any);
    const wrapper = mount(ChannelsPage, { global: { stubs: { 'a-modal': ModalStub, ChannelDrawer: DrawerStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('无权限访问');
  });

  it('停用二次确认：点击停用 → 确认弹窗 → 停用 → PUT enabled=false（不可逆操作确认）', async () => {
    getChannelsMock.mockResolvedValueOnce(channelsResponse(SAMPLE_CHANNELS) as any);
    getResultsMock.mockResolvedValueOnce(emptyResults as any);
    putChannelsMock.mockResolvedValueOnce({ success: true, data: {} } as any);
    const wrapper = mount(ChannelsPage, { global: { stubs: { 'a-modal': ModalStub, ChannelDrawer: DrawerStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const toggleBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('停用'));
    await toggleBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.text()).toContain('停用通道');

    const confirmBtn = wrapper.findAll('.modal-ok');
    await confirmBtn[0].trigger('click');
    await flushPromises();

    expect(putChannelsMock).toHaveBeenCalledWith('1', { enabled: false });
  });

  it('重试拉取：拉取失败行 → 重试 → POST retry（幂等防重复触发）', async () => {
    getChannelsMock.mockResolvedValueOnce(channelsResponse(SAMPLE_CHANNELS) as any);
    getResultsMock.mockResolvedValueOnce(emptyResults as any);
    retryMock.mockResolvedValueOnce({ success: true, data: {} } as any);
    getChannelsMock.mockResolvedValueOnce(channelsResponse(SAMPLE_CHANNELS) as any);
    const wrapper = mount(ChannelsPage, { global: { stubs: { 'a-modal': ModalStub, ChannelDrawer: DrawerStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const retryBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('重试拉取'));
    await retryBtn!.trigger('click');
    await flushPromises();

    expect(retryMock).toHaveBeenCalledWith('2');
    expect(getChannelsMock).toHaveBeenCalledTimes(2); // 重试成功后刷新列表
  });

  it('新建通道：抽屉保存 → POST 创建 → 成功后刷新列表', async () => {
    getChannelsMock.mockResolvedValueOnce(channelsResponse([]) as any);
    getResultsMock.mockResolvedValueOnce(emptyResults as any);
    postChannelsMock.mockResolvedValueOnce({ success: true, data: {} } as any);
    getChannelsMock.mockResolvedValueOnce(channelsResponse(SAMPLE_CHANNELS) as any);
    const wrapper = mount(ChannelsPage, { global: { stubs: { 'a-modal': ModalStub, ChannelDrawer: DrawerStub } } });
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    const createBtn = wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes('新建通道'));
    await createBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.find('.drawer-stub').exists()).toBe(true);

    const saveBtn = wrapper.find('.drawer-save');
    await saveBtn.trigger('click');
    await flushPromises();
    await new Promise(r => setTimeout(r, 0));

    expect(postChannelsMock).toHaveBeenCalledWith(expect.objectContaining({ name: '新通道', type: 'scheduled-pull' }));
    expect(getChannelsMock).toHaveBeenCalledTimes(2);
  });
});
