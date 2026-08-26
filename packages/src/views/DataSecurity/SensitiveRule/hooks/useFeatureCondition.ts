import type { ConditionGroup, ConditionLeaf, OperatorOption, OptionItem } from '@yss-ui/components';

/** 扫描维度字段定义 */
export const scanFieldOptions: OptionItem[] = [
  { label: '按内容扫描', value: 'CONTENT' },
  { label: '按字段名称扫描', value: 'COLUMN_NAME' },
  { label: '按字段描述扫描', value: 'COLUMN_COMMENT' },
  { label: '按数据类型扫描', value: 'DATA_TYPE' },
];

/** 预设数据类型选项（用于属于操作符） */
export const presetDataTypes: OptionItem[] = [
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
  { label: 'string', value: 'string' },
];

/** 全量支持的操作符列表（供 YConditionBuilder 初始化匹配） */
export const allOperatorOptions: OperatorOption[] = [
  { label: '正则（大小写兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
  { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
  { label: '包含', value: 'CONTAINS', kind: 'single' },
  { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  { label: '属于', value: 'IN_LIST', kind: 'multiple' },
];

/** 各扫描维度的操作符列表 */
export const operatorsByScanType: Record<string, OperatorOption[]> = {
  CONTENT: [
    { label: '正则（大小写兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
  ],
  COLUMN_NAME: [
    { label: '正则（大小写兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
  COLUMN_COMMENT: [
    { label: '正则（大小写兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
  DATA_TYPE: [
    { label: '属于', value: 'IN_LIST', kind: 'multiple' },
    { label: '正则（大小写兼容）', value: 'REGEX_CASE_INSENSITIVE', kind: 'single' },
    { label: '正则表达式', value: 'REGEX_EXACT', kind: 'single' },
    { label: '包含', value: 'CONTAINS', kind: 'single' },
    { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  ],
};

/** 生成唯一 ID */
export function generateConditionId(prefix = 'rule'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 创建初始 ConditionGroup */
export function createInitialCondition(): ConditionGroup {
  return {
    id: generateConditionId('root'),
    type: 'GROUP',
    logicalOp: 'AND',
    children: [
      {
        id: generateConditionId('leaf'),
        type: 'LEAF',
        field: 'CONTENT',
        operator: 'REGEX_CASE_INSENSITIVE',
        value: '',
      },
    ],
  };
}

/** 计算条件树中的规则总数 */
export function countConditionRules(node: ConditionGroup | ConditionLeaf | any): number {
  if (!node) return 0;
  if (node.type === 'LEAF' || (!node.children && !node.rules)) {
    return 1;
  }
  const children = node.children || node.rules;
  if (!Array.isArray(children)) return 0;
  return children.reduce((acc: number, child: any) => acc + countConditionRules(child), 0);
}

/** 将旧版或任意结构规范化为标准 YConditionBuilder 的 ConditionGroup */
export function normalizeConditionGroup(raw: any): ConditionGroup {
  if (!raw) return createInitialCondition();

  // 如果传入的是字符串，尝试 JSON 解析
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return createInitialCondition();
    }
  }

  if (!raw) return createInitialCondition();

  // 如果已经是标准 ConditionGroup
  if (raw.type === 'GROUP' && Array.isArray(raw.children)) {
    return {
      id: raw.id || generateConditionId('group'),
      type: 'GROUP',
      logicalOp: raw.logicalOp === 'OR' ? 'OR' : 'AND',
      children: raw.children.map((child: any) => {
        if (child.type === 'GROUP' || Array.isArray(child.children)) {
          return normalizeConditionGroup(child);
        }
        return {
          id: child.id || generateConditionId('leaf'),
          type: 'LEAF',
          field: child.field || child.scanType || 'CONTENT',
          operator: child.operator || child.matchMode || 'REGEX_CASE_INSENSITIVE',
          value: child.value ?? (child.dataTypes || ''),
        };
      }),
    };
  }

  // 兼容旧版 { logic: 'AND', rules: [...] }
  if (Array.isArray(raw.rules)) {
    return {
      id: raw.id || generateConditionId('group'),
      type: 'GROUP',
      logicalOp: raw.logic === 'OR' ? 'OR' : 'AND',
      children: raw.rules.map((item: any) => {
        if (item.rules && Array.isArray(item.rules)) {
          return normalizeConditionGroup(item);
        }
        return {
          id: item.id || generateConditionId('leaf'),
          type: 'LEAF',
          field: item.scanType || item.field || 'CONTENT',
          operator: item.matchMode || item.operator || 'REGEX_CASE_INSENSITIVE',
          value: item.matchMode === 'IN_LIST' ? item.dataTypes || item.value || [] : item.value || '',
        };
      }),
    };
  }

  return createInitialCondition();
}

/** YConditionBuilder 数据联动 Hook */
export function useFeatureCondition() {
  const loadFields = async (q: string): Promise<OptionItem[]> => {
    const s = (q || '').toLowerCase();
    if (!s) return scanFieldOptions;
    return scanFieldOptions.filter(
      item => item.label.toLowerCase().includes(s) || item.value.toLowerCase().includes(s)
    );
  };

  const getOperators = async (field: unknown): Promise<OperatorOption[]> => {
    const key = String(field || 'CONTENT');
    return operatorsByScanType[key] || operatorsByScanType.CONTENT;
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
      if (!s) return presetDataTypes;
      return presetDataTypes.filter(
        item => item.label.toLowerCase().includes(s) || item.value.toLowerCase().includes(s)
      );
    }

    return [];
  };

  return {
    loadFields,
    getOperators,
    loadValues,
    allOperatorOptions,
    createInitialCondition,
    normalizeConditionGroup,
    countConditionRules,
  };
}
