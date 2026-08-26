/**
 * 系统管理页 - 表格列 / 操作列配置 / 表单 Schema
 * 状态标签色使用 Ant Design 语义 Tag 预设（随 ConfigProvider 主题 Token 换肤），
 * 页面自定义样式仅消费 variables.less 语义 Token，禁止硬编码品牌色。
 */
import type { YTableActionConfig, YTableColumn } from '@yss-ui/components';
import type { RoleItem } from './type';

/** 角色表格列（原型 desc 字段按合同 deviations 不实现，scope 承载范围说明） */
export const ROLE_COLUMNS: YTableColumn[] = [
  { type: 'seq', title: '序号', width: 64, align: 'center' },
  { field: 'name', title: '角色名', minWidth: 160 },
  { field: 'scope', title: '数据域范围', minWidth: 200 },
  { field: 'refs', title: '被引用', width: 100, align: 'center' },
];

/** 审计日志表格列（只读不可变） */
export const AUDIT_LOG_COLUMNS: YTableColumn[] = [
  { type: 'seq', title: '序号', width: 64, align: 'center' },
  { field: 'operator', title: '操作者', width: 140 },
  { field: 'action', title: '动作', minWidth: 160 },
  { field: 'object', title: '对象', minWidth: 200 },
  { field: 'time', title: '时间', width: 180 },
  { field: 'result', title: '结果', width: 90, align: 'center' },
];

export interface RoleActionHandlers {
  onDelete: (row: RoleItem) => void;
}

/** 操作列配置（YTable :action-config，禁止手写 <template #action>） */
export const createRoleActionConfig = (handlers: RoleActionHandlers): YTableActionConfig => ({
  width: 120,
  align: 'left',
  fixed: 'right',
  buttons: [
    {
      key: 'delete',
      text: '删除',
      type: 'text',
      isConfirm: true,
      confirmProps: {
        title: '删除角色不可恢复；被数据域绑定引用的角色将拒绝删除（409），是否继续？',
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
  ],
});

/** 创建角色表单 Schema（YssFormily；数据域 Tag 多选，录入值 data_domain 幂等 upsert） */
export const createRoleFormSchema = (): Record<string, any> => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical', labelWidth: 110, labelAlign: 'right' },
      properties: {
        name: {
          type: 'string',
          title: '角色名',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': { placeholder: '例如：数据工程师' },
        },
        scope: {
          type: 'string',
          title: '范围说明',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
          'x-component-props': { placeholder: '例如：交易/客户/财务域' },
        },
        domains: {
          type: 'array',
          title: '数据域绑定',
          'x-decorator': 'FormItem',
          'x-component': 'Select',
          'x-component-props': {
            mode: 'tags',
            placeholder: '录入数据域名后回车（绑定后删除角色将受 409 保护）',
            allowClear: true,
          },
        },
      },
    },
  },
});

/** 审计结果 -> 中文标签 + AntD 语义 Tag 色 */
export const getAuditResultMeta = (result?: string): { label: string; color: string } => {
  if (result === 'success') return { label: '成功', color: 'success' };
  if (result === 'failed') return { label: '失败', color: 'error' };
  return { label: result || '—', color: 'default' };
};

/** 审计时间展示格式化（后端 LocalDateTime ISO 形式 → 原型样式） */
export const formatAuditTime = (time?: string): string => {
  if (!time) return '—';
  return time.replace('T', ' ').slice(0, 19);
};

/** refs（json-bigint 字符串计数）是否 > 0：字符串比较，禁止 Number 转换 */
export const hasRefs = (refs?: string): boolean => {
  const value = refs?.trim();
  return !!value && value !== '0';
};
