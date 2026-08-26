import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Perm403 from '../Perm403.vue';

describe('Perm403 无权限态（状态矩阵 §3 无权限 / DQI-007）', () => {
  it('渲染 403 无权限提示', () => {
    const wrapper = mount(Perm403);
    expect(wrapper.text()).toContain('无权限访问');
    expect(wrapper.text()).toContain('域外资产质量结果不展示');
  });

  it('支持自定义说明', () => {
    const wrapper = mount(Perm403, { props: { desc: '您不在任何已授权数据域内' } });
    expect(wrapper.text()).toContain('您不在任何已授权数据域内');
  });
});
