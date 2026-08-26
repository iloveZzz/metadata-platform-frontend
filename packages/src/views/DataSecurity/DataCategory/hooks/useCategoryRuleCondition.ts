import type { ConditionGroup, ConditionLeaf, OperatorOption, OptionItem } from '@yss-ui/components';

/** 扫描维度字段定义（6 维扫描维度） */
export const categoryScanFieldOptions: OptionItem[] = [
  { label: '按内容扫描', value: 'CONTENT' },
  { label: '按字段名称扫描', value: 'COLUMN_NAME' },
  { label: '按字段描述扫描', value: 'COLUMN_COMMENT' },
  { label: '按数据类型扫描', value: 'DATA_TYPE' },
  { label: '按表名扫描', value: 'TABLE_NAME' },
  { label: '按表中文名扫描', value: 'TABLE_COMMENT' },
];

/** 预设数据类型选项（用于属于操作符，13 种数据类型） */
export const categoryPresetDataTypes: OptionItem[] = [
  { label: 'tinyint', value: 'tinyint' },
  { label: 'smallint', value: 'smallint' },
  { label: 'mediumint', value: 'mediumint' },
  { label: 'int', value: 'int' },
  { label: 'bigint', value: 'bigint' },
  { label: 'decimal', value: 'decimal' },
  { label: 'bit', value: 'bit' },
  { label: 'date', value: 'date' },
  { label: 'datetime', value: 'datetime' },
  { label: 'timestamp', value: 'timestamp' },
  { label: 'varchar', value: 'varchar' },
  { label: 'text', value: 'text' },
  { label: 'json', value: 'json' },
];

/** 全量支持的操作符列表（供 YConditionBuilder 匹配） */
export const categoryAllOperatorOptions: OperatorOption[] = [
  { label: '正则（大小兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
  { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
  { label: '包含', value: 'CONTAINS', kind: 'single' },
  { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  { label: '属于', value: 'IN_LIST', kind: 'multiple' },
];

/** 各扫描维度的操作符列表 */
export const categoryOperatorsByField: Record<string, OperatorOption[]> = {
  CONTENT: [
    { label: '正则（大小兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
  ],
  COLUMN_NAME: [
    { label: '正则（大小兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
  COLUMN_COMMENT: [
    { label: '正则（大小兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
  DATA_TYPE: [
    { label: '属于', value: 'IN_LIST', kind: 'multiple' },
    { label: '正则（大小兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
  TABLE_NAME: [
    { label: '正则（大小兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
  TABLE_COMMENT: [
    { label: '正则（大小兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
};

export function generateRuleId(prefix = 'rule'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 创建初始 ConditionGroup（包含 1 条默认规则） */
export function createInitialCategoryCondition(): ConditionGroup {
  return {
    id: generateRuleId('root'),
    type: 'GROUP',
    logicalOp: 'AND',
    children: [
      {
        id: generateRuleId('leaf'),
        type: 'LEAF',
        field: 'COLUMN_NAME',
        operator: 'REGEX_CASE_INSENSITIVE',
        value: '',
      },
    ],
  };
}

/** 计算条件树中的总规则条数 */
export function countCategoryRules(node: ConditionGroup | ConditionLeaf | any): number {
  if (!node) return 0;
  if (node.type === 'LEAF' || (!node.children && !node.rules)) {
    return 1;
  }
  const children = node.children || node.rules;
  if (!Array.isArray(children)) return 0;
  return children.reduce((acc: number, child: any) => acc + countCategoryRules(child), 0);
}

/** 规范化/反序列化规则树 */
export function normalizeCategoryRuleGroup(raw: any): ConditionGroup {
  if (!raw) return createInitialCategoryCondition();

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return createInitialCategoryCondition();
    }
  }

  if (!raw) return createInitialCategoryCondition();

  // 如果包含 conditionGroup 包装
  if (raw.conditionGroup) {
    return normalizeCategoryRuleGroup(raw.conditionGroup);
  }

  // 标准 ConditionGroup 格式
  if (raw.type === 'GROUP' && Array.isArray(raw.children)) {
    return {
      id: raw.id || generateRuleId('group'),
      type: 'GROUP',
      logicalOp: raw.logicalOp === 'OR' ? 'OR' : 'AND',
      children: raw.children.map((child: any) => {
        if (child.type === 'GROUP' || Array.isArray(child.children)) {
          return normalizeCategoryRuleGroup(child);
        }
        const fieldKey = child.field || child.scanType || 'COLUMN_NAME';
        const opKey = child.operator || child.matchMode || 'REGEX_CASE_INSENSITIVE';
        return {
          id: child.id || generateRuleId('leaf'),
          type: 'LEAF',
          field: fieldKey,
          operator: opKey,
          value: opKey === 'IN_LIST' ? (Array.isArray(child.value) ? child.value : child.dataTypes || []) : (child.value || ''),
        } as ConditionLeaf;
      }),
    };
  }

  // 兼容 { logic: 'AND', rules: [...] }
  if (Array.isArray(raw.rules)) {
    return {
      id: raw.id || generateRuleId('group'),
      type: 'GROUP',
      logicalOp: raw.logic === 'OR' ? 'OR' : 'AND',
      children: raw.rules.map((item: any) => {
        if (item.rules && Array.isArray(item.rules)) {
          return normalizeCategoryRuleGroup(item);
        }
        const fieldKey = item.scanType || item.field || 'COLUMN_NAME';
        const opKey = item.matchMode || item.operator || 'REGEX_CASE_INSENSITIVE';
        return {
          id: item.id || generateRuleId('leaf'),
          type: 'LEAF',
          field: fieldKey,
          operator: opKey,
          value: opKey === 'IN_LIST' ? (item.dataTypes || item.value || []) : (item.value || ''),
        } as ConditionLeaf;
      }),
    };
  }

  return createInitialCategoryCondition();
}

/** 序列化为存储格式（同时支持 JSON 树） */
export function serializeCategoryRuleGroup(group: ConditionGroup): string {
  return JSON.stringify(group);
}

/** YSS YConditionBuilder 联动 Hook */
export function useCategoryRuleCondition() {
  const loadFields = async (q: string): Promise<OptionItem[]> => {
    const s = (q || '').toLowerCase();
    if (!s) return categoryScanFieldOptions;
    return categoryScanFieldOptions.filter(
      item => item.label.toLowerCase().includes(s) || item.value.toLowerCase().includes(s)
    );
  };

  const getOperators = async (field: unknown): Promise<OperatorOption[]> => {
    const key = String(field || 'COLUMN_NAME');
    return categoryOperatorsByField[key] || categoryOperatorsByField.COLUMN_NAME;
  };

  const loadValues = async (args: {
    q: string;
    field: unknown;
    operator: string | undefined;
    node: ConditionLeaf;
  }): Promise<OptionItem[]> => {
    const s = (args.q || '').toLowerCase();
    const fieldKey = String(args.field || '');

    if (fieldKey === 'DATA_TYPE' && args.operator === 'IN_LIST') {
      if (!s) return categoryPresetDataTypes;
      return categoryPresetDataTypes.filter(
        item => item.label.toLowerCase().includes(s) || item.value.toLowerCase().includes(s)
      );
    }

    return [];
  };

  return {
    loadFields,
    getOperators,
    loadValues,
    categoryAllOperatorOptions,
    categoryScanFieldOptions,
    categoryPresetDataTypes,
    categoryOperatorsByField,
    createInitialCategoryCondition,
    normalizeCategoryRuleGroup,
    serializeCategoryRuleGroup,
    countCategoryRules,
  };
}
