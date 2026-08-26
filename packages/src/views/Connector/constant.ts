/**
 * 数据源管理页 - 表格列 / 操作列配置 / 枚举映射 / 表单 Schema
 * 状态标签色使用 Ant Design 语义 Tag 预设（随 ConfigProvider 主题 Token 换肤），
 * 页面自定义样式仅消费 variables.less 语义 Token，禁止硬编码品牌色。
 */
import type { YTableActionConfig, YTableColumn } from '@yss-ui/components';
import type { ConnectorItem, DatasourceCatalogItem } from './type';

/** 数据源集市目录定义（对齐 datamiddle-ds-client 实际支持插件与连接器能力） */
export const DATASOURCE_CATALOG: DatasourceCatalogItem[] = [
  // 1. 关系型数据库
  {
    id: 'MySQL',
    name: 'MySQL',
    category: 'relational',
    categoryLabel: '关系型数据库',
    logoText: 'My',
    brandColor: '#fa8c16',
    defaultPort: 3306,
    defaultDialect: 'native',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'MySQL 5.6/5.7, 8.0.x, 8.4.x, RDS',
  },
  {
    id: 'Oracle',
    name: 'Oracle',
    category: 'relational',
    categoryLabel: '关系型数据库',
    logoText: 'Ora',
    brandColor: '#f5222d',
    defaultPort: 1521,
    defaultDialect: 'native',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'Oracle 11g, 12c, 18c, 19c, 21c',
  },
  {
    id: 'PostgreSQL',
    name: 'PostgreSQL',
    category: 'relational',
    categoryLabel: '关系型数据库',
    logoText: 'PG',
    brandColor: '#1890ff',
    defaultPort: 5432,
    defaultDialect: 'native',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'PostgreSQL 10.x - 16.x',
  },
  {
    id: 'SQLServer',
    name: 'Microsoft SQL Server',
    category: 'relational',
    categoryLabel: '关系型数据库',
    logoText: 'SQL',
    brandColor: '#f5222d',
    defaultPort: 1433,
    defaultDialect: 'native',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'SQL Server 2012, 2014, 2016, 2019, 2022',
  },
  {
    id: 'DM',
    name: '达梦 (DM)',
    category: 'relational',
    categoryLabel: '关系型数据库',
    logoText: 'DM',
    brandColor: '#2f54eb',
    defaultPort: 5236,
    defaultDialect: 'native',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'DM7, DM8',
  },
  {
    id: 'OceanBase',
    name: 'OceanBase',
    category: 'relational',
    categoryLabel: '关系型数据库',
    logoText: 'OB',
    brandColor: '#00b96b',
    defaultPort: 2881,
    defaultDialect: 'mysql-compatible',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'OceanBase 2.2+, 3.x, 4.x',
  },
  {
    id: 'GaussDB',
    name: 'GaussDB / openGauss',
    category: 'relational',
    categoryLabel: '关系型数据库',
    logoText: 'OG',
    brandColor: '#096dd9',
    defaultPort: 5432,
    defaultDialect: 'gaussdb',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'openGauss 2.0+, 3.0+, 5.0+ LTS',
  },

  // 2. 大数据与湖仓分析型数据库
  {
    id: 'Doris',
    name: 'Apache Doris',
    category: 'olap',
    categoryLabel: '大数据与湖仓分析',
    logoText: 'Do',
    brandColor: '#13c2c2',
    defaultPort: 9030,
    defaultDialect: 'mysql-compatible',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'Doris 1.2.x, 2.0.x, 2.1.x',
  },
  {
    id: 'StarRocks',
    name: 'StarRocks',
    category: 'olap',
    categoryLabel: '大数据与湖仓分析',
    logoText: 'SR',
    brandColor: '#722ed1',
    defaultPort: 9030,
    defaultDialect: 'mysql-compatible',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'StarRocks 2.5+, 3.x',
  },
  {
    id: 'Hive',
    name: 'Apache Hive',
    category: 'olap',
    categoryLabel: '大数据与湖仓分析',
    logoText: 'Hv',
    brandColor: '#faad14',
    defaultPort: 10000,
    defaultDialect: 'native',
    supportedObjects: '表, 字段, 分区',
    supportedVersions: 'Hive 2.x, 3.x',
  },

  // 3. 通用与轻量数据库
  {
    id: 'DuckDB',
    name: 'DuckDB',
    category: 'generic',
    categoryLabel: '通用与轻量数据库',
    logoText: 'Dk',
    brandColor: '#eb2f96',
    defaultPort: 0,
    defaultDialect: 'native',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'DuckDB 0.9+, 1.0+',
  },
  {
    id: 'SQLite',
    name: 'SQLite',
    category: 'generic',
    categoryLabel: '通用与轻量数据库',
    logoText: 'SL',
    brandColor: '#0050b3',
    defaultPort: 0,
    defaultDialect: 'native',
    supportedObjects: '表, 字段',
    supportedVersions: 'SQLite 3.x',
  },
  {
    id: 'JdbcGeneric',
    name: '通用 JDBC 数据源',
    category: 'generic',
    categoryLabel: '通用与轻量数据库',
    logoText: 'JDBC',
    brandColor: '#595959',
    defaultPort: 3306,
    defaultDialect: 'auto',
    supportedObjects: '表, 字段, 视图',
    supportedVersions: 'JDBC 4.0+ 驱动兼容',
  },
];

