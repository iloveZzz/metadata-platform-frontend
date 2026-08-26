/**
 * 影响分析页 - 模块私有类型
 * 字段对齐冻结 OpenAPI / 后端 ImpactVO / ImpactGroupVO / ImpactItemVO / ExportTaskVO
 * （生成类型 data 为无属性 object，运行时经 unknown 桥接为本地类型，模式见切片 02）。
 * 运行时 ID 与数字均为 json-bigint 字符串，禁止 Number()/parseInt 转换。
 */
import type { GetAssetsidImpactanalysisSortBy } from '@/api/generated/metadata/schemas';

/** 影响分析命中项（对齐后端 ImpactItemVO：assetId/name/type/domain/classification/risk/depth） */
export interface ImpactItem {
  /** 下游资产 id（json-bigint 字符串） */
  assetId: string;
  /** 资产名称 */
  name?: string;
  /** 资产类型（table/column/view） */
  type?: string;
  /** 数据域 */
  domain?: string;
  /** 分级分类 */
  classification?: string;
  /** 风险等级（low/medium/high，由分类推导） */
  risk?: string;
  /** 影响深度（1=直接下游） */
  depth?: number;
}

/** 影响深度分组（对齐后端 ImpactGroupVO：depth + items） */
export interface ImpactGroupItem {
  /** 影响深度（1=直接下游，2=间接第一跳，以此类推） */
  depth: number;
  /** 该深度命中项（按 sortBy 排序） */
  items: ImpactItem[];
}

/** 影响分析（对齐后端 ImpactVO：groups + sortBy；0 影响空结构非错误） */
export interface ImpactDataItem {
  /** 深度分组（按深度升序） */
  groups: ImpactGroupItem[];
  /** 排序键（depth/domain/risk） */
  sortBy?: string;
}

/** 导出异步任务（对齐后端 ExportTaskVO；202 响应 data） */
export interface ExportTaskItem {
  /** 任务 id */
  id: string;
  /** 影响分析源资产 id */
  assetId: string;
  /** 导出格式（csv/json） */
  format: string;
  /** 状态（pending/running/success/failed） */
  status: string;
  /** 生成文件引用 */
  fileRef?: string;
  /** 触发人 */
  operator?: string;
}

/** 影响分析排序键（冻结 OpenAPI 枚举 depth/domain/risk，默认 depth） */
export type ImpactSortByValue = GetAssetsidImpactanalysisSortBy;
