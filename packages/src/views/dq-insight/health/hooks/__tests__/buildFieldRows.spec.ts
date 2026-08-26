import { describe, expect, it } from 'vitest';
import { buildFieldRows } from '../useHealthDetail';

describe('buildFieldRows 字段排序（低分字段标红置顶 seam）', () => {
  const fields = [
    { fieldName: 'order_id', state: 'ok', score: 100, band: '优', ruleCount: 4, lowScore: false, expired: false },
    { fieldName: 'order_amount', state: 'ok', score: 60, band: '差', ruleCount: 4, lowScore: true, expired: false },
    { fieldName: 'create_time', state: 'ok', score: 90, band: '优', ruleCount: 4, lowScore: false, expired: false },
    { fieldName: 'fin_balance', state: 'expired', score: 80, band: null, ruleCount: 0, lowScore: false, expired: true },
  ] as any;

  it('过期字段置顶 → 其余按健康分升序（低分置顶）', () => {
    const rows = buildFieldRows(fields);
    expect(rows.map(r => r.fieldName)).toEqual(['fin_balance', 'order_amount', 'create_time', 'order_id']);
  });

  it('派生 low 标志（低分字段标红依据，OQ-01 <75 = 差档）', () => {
    const rows = buildFieldRows(fields);
    const amount = rows.find(r => r.fieldName === 'order_amount');
    expect(amount?.low).toBe(true);
    const id = rows.find(r => r.fieldName === 'order_id');
    expect(id?.low).toBe(false);
  });

  it('undefined / 空数组 → 空结果', () => {
    expect(buildFieldRows(undefined)).toEqual([]);
    expect(buildFieldRows([])).toEqual([]);
  });

  it('不修改原数组（纯函数）', () => {
    const original = [...fields];
    buildFieldRows(fields);
    expect(fields).toEqual(original);
  });
});
