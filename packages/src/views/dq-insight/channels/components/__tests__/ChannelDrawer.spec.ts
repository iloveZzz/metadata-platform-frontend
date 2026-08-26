import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ChannelDrawer from '../ChannelDrawer.vue';

/** YssFormily 桩：暴露 submit/getValues/setValues；change 按钮触发 update:modelValue（dirty） */
/** a-drawer 桩：直接渲染插槽（避免 teleport 影响断言；footer 含「取消」按钮触发 handleClose） */
const DrawerStub = {
  name: 'DrawerStub',
  props: ['open', 'title'],
  emits: ['close'],
  template:
    '<div class="drawer-stub"><div v-if="open" class="drawer-title">{{ title }}</div><slot v-if="open" /><slot v-if="open" name="footer" /></div>',
};

vi.mock('@yss-ui/components', async () => {
  const { defineComponent, h, ref } = await import('vue');

  const FormStub = defineComponent({
    name: 'YssFormilyStub',
    props: { schema: { type: Object, default: null }, initialValues: { type: Object, default: () => ({}) } },
    emits: ['update:modelValue'],
    setup(props, { expose, emit }) {
      const values = ref({ ...(props.initialValues || {}) });
      expose({
        submit: async () => {
          if (!values.value.name) {
            throw new Error('required');
          }
          return values.value;
        },
        getValues: () => values.value,
        setValues: (v: Record<string, unknown>) => {
          values.value = { ...v };
        },
      });
      return () =>
        h('div', { class: 'form-stub' }, [
          h(
            'button',
            {
              class: 'form-change',
              onClick: () => {
                values.value = { ...values.value, name: '测试通道' };
                emit('update:modelValue', { ...values.value });
              },
            },
            'change'
          ),
        ]);
    },
  });

  return {
    YssFormily: FormStub,
    YTable: defineComponent({ name: 'YTableStub', setup: () => () => h('div', { class: 'ytable-stub' }) }),
  };
});

describe('ChannelDrawer 通道配置抽屉（04-WU5：YssFormily schema / dirty-form / 409 重名预检）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountDrawer = (props: Record<string, unknown> = {}) =>
    mount(ChannelDrawer, {
      props: { open: true, mode: 'create', channels: [], ...props },
      // antd Drawer 组件真实 name 为 ADrawer（kebab 别名 a-drawer），两个键都桩掉避免 teleport
      global: { stubs: { ADrawer: DrawerStub, 'a-drawer': DrawerStub } },
    });

  /** antd 两字按钮文本会插空格（"保 存"），匹配时去除空白 */
  const findButton = (wrapper: ReturnType<typeof mountDrawer>, text: string) =>
    wrapper.findAll('button').find(b => b.text().replace(/\s/g, '').includes(text));

  it('clean 表单取消 → emit close（不弹 dirty 确认）', async () => {
    const wrapper = mountDrawer();
    const cancelBtn = findButton(wrapper, '取消');
    await cancelBtn!.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('dirty-close')).toBeUndefined();
  });

  it('dirty 表单取消 → emit dirty-close（离开确认，状态矩阵 §3 dirty-form）', async () => {
    const wrapper = mountDrawer();
    await wrapper.find('.form-change').trigger('click');
    const cancelBtn = findButton(wrapper, '取消');
    await cancelBtn!.trigger('click');
    expect(wrapper.emitted('dirty-close')).toHaveLength(1);
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('新建保存 → emit save { create }（类型 / 周期 / 格式 / 认证 / 域 / 启用）', async () => {
    const wrapper = mountDrawer();
    await wrapper.find('.form-change').trigger('click'); // name = 测试通道
    const saveBtn = findButton(wrapper, '保存');
    await saveBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    const save = wrapper.emitted('save');
    expect(save).toHaveLength(1);
    const payload = (save![0][0] as { create?: Record<string, unknown> }).create;
    expect(payload?.name).toBe('测试通道');
    expect(payload?.type).toBe('scheduled-pull');
    expect(payload?.formatType).toBe('ge');
  });

  it('重名预检：通道名已存在 → 阻止保存（409 幂等拒绝语义）', async () => {
    const wrapper = mountDrawer({
      channels: [{ id: '1', name: '测试通道' }],
    });
    await wrapper.find('.form-change').trigger('click'); // name = 测试通道（与 channels[0] 重名）
    const saveBtn = findButton(wrapper, '保存');
    await saveBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('edit 模式保存 → emit save { update }（不携带 enabled）', async () => {
    const wrapper = mountDrawer({
      mode: 'edit',
      channel: {
        id: '2',
        name: '财务域 GaussDB 拉取',
        type: 'scheduled-pull',
        schedule: '每日 02:00',
        formatType: 'ge',
        state: 'enabled',
      },
    });
    await wrapper.find('.form-change').trigger('click');
    const saveBtn = findButton(wrapper, '保存');
    await saveBtn!.trigger('click');
    await new Promise(r => setTimeout(r, 0));

    const save = wrapper.emitted('save');
    const payload = (save![0][0] as { update?: Record<string, unknown> }).update;
    expect(payload?.name).toBe('测试通道');
    expect('enabled' in (payload ?? {})).toBe(false);
  });
});
