import type { HealthBand, RuleStatus } from '@/api';

/**
 * 健康分档位展示元数据（高保真原型 BAND_META / 档位阈值 OQ-01 已确认：≥90 优 / 75~89 良 / <75 差）。
 * 颜色使用 Ant Design 语义色（colorSuccess / colorWarning / colorError），不硬编码业务色值。
 */
export const BAND_META: Record<HealthBand, { color: 'success' | 'warning' | 'error'; text: string }> = {
  优: { color: 'success', text: '可放心使用' },
  良: { color: 'warning', text: '存在少量问题' },
  差: { color: 'error', text: '不建议直接使用' },
};

/** 档位阈值说明（分数来源区 / 档位徽标 tooltip 复用） */
export const BAND_THRESHOLD_TEXT = '≥90 优 / 75~89 良 / <75 差';

/** 独立展示态文案（状态矩阵 §2 健康分·无结果 / 过期） */
export const STATE_TAG_TEXT: Record<'expired' | 'noresult', string> = {
  expired: '结果已超有效期，系统按有效期自动流转为过期（OQ-03 已确认默认 30 天）',
  noresult: '从未接入或接入失败，独立展示态（SB-07 口径已确认）',
};

/** 规则结果展示（状态矩阵 §2 / 高保真原型 STATUS_TAG） */
export const RULE_STATUS_META: Record<
  RuleStatus,
  { color: 'success' | 'warning' | 'error' | 'volcano'; text: string }
> = {
  passed: { color: 'success', text: '通过' },
  warn: { color: 'warning', text: '通过 · 告警' },
  failed: { color: 'error', text: '失败' },
  error: { color: 'volcano', text: '错误' },
};

/** 分布条分段语义色（对应 design token：colorSuccess/#52c41a、colorWarning/#faad14、colorError/#ff4d4f、过期灰、无结果浅灰） */
export const DIST_SEGMENT_META: Array<{
  key: 'good' | 'fair' | 'poor' | 'expired' | 'noResult';
  label: string;
  cls: 'ok' | 'mid' | 'bad' | 'expired' | 'noresult';
}> = [
  { key: 'good', label: '优', cls: 'ok' },
  { key: 'fair', label: '良', cls: 'mid' },
  { key: 'poor', label: '差', cls: 'bad' },
  { key: 'expired', label: '过期（独立态）', cls: 'expired' },
  { key: 'noResult', label: '无结果（独立态）', cls: 'noresult' },
];

/** 低分阈值（OQ-01 已确认：<75 = 差档 = 低分字段） */
export const LOW_SCORE_THRESHOLD = 75;
