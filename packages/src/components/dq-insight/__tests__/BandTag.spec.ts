import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BandTag from '../BandTag.vue';

describe('BandTag 档位徽标（组件测试 seam：档位徽标）', () => {
  it('档位 = 优 → 渲染绿色语义 Tag「优」', () => {
    const wrapper = mount(BandTag, { props: { band: '优' } });
    const tag = wrapper.find('.ant-tag');
    expect(tag.exists()).toBe(true);
    expect(tag.text()).toBe('优');
    expect(tag.classes()).toContain('ant-tag-success');
  });

  it('档位 = 良 → 渲染 warning 语义 Tag「良」', () => {
    const wrapper = mount(BandTag, { props: { band: '良' } });
    expect(wrapper.find('.ant-tag').text()).toBe('良');
    expect(wrapper.find('.ant-tag').classes()).toContain('ant-tag-warning');
  });

  it('档位 = 差 → 渲染 error 语义 Tag「差」', () => {
    const wrapper = mount(BandTag, { props: { band: '差' } });
    expect(wrapper.find('.ant-tag').text()).toBe('差');
    expect(wrapper.find('.ant-tag').classes()).toContain('ant-tag-error');
  });

  it('档位为 null（无结果 / 过期独立展示态）→ 不渲染任何标签', () => {
    const wrapper = mount(BandTag, { props: { band: null } });
    expect(wrapper.find('.ant-tag').exists()).toBe(false);
    expect(wrapper.text()).toBe('');
  });

  it('未传档位 → 不渲染', () => {
    const wrapper = mount(BandTag);
    expect(wrapper.find('.ant-tag').exists()).toBe(false);
  });
});
