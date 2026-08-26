/**
 * 分级分类页 - 模块私有类型
 * 字段对齐冻结 OpenAPI / 后端 ClassRuleVO / ClassificationVO / ClassificationOverviewVO / PropagateTaskVO
 * （生成类型 data 为无属性 object，运行时经 unknown 桥接为本地类型，模式见切片 02）。
 * 运行时 ID 为 json-bigint 字符串，禁止 Number()/parseInt 转换。
 */

/** 分类规则行（对齐后端 ClassRuleVO：id/name/type/pattern/enabled） */
export interface ClassRuleItem {
  /** 规则 id（json-bigint 字符串） */
  id: string;
  /** 规则名 */
  name: string;
  /** 规则类型（builtin/regex/column/dictionary） */
  type: string;
  /** 匹配模式（正则表达式 / 列名关键字 / 字典引用） */
  pattern?: string;
  /** 是否启用 */
  enabled: boolean;
}

/** 识别结果行（对齐后端 ClassificationVO：id/assetId/columnId/assetName/columnName/name/level/source/status） */
export interface ClassificationItem {
  /** 分类结果 id */
  id: string;
  /** 所属资产 id */
  assetId: string;
  /** 所属列 id（列级分类时非空） */
  columnId?: string;
  /** 资产名称（组合字段，概览已填充） */
  assetName?: string;
  /** 列名（组合字段，概览已填充） */
  columnName?: string;
  /** 分类名（如 敏感-PII / 内部 / 受限） */
  name: string;
  /** 敏感等级（如 PII / 敏感 / 内部） */
  level?: string;
  /** 来源（auto/manual） */
  source?: string;
  /** 状态（pending/confirmed/corrected） */
  status: string;
}

/** 概览组合 VO（对齐后端 ClassificationOverviewVO：rules + results；0 候选空结构非错误） */
export interface ClassificationOverviewItem {
  /** 识别规则列表 */
  rules: ClassRuleItem[];
  /** 识别结果列表（候选/已确认/已修正） */
  results: ClassificationItem[];
}

/** 传播异步任务（对齐后端 PropagateTaskVO；202 响应 data） */
export interface PropagateTaskItem {
  /** 任务 id */
  id: string;
  /** 触发源分类 id */
  classificationId: string;
  /** 传播版本（同版本只跑一次幂等键） */
  version?: string;
  /** 状态（pending/running/success/failed） */
  status: string;
  /** 覆盖范围（受影响资产数/明细，可核验） */
  coverage?: string;
  /** 触发人 */
  operator?: string;
}

/** 新增/修正规则表单提交值 */
export interface RuleFormValues {
  name: string;
  /** builtin/regex/column/dictionary */
  type: string;
  pattern: string;
  enabled: boolean;
}

/** YssFormily 组件实例按需声明的方法签名（避免业务层依赖组件实现细节） */
export interface YssFormilyExpose {
  submit: () => Promise<unknown>;
  getValues: () => object;
}
