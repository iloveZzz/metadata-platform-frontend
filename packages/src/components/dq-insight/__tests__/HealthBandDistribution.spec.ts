import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HealthBandDistribution from '../HealthBandDistribution.vue';

describe('HealthBandDistribution 健康分分布条（总览区 seam）', () => {
  const distribution = {
    good: 3,
    fair: 2,
    poor: 1,
    expired: 1,
    noResult: 3,
  };

  it('分布条仅渲染数量 > 0 的段，且宽度按 total 计算', () => {
    const wrapper = mount(HealthBandDistribution, { props: { distribution, total: 10 } });
    const segments = wrapper.findAll('.dist-seg');
    expect(segments).toHaveLength(5);
    // 优 3/10 = 30%
    expect(segments[0].attributes('style')).toContain('width: 30%');
  });

  it('数量为 0 的段不渲染（无结果独立态可缺省）', () => {
    const wrapper = mount(HealthBandDistribution, {
      props: { distribution: { good: 4, fair: 0, poor: 0, expired: 0, noResult: 0 }, total: 4 },
    });
    expect(wrapper.findAll('.dist-seg')).toHaveLength(1);
  });

  it('图例完整展示五类口径（含 0 数量段）与数量', () => {
    const wrapper = mount(HealthBandDistribution, { props: { distribution, total: 10 } });
    const legend = wrapper.findAll('.dist-legend-item');
    expect(legend).toHaveLength(5);
    expect(wrapper.text()).toContain('优 3');
    expect(wrapper.text()).toContain('过期（独立态） 1');
    expect(wrapper.text()).toContain('无结果（独立态） 3');
  });

  it('total <= 0（防腐层不可用）→ 不渲染分段，仅空条 + 图例', () => {
    const wrapper = mount(HealthBandDistribution, {
      props: { distribution: { good: 0, fair: 0, poor: 0, expired: 0, noResult: 0 }, total: 0 },
    });
    expect(wrapper.findAll('.dist-seg')).toHaveLength(0);
    expect(wrapper.find('.dist-bar-empty').exists()).toBe(true);
  });
});
