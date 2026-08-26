/**
 * 采集实例模块常量与表格配置
 */
import type { YTableColumn } from '@yss-ui/components';

/** 实例执行状态选项 */
export const INSTANCE_STATUS_OPTIONS = [
  { label: '等待中', value: 'pending', color: 'warning' },
  { label: '运行中', value: 'running', color: 'processing' },
  { label: '成功', value: 'success', color: 'success' },
  { label: '失败', value: 'failed', color: 'error' },
];

export const getInstanceStatusMeta = (status?: string): { label: string; color: string } => {
  const hit = INSTANCE_STATUS_OPTIONS.find(item => item.value === status);
  return hit || { label: status || '未知', color: 'default' };
};

/** 执行方式选项 */
export const EXECUTION_MODE_OPTIONS = [
  { label: '定时调度', value: 'schedule', color: 'blue' },
  { label: '手动触发', value: 'manual', color: 'cyan' },
  { label: '自动重试', value: 'auto_retry', color: 'purple' },
  { label: '空跑', value: 'dry_run', color: 'default' },
];

export const getExecutionModeMeta = (mode?: string): { label: string; color: string } => {
  const hit = EXECUTION_MODE_OPTIONS.find(item => item.value === mode);
  return hit || { label: mode || '—', color: 'default' };
};

/** 数据源类型品牌色彩映射 */
export const DATASOURCE_TYPE_MAP: Record<string, { label: string; color: string }> = {
  MySQL: { label: 'MySQL', color: '#1890ff' },
  Oracle: { label: 'Oracle', color: '#f5222d' },
  ClickHouse: { label: 'ClickHouse', color: '#fa8c16' },
  PostgreSQL: { label: 'PostgreSQL', color: '#2f54eb' },
  'PolarDB-X': { label: 'PolarDB-X', color: '#0050b3' },
  OceanBase: { label: 'OceanBase', color: '#08979c' },
  达梦: { label: '达梦', color: '#52c41a' },
  openGauss: { label: 'openGauss', color: '#eb2f96' },
  'Amazon RDS': { label: 'Amazon RDS', color: '#faad14' },
  TDSQL: { label: 'TDSQL', color: '#13c2c2' },
  Hive: { label: 'Hive', color: '#722ed1' },
  StarRocks: { label: 'StarRocks', color: '#1d39c4' },
  Doris: { label: 'Doris', color: '#d4380d' },
};

export const getDatasourceTypeMeta = (type?: string): { label: string; color: string } => {
  if (!type) return { label: '通用数据源', color: '#8c8c8c' };
  const hit = DATASOURCE_TYPE_MAP[type];
  return hit || { label: type, color: '#1890ff' };
};

/** 毫秒格式化为易读耗时 */
export const formatDuration = (ms?: number): string => {
  if (ms === null || ms === undefined || ms < 0 || isNaN(ms)) return '—';
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours === 0) return `${minutes}m ${seconds}s`;
  return `${hours}h ${remMinutes}m ${seconds}s`;
};

/** 计算并展示实例耗时（优先 durationMs，回退 startTime 与 endTime 差值） */
export const getDisplayDuration = (row: { durationMs?: number; startTime?: string; endTime?: string }): string => {
  if (row.durationMs !== undefined && row.durationMs !== null && !isNaN(row.durationMs)) {
    return formatDuration(row.durationMs);
  }
  if (row.startTime && row.endTime) {
    const start = new Date(row.startTime).getTime();
    const end = new Date(row.endTime).getTime();
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      return formatDuration(end - start);
    }
  }
  return '—';
};

/** 规范化日期时间显示（去除 T 与毫秒） */
export const formatDateTime = (time?: string): string => {
  if (!time) return '—';
  return time.replace('T', ' ').substring(0, 19);
};

/** 表格标准 9 列定义（对齐高保真原型截图与 YTable 规范） */
export const INSTANCE_COLUMNS: YTableColumn[] = [
  { type: 'checkbox', width: 50, fixed: 'left' },
  { field: 'name', title: '实例名称', minWidth: 280 },
  { field: 'datasourceType', title: '数据来源类型', width: 120 },
  { field: 'connectorName', title: '数据来源', minWidth: 240 },
  { field: 'owner', title: '任务负责人', width: 120 },
  { field: 'executionMode', title: '执行方式', width: 130 },
  { field: 'executor', title: '执行人', width: 120 },
  { field: 'status', title: '执行状态', width: 120, align: 'center' },
  { field: 'duration', title: '运行时间', width: 180 },
  { field: 'action', title: '操作', width: 150, fixed: 'right', align: 'center' },
];
