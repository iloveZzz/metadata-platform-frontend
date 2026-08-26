import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ScoreChip from '../ScoreChip.vue';

describe('ScoreChip 健康分芯片（组件测试 seam：分数芯片 + 独立展示态 + 钻取点击）', () => {
  it('已计算（state=ok）：渲染「分数分」+ 档位徽标', () => {
    const wrapper = mount(ScoreChip, { props: { state: 'ok', score: 75, band: '良' } });
    const text = wrapper.text();
    expect(text).toContain('75');
    expect(text).toContain('分');
    expect(text).toContain('良');
    expect(wrapper.find('.score-chip').classes()).toContain('chip-mid');
  });

  it('已计算高分为优 → 绿色芯片 class chip-ok', () => {
    const wrapper = mount(ScoreChip, { props: { state: 'ok', score: 97, band: '优' } });
    expect(wrapper.find('.score-chip').classes()).toContain('chip-ok');
  });

  it('低分为差 → 红色芯片 class chip-bad', () => {
    const wrapper = mount(ScoreChip, { props: { state: 'ok', score: 60, band: '差' } });
    expect(wrapper.find('.score-chip').classes()).toContain('chip-bad');
  });

  it('过期独立展示态：分数标灰 + 「过期」Tag（与无结果区分，OQ-03）', () => {
    const wrapper = mount(ScoreChip, { props: { state: 'expired', score: 80, band: null, expired: true } });
    const text = wrapper.text();
    expect(text).toContain('80');
    expect(text).toContain('过期');
    expect(wrapper.find('.score-chip').classes()).toContain('chip-expired');
  });

  it('无结果独立展示态：暂无 + 「无结果」Tag（SB-07）', () => {
    const wrapper = mount(ScoreChip, { props: { state: 'noresult', score: null, band: null } });
    const text = wrapper.text();
    expect(text).toContain('暂无');
    expect(text).toContain('无结果');
  });

  it('clickable + 点击 → emit click（分数即钻取入口，DQI-004）', async () => {
    const wrapper = mount(ScoreChip, {
      props: { state: 'ok', score: 60, band: '差', clickable: true },
    });
    await wrapper.find('.score-chip').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('非 clickable → 点击不 emit', async () => {
    const wrapper = mount(ScoreChip, {
      props: { state: 'ok', score: 60, band: '差', clickable: false },
    });
    await wrapper.find('.score-chip').trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('big 大号展示 → 应用 chip-big class', () => {
    const wrapper = mount(ScoreChip, {
      props: { state: 'ok', score: 97, band: '优', big: true },
    });
    expect(wrapper.find('.score-chip').classes()).toContain('chip-big');
  });
});