/** 数据源类型下拉选项（动态生成） */
export const CONNECTOR_TYPE_OPTIONS = DATASOURCE_CATALOG.map(item => ({
  label: item.name,
  value: item.id,
}));

/** SQL 方言（冻结 OpenAPI 枚举） */
export const DIALECT_OPTIONS = [
  { label: '原生', value: 'native' },
  { label: 'MySQL 兼容', value: 'mysql-compatible' },
  { label: 'GaussDB 方言', value: 'gaussdb' },
  { label: '自动', value: 'auto' },
];

/** 连接器状态 -> 中文标签 + AntD 语义 Tag 色 */
export const CONNECTOR_STATUS_OPTIONS: { label: string; value: string; color: string }[] = [
  { label: '草稿', value: 'draft', color: 'default' },
  { label: '已连接', value: 'connected', color: 'success' },
  { label: '失败', value: 'failed', color: 'error' },
  { label: '停用', value: 'disabled', color: 'warning' },
];

export const getConnectorStatusMeta = (status?: string): { label: string; color: string } => {
  const hit = CONNECTOR_STATUS_OPTIONS.find(item => item.value === status);
  return hit ? { label: hit.label, color: hit.color } : { label: status || '—', color: 'default' };
};

/** 表格列定义（列表接口无分页，前端分页，见 hooks/useConnectorList.ts） */
export const CONNECTOR_COLUMNS: YTableColumn[] = [
  { type: 'seq', title: '序号', width: 64, align: 'center' },
  { field: 'name', title: '数据源名称', minWidth: 160 },
  { field: 'type', title: '类型', width: 110, align: 'center' },
  { field: 'host', title: '地址', minWidth: 160 },
  { field: 'port', title: '端口', width: 90, align: 'center' },
  { field: 'dialect', title: '方言', width: 140, align: 'center' },
  { field: 'username', title: '用户名', width: 120 },
  { field: 'status', title: '状态', width: 100, align: 'center' },
];

export interface ConnectorActionHandlers {
  onEdit: (row: ConnectorItem) => void;
  onDelete: (row: ConnectorItem) => void;
  onTest: (row: ConnectorItem) => void;
  /** 行级测试连接进行中判定（用于禁用防重复提交，状态矩阵要求） */
  isTesting?: (row: ConnectorItem) => boolean;
}

/** 操作列配置（YTable :action-config，禁止手写 <template #action>） */
export const createConnectorActionConfig = (handlers: ConnectorActionHandlers): YTableActionConfig => ({
  width: 200,
  align: 'left',
  fixed: 'right',
  displayLimit: 3,
  moreRenderType: 'moreButton',
  buttons: [
    {
      key: 'edit',
      text: '编辑',
      type: 'link',
      clickFn: ({ row }) => handlers.onEdit(row),
    },
    {
      key: 'delete',
      text: '删除',
      type: 'text',
      isConfirm: true,
      confirmProps: {
        title: '删除后不可恢复，其采集任务与已采集元数据将受影响，是否继续？',
        okText: '删除',
        cancelText: '取消',
        needLoading: true,
      },
      clickFn: async ({ row }, _btn, { hideLoading, close }) => {
        try {
          await handlers.onDelete(row);
        } finally {
          hideLoading();
          close();
        }
      },
    },
    {
      key: 'test',
      text: '测试连接',
      type: 'text',
      disabledFn: ({ row }) => handlers.isTesting?.(row) ?? false,
      clickFn: ({ row }) => handlers.onTest(row),
    },
  ],
});

