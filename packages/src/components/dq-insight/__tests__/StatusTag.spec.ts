import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusTag from '../StatusTag.vue';

describe('StatusTag 规则结果标签（规则明细列表 seam）', () => {
  it('passed → 通过（success）', () => {
    const wrapper = mount(StatusTag, { props: { status: 'passed' } });
    expect(wrapper.find('.ant-tag').text()).toBe('通过');
    expect(wrapper.find('.ant-tag').classes()).toContain('ant-tag-success');
  });

  it('warn → 通过 · 告警（warning）', () => {
    const wrapper = mount(StatusTag, { props: { status: 'warn' } });
    expect(wrapper.find('.ant-tag').text()).toBe('通过 · 告警');
    expect(wrapper.find('.ant-tag').classes()).toContain('ant-tag-warning');
  });

  it('failed → 失败（error）', () => {
    const wrapper = mount(StatusTag, { props: { status: 'failed' } });
    expect(wrapper.find('.ant-tag').text()).toBe('失败');
    expect(wrapper.find('.ant-tag').classes()).toContain('ant-tag-error');
  });

  it('error → 错误（volcano）', () => {
    const wrapper = mount(StatusTag, { props: { status: 'error' } });
    expect(wrapper.find('.ant-tag').text()).toBe('错误');
    expect(wrapper.find('.ant-tag').classes()).toContain('ant-tag-volcano');
  });
});
