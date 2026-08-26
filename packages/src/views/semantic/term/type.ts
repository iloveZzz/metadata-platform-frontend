/**
 * 术语管理页 - 本地类型
 * 冻结契约：docs/.scratch/semantic-layer/api/semantic-layer.yaml（v0.1.0-frozen + A2-AM-01）
 * 术语状态：draft / certified / deprecated（SL-001）
 */
import type { Term, TermDetail } from '@/api/generated/semantic/model';

/** 术语状态（与冻结契约枚举一致） */
export type TermStatusValue = 'draft' | 'certified' | 'deprecated';

/** 列表查询条件（与 GET /api/semantic/terms 查询参数对齐） */
export interface TermFilter {
  keyword?: string;
  status?: TermStatusValue;
  onlyCertified?: boolean;
}

/** 列表行（Term 基础字段 + 本页展示用派生字段） */
export interface TermRow extends Term {
  /**
   * 有效挂接数（切片 04 交接：挂接数据源为 GET /api/semantic/attachments，本切片不请求，
   * 展示为「—」，接口 409 REFERENCE_CONFLICT 由后端删除语义兜底）
   */
  attachCount?: number;
}

/** 列表页可用状态（供 hook 与组件消费） */
export interface TermListState {
  loading: boolean;
  loadError: boolean;
  rows: TermRow[];
}

/** 详情抽屉状态（TermDetailVO.synonymSet / attachments 为切片 03/04 交接占位） */
export interface TermDetailState {
  visible: boolean;
  loading: boolean;
  detail: TermDetail | null;
}

/** 新建术语表单值（与 TermCreate 契约字段对齐） */
export interface TermCreateValues {
  name: string;
  aliases?: string[];
  definition: string;
  description?: string;
  owner: string;
}

/** 编辑术语表单值（与 TermUpdate 契约字段对齐，version 乐观锁必填） */
export interface TermUpdateValues extends TermCreateValues {
  version: number;
}