/** 新增/编辑连接器弹窗表单 Schema（YssFormily JSON Schema；密码仅新建必填） */
export const createConnectorFormSchema = (isEdit: boolean): Record<string, any> => ({
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
              title: '数据源名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '例如：营销域 OB 集群' },
            },
            type: {
              type: 'string',
              title: '数据源类型',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: CONNECTOR_TYPE_OPTIONS,
              'x-component-props': { placeholder: '请选择数据源类型' },
            },
            host: {
              type: 'string',
              title: '地址',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: 'host / 内网域名 / oss://bucket' },
            },
            port: {
              type: 'number',
              title: '端口',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'InputNumber',
              'x-component-props': { min: 1, max: 65535, style: { width: '100%' } },
            },
            dialect: {
              type: 'string',
              title: 'SQL 方言',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: DIALECT_OPTIONS,
              'x-component-props': { placeholder: '请选择方言' },
            },
            username: {
              type: 'string',
              title: '用户名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
            password: {
              type: 'string',
              title: '密码',
              required: !isEdit,
              'x-decorator': 'FormItem',
              'x-component': 'Password',
              'x-component-props': { placeholder: isEdit ? '留空表示不修改' : '请输入密码' },
            },
            autoClassify: {
              type: 'boolean',
              title: '采集时自动识别敏感分类',
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

/** 数据源服务 - 业务系统名录（来源系统名录） */
export const DATASOURCE_SYSTEM_CATALOG = [
  { label: '核心交易系统 (Trading-Core)', value: 'core-trading' },
  { label: '客户营销中台 (Marketing-CRM)', value: 'marketing-crm' },
  { label: '风险控制引擎 (Risk-Engine)', value: 'risk-control' },
  { label: '清算结算平台 (Settlement-Hub)', value: 'settlement' },
  { label: '财务与企业资源 (ERP-Finance)', value: 'erp-finance' },
  { label: '资产托管系统 (Custody-System)', value: 'custody' },
  { label: '人力资源系统 (HR-System)', value: 'hr-system' },
  { label: '业务中台 (Middle-Platform)', value: 'middle-platform' },
  { label: '制造执行系统 (MES-System)', value: 'mes-system' },
  { label: '元数据采集系统demo (Meta-Demo)', value: 'meta-demo' },
];

/** 兼容导出来源系统选项 */
export const SOURCE_SYSTEM_OPTIONS = DATASOURCE_SYSTEM_CATALOG;

/** 通过 datamiddle-ds-client 调取的数据源服务实例（模拟与默认数据） */
export const DEFAULT_REMOTE_DATASOURCES = [
  { id: 'ds-mysql-01', name: '核心交易主库 (MySQL-Prod-01)', type: 'MySQL', host: '10.0.1.20:3306' },
  { id: 'ds-mysql-02', name: '营销会员从库 (MySQL-Read-02)', type: 'MySQL', host: '10.0.1.21:3306' },
  { id: 'ds-polardb-01', name: '订单分库集群 (PolarDB-X-Cluster)', type: 'PolarDB-X', host: '10.0.2.10:3306' },
  { id: 'ds-oracle-01', name: 'ERP财务中心库 (Oracle-ERP)', type: 'Oracle', host: '10.0.3.15:1521' },
  { id: 'ds-pg-01', name: '风控特征库 (PG-Risk-01)', type: 'PostgreSQL', host: '10.0.4.12:5432' },
  { id: 'ds-sqlserver-01', name: '报表中心库 (SQLServer-Report)', type: 'SQLServer', host: '10.0.4.88:1433' },
  { id: 'ds-tdsql-01', name: '支付分账库 (TDSQL-Pay)', type: 'TDSQL-MySQL', host: '10.0.5.18:3306' },
  { id: 'ds-oceanbase-01', name: '分布式账务库 (OceanBase-OB4)', type: 'OceanBase', host: '10.0.6.10:2881' },
  { id: 'ds-clickhouse-01', name: '用户行为分析仓 (ClickHouse-DW)', type: 'ClickHouse', host: '10.0.7.25:8123' },
  { id: 'ds-dm-01', name: '信创监管合规库 (DM-Regulatory)', type: 'DM', host: '10.0.8.12:5236' },
  { id: 'ds-opengauss-01', name: '开放高斯主库 (openGauss-OG)', type: 'openGauss', host: '10.0.8.20:5432' },
];

/** 默认可供选择的 Database 列表映射（由数据源 client 提供） */
export const DEFAULT_DATABASE_OPTIONS = [
  { label: 'db_trade_core（核心交易库）', value: 'db_trade_core' },
  { label: 'db_user_center（用户会员中心）', value: 'db_user_center' },
  { label: 'db_order_pay（订单支付结算库）', value: 'db_order_pay' },
  { label: 'db_settlement_ods（清算贴源库）', value: 'db_settlement_ods' },
  { label: 'db_risk_feature（风控特征库）', value: 'db_risk_feature' },
  { label: 'db_asset_catalog（元数据底座）', value: 'db_asset_catalog' },
  { label: 'db_report_dm（监管报送集市）', value: 'db_report_dm' },
];
