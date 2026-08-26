/**
 * 术语管理页 - 常量与列/操作配置
 * 状态 Tag 使用 Ant Design 语义预设色（随 ConfigProvider 主题换肤），禁止硬编码色值。
 */
import type { YTableActionConfig, YTableColumn } from '@yss-ui/components';
import type { TermRow, TermStatusValue } from './type';

/** 状态筛选选项（原型：草稿 / 已认证 / 已弃用 + 全部） */
export const TERM_STATUS_OPTIONS: { label: string; value: TermStatusValue }[] = [
  { label: '草稿', value: 'draft' },
  { label: '已认证', value: 'certified' },
  { label: '已弃用', value: 'deprecated' },
];

/** 状态 Tag 语义（原型：草稿=默认 / 已认证=成功色★ / 已弃用=默认灰） */
export const getTermStatusMeta = (status?: string): { label: string; color: string } => {
  switch (status) {
    case 'certified':
      return { label: '★ 已认证', color: 'success' };
    case 'deprecated':
      return { label: '已弃用', color: 'default' };
    default:
      return { label: '草稿', color: 'default' };
  }
};

/** 术语列表列（YTable column；custom cell 走命名插槽） */
export const TERM_COLUMNS: YTableColumn[] = [
  { field: 'name', title: '术语名称', minWidth: 160 },
  { field: 'aliases', title: '别名', minWidth: 180 },
  { field: 'status', title: '状态', width: 110, align: 'center' },
  { field: 'owner', title: '负责人', width: 100 },
  { field: 'attachCount', title: '挂接数', width: 90, align: 'center' },
  { field: 'updatedAt', title: '更新时间', width: 170 },
];

/** 术语操作列回调集合 */
export interface TermActionHandlers {
  onView: (row: TermRow) => void;
  onEdit: (row: TermRow) => void;
  onCertify: (row: TermRow) => void;
  onDeprecate: (row: TermRow) => void;
  onDelete: (row: TermRow) => void;
  onAttach: (row: TermRow) => void;
}

/**
 * 删除阻断原因（状态矩阵 §1.1：删除仅对草稿且未被挂接 / 未被同义词组关联开放）
 * - 非草稿 → 409 STATE_CONFLICT
 * - 已被同义词组关联 → 409 REFERENCE_CONFLICT
 * - 被挂接：切片 04 无挂接数据源，后端 409 REFERENCE_CONFLICT 兜底（UI 不预判）
 */
export const getDeleteBlockReason = (row: TermRow): string | null => {
  if (row.status !== 'draft') return '仅草稿可删除；已认证 / 已弃用禁止删除（409，SL-001）';
  if (row.synonymSetId) return '已被同义词组关联，禁止删除（409，SL-001）';
  return null;
};

/**
 * 操作列配置（YTable :action-config）
 * 只读（工程师）视角：操作类全部禁用（disabledFn 由 isGov 驱动，SL-008）；
 * 浏览类内容（列表 / 详情）不隐藏。
 * 认证/删除仅草稿；弃用非已弃用；删除被引用时禁用（Tooltip 由确认弹窗文案承载）。
 */
export const createTermActionConfig = (handlers: TermActionHandlers, isGov: boolean): YTableActionConfig => ({
  width: 300,
  align: 'left',
  fixed: 'right',
  displayLimit: 4,
  moreRenderType: 'moreButton',
  buttons: [
    {
      key: 'edit',
      text: '编辑',
      type: 'link',
      disabledFn: () => !isGov,
      clickFn: ({ row }) => handlers.onEdit(row),
    },
    {
      key: 'certify',
      text: '认证',
      type: 'link',
      hideFn: ({ row }) => (row as TermRow).status !== 'draft',
      disabledFn: () => !isGov,
      clickFn: ({ row }) => handlers.onCertify(row),
    },
    {
      key: 'deprecate',
      text: '弃用',
      type: 'link',
      hideFn: ({ row }) => (row as TermRow).status === 'deprecated',
      disabledFn: () => !isGov,
      clickFn: ({ row }) => handlers.onDeprecate(row),
    },
    {
      key: 'delete',
      text: '删除',
      type: 'text',
      hideFn: ({ row }) => (row as TermRow).status !== 'draft',
      disabledFn: ({ row }) => !isGov || !!getDeleteBlockReason(row as TermRow),
      clickFn: ({ row }) => handlers.onDelete(row),
    },
    {
      key: 'attach',
      text: '挂接资产',
      type: 'link',
      disabledFn: () => !isGov,
      clickFn: ({ row }) => handlers.onAttach(row),
    },
  ],
});

/** 只读提示（状态矩阵 §2 术语管理页 no-permission） */
export const READONLY_BANNER = {
  message: '只读视角：无编辑权限（SL-008）',
  description:
    '当前以「数据工程师」只读视角浏览：编辑 / 认证 / 弃用 / 删除 / 挂接已禁用并提示权限不足；直接调用写接口统一返回 403（能力标识）并记录审计（配合切片 06）。浏览类内容不受影响。',
};

/** 切片交接提示（详情抽屉挂接清单 / 同义词组 / 审计记录） */
export const SLICE_HANDOVER = {
  attachments: '挂接资产清单由切片 03 / 04（挂接展示）交接实现；本切片展示空态并预留展示位。',
  synonymSet: '关联同义词组详情由切片 03（同义词组）交接实现；本切片展示 null / 空态占位。',
  audit: '审计记录查询复用主平台 GET /api/audit-logs（切片 06 RBAC 与审计横切交接，seam_deferred）。',
};
