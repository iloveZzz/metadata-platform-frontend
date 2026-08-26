import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StateTag from '../StateTag.vue';

describe('StateTag 独立展示态（组件测试 seam：expired / noresult 独立展示态）', () => {
  it('state = expired → 渲染「过期」Tag', () => {
    const wrapper = mount(StateTag, { props: { state: 'expired' } });
    expect(wrapper.find('.ant-tag').text()).toBe('过期');
  });

  it('state = noresult → 渲染「无结果」Tag', () => {
    const wrapper = mount(StateTag, { props: { state: 'noresult' } });
    expect(wrapper.find('.ant-tag').text()).toBe('无结果');
  });
});
