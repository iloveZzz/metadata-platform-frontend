/**
 * 系统管理页 - 模块私有类型
 * 生成的 RoleListResponse / AuditPageResponse 的 data 为无属性 object，
 * 此处经 unknown 桥接为本地类型（合同登记的桥接约定）。
 */

/** 角色列表行（GET /api/roles data 项） */
export interface RoleItem {
  id: string;
  name?: string;
  scope?: string;
  /** 被引用数（role_domain 数据域绑定数；json-bigint 字符串，仅透传展示） */
  refs?: string;
}

/** 角色创建表单值（POST /api/roles，经 options.data 透传） */
export interface RoleFormValues {
  name?: string;
  scope?: string;
  /** 数据域绑定（Tag 多选） */
  domains?: string[];
}

/** 审计日志行（GET /api/audit-logs data 项；只读不可变） */
export interface AuditLogItem {
  id: string;
  operator?: string;
  action?: string;
  object?: string;
  result?: string;
  time?: string;
}

/** YssFormily 组件实例按需声明的方法签名（避免业务层依赖组件实现细节） */
export interface YssFormilyExpose {
  submit: () => Promise<unknown>;
  getValues: () => object;
}
