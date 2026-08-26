/**
 * 采集任务页 - 表格列 / 操作列配置 / 枚举映射 / 样式配置 / 表单 Schema
 */
import type { YTableActionConfig, YTableColumn } from '@yss-ui/components';
import type { CollectorItem } from './type';

/** 采集模式（冻结 OpenAPI 枚举） */
export const MODE_OPTIONS = [
  { label: '增量', value: 'incremental' },
  { label: '全量', value: 'full' },
];

/** 覆盖策略（冻结 OpenAPI 枚举） */
export const STRATEGY_OPTIONS = [
  { label: '忽略（仅新增/更新）', value: 'ignore' },
  { label: '覆盖已变更资产', value: 'overwrite' },
  { label: '失败即中止', value: 'abort-on-failure' },
];

/** 任务状态 -> 中文标签 + AntD 语义 Tag 色 */
export const COLLECTOR_STATUS_OPTIONS: { label: string; value: string; color: string }[] = [
  { label: '待执行', value: 'pending', color: 'warning' },
  { label: '运行中', value: 'running', color: 'processing' },
  { label: '成功', value: 'success', color: 'success' },
  { label: '失败', value: 'failed', color: 'error' },
  { label: '已取消', value: 'cancelled', color: 'default' },
];

export const getCollectorStatusMeta = (status?: string): { label: string; color: string } => {
  const hit = COLLECTOR_STATUS_OPTIONS.find(item => item.value === status);
  return hit ? { label: hit.label, color: hit.color } : { label: status || '—', color: 'default' };
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
  if (!type) return { label: '通用数据库', color: '#8c8c8c' };
  const hit = DATASOURCE_TYPE_MAP[type];
  return hit || { label: type, color: '#1890ff' };
};

/** 解析环境徽章（Dev / Prod） */
export const getEnvBadge = (name?: string): string | null => {
  if (!name) return null;
  if (/^dev[ _]/i.test(name)) return 'Dev';
  if (/^prod[ _]/i.test(name)) return 'Prod';
  return null;
};

/** 清洗连接器名称（去除 Dev_/Prod_ 前缀） */
export const getCleanConnectorName = (name?: string): string => {
  if (!name) return '—';
  return name.replace(/^(Dev|Prod)[ _]/i, '');
};

/** 格式化覆盖策略 */
export const formatStrategy = (strategy?: string): string => {
  const hit = STRATEGY_OPTIONS.find(item => item.value === strategy);
  return hit ? hit.label : strategy || '—';
};

/** 表格标准 11 列定义（对齐 UI 原型图） */
export const COLLECTOR_COLUMNS: YTableColumn[] = [
  { field: 'name', title: '任务名称', minWidth: 200 },
  { field: 'datasourceType', title: '数据源类型', width: 120 },
  { field: 'connectorId', title: '数据来源', minWidth: 240 },
  { field: 'owner', title: '负责人', width: 120 },
  { field: 'collectMethod', title: '采集方式', width: 130 },
  { field: 'lastRunAt', title: '最近1次采集', width: 180 },
  { field: 'description', title: '描述', minWidth: 140 },
  { field: 'enabled', title: '生效状态', width: 90, align: 'center' },
  { field: 'status', title: '任务状态', width: 100, align: 'center' },
  { field: 'updatedAt', title: '最近更新时间', width: 150 },
  { field: 'action', title: '操作', width: 190, align: 'center', fixed: 'right' },
];

export interface CollectorActionHandlers {
  onViewDetail: (row: CollectorItem) => void;
  onEdit: (row: CollectorItem) => void;
  onRun: (row: CollectorItem) => void;
  onCancel: (row: CollectorItem) => void;
  onRetry: (row: CollectorItem) => void;
  onDelete: (row: CollectorItem) => void;
}

/** 操作列配置（YTable :action-config） */
export const createCollectorActionConfig = (handlers: CollectorActionHandlers): YTableActionConfig => ({
  width: 220,
  align: 'left',
  fixed: 'right',
  displayLimit: 4,
  moreRenderType: 'moreButton',
  buttons: [
    {
      key: 'view',
      text: '查看详情',
      type: 'link',
      clickFn: ({ row }) => handlers.onViewDetail(row),
    },
    {
      key: 'run',
      text: '手动执行',
      type: 'link',
      disabledFn: ({ row }) => row.status === 'running' || row.enabled === false,
      clickFn: ({ row }) => handlers.onRun(row),
    },
    {
      key: 'edit',
      text: '编辑',
      type: 'text',
      disabledFn: ({ row }) => row.status === 'running',
      clickFn: ({ row }) => handlers.onEdit(row),
    },
    {
      key: 'cancel',
      text: '停止',
      type: 'text',
      hideFn: ({ row }) => row.status !== 'running',
      clickFn: ({ row }) => handlers.onCancel(row),
    },
    {
      key: 'delete',
      text: '删除',
      type: 'text',
      disabledFn: ({ row }) => row.status === 'running',
      clickFn: ({ row }) => handlers.onDelete(row),
    },
    {
      key: 'retry',
      text: '失败重试',
      type: 'text',
      hideFn: ({ row }) => row.status !== 'failed',
      clickFn: ({ row }) => handlers.onRetry(row),
    },
  ],
});

/** 创建/编辑采集任务弹窗表单 Schema */
export const createCollectorFormSchema = (
  connectorOptions: { label: string; value: string }[]
): Record<string, any> => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical', labelWidth: 120, labelAlign: 'right' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 2, minColumns: 1, minWidth: 320, columnGap: 24, rowGap: 16 },
          properties: {
            name: {
              type: 'string',
              title: '任务名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '例如：营销域增量采集' },
            },
            connectorId: {
              type: 'string',
              title: '目标数据源',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: connectorOptions,
              'x-component-props': { placeholder: '请选择已连接的数据源', showSearch: true, optionFilterProp: 'label' },
            },
            schedule: {
              type: 'string',
              title: '调度周期',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: 'cron 或周期描述，例如：0 0 2 * * ? / 每 15 分钟' },
            },
            mode: {
              type: 'string',
              title: '采集模式',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: MODE_OPTIONS,
              'x-component-props': { placeholder: '请选择采集模式' },
            },
            strategy: {
              type: 'string',
              title: '覆盖策略',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: STRATEGY_OPTIONS,
              'x-component-props': { placeholder: '请选择覆盖策略（默认：忽略）' },
            },
            autoClassify: {
              type: 'boolean',
              title: '采集后自动识别敏感分类',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-decorator-props': { gridSpan: 2 },
            },
          },
        },
      },
    },
  },
});
