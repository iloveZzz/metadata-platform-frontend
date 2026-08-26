import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ChannelStateTag from '../ChannelStateTag.vue';

describe('ChannelStateTag 通道状态徽标（状态矩阵 §2 接入通道 seam）', () => {
  it('enabled → 启用（success）', () => {
    const wrapper = mount(ChannelStateTag, { props: { state: 'enabled' } });
    expect(wrapper.text()).toContain('启用');
  });

  it('disabled → 停用', () => {
    const wrapper = mount(ChannelStateTag, { props: { state: 'disabled' } });
    expect(wrapper.text()).toContain('停用');
  });

  it('pulling → 拉取中（processing 徽标）', () => {
    const wrapper = mount(ChannelStateTag, { props: { state: 'pulling' } });
    expect(wrapper.text()).toContain('拉取中');
  });

  it('pull-failed → 拉取失败（error）', () => {
    const wrapper = mount(ChannelStateTag, { props: { state: 'pull-failed' } });
    expect(wrapper.text()).toContain('拉取失败');
  });

  it('未定义状态 → 占位 —', () => {
    const wrapper = mount(ChannelStateTag);
    expect(wrapper.text()).toContain('—');
  });
});
