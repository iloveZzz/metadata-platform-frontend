/**
 * 数据安全分级与风险等级色彩工具函数
 * 深度统一全局 L1~L5 色彩语义与 Ant Design / YSS Design System 规范
 */

export function getGradeTagColor(gradeOrScore?: string | number): string {
  if (typeof gradeOrScore === 'number') {
    if (gradeOrScore >= 80) return 'red';
    if (gradeOrScore >= 60) return 'orange';
    if (gradeOrScore >= 40) return 'blue';
    return 'green';
  }

  if (!gradeOrScore) return 'default';
  const code = String(gradeOrScore).toUpperCase();

  if (code.includes('L5') || code.includes('绝密') || code.includes('极高')) return 'magenta';
  if (code.includes('L4') || code.includes('机密') || code.includes('高危')) return 'volcano';
  if (code.includes('L3') || code.includes('敏感') || code.includes('中危')) return 'orange';
  if (code.includes('L2') || code.includes('内部') || code.includes('限制')) return 'blue';
  if (code.includes('L1') || code.includes('公开') || code.includes('低危')) return 'green';

  return 'blue';
}

export function getGradeBadgeColor(gradeOrScore?: string | number): string {
  if (typeof gradeOrScore === 'number') {
    if (gradeOrScore >= 80) return '#f5222d';
    if (gradeOrScore >= 60) return '#fa8c16';
    if (gradeOrScore >= 40) return '#1890ff';
    return '#52c41a';
  }

  if (!gradeOrScore) return '#d9d9d9';
  const code = String(gradeOrScore).toUpperCase();

  if (code.includes('L5') || code.includes('绝密')) return '#eb2f96';
  if (code.includes('L4') || code.includes('机密')) return '#fa541c';
  if (code.includes('L3') || code.includes('敏感')) return '#faad14';
  if (code.includes('L2') || code.includes('内部')) return '#1677ff';
  if (code.includes('L1') || code.includes('公开')) return '#52c41a';

  return '#1677ff';
}

export function getRiskColor(riskLevel?: string): string {
  if (!riskLevel) return 'default';
  const level = riskLevel.toUpperCase();
  switch (level) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'volcano';
    case 'MEDIUM':
      return 'orange';
    case 'LOW':
      return 'blue';
    default:
      return 'default';
  }
}
