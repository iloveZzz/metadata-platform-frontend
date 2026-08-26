import type { ConditionGroup, ConditionLeaf, OperatorOption, OptionItem } from '@yss-ui/components';

/** 计算源扫描字段选项 */
export const computeFieldOptions: OptionItem[] = [
  { label: '项目', value: 'PROJECT' },
  { label: '数据板块', value: 'DATA_DOMAIN' },
  { label: '数据表', value: 'TABLE' },
];

/** 计算源操作符选项 */
export const computeAllOperatorOptions: OperatorOption[] = [
  { label: '属于', value: 'IN', kind: 'single' },
  { label: '不属于', value: 'NOT_IN', kind: 'single' },
  { label: '包含', value: 'CONTAINS', kind: 'single' },
  { label: '不包含', value: 'NOT_CONTAINS', kind: 'single' },
  { label: '正则表达式', value: 'REGEX', kind: 'single' },
  { label: '正则大小写兼容', value: 'REGEX_INSENSITIVE', kind: 'single' },
  { label: '全部', value: 'ALL', kind: 'none' },
];

/** 数据源指定表过滤字段选项 */
export const datasourceFieldOptions: OptionItem[] = [
  { label: '表全名', value: 'TABLE_NAME' },
  { label: '表描述', value: 'TABLE_COMMENT' },
  { label: '数据库 (DB)', value: 'DB_NAME' },
  { label: 'Schema', value: 'SCHEMA_NAME' },
  { label: '资产清单标签', value: 'TAG' },
];

/** 数据源指定表过滤操作符选项 */
export const datasourceAllOperatorOptions: OperatorOption[] = [
  { label: '前缀为', value: 'PREFIX', kind: 'single' },
  { label: '后缀为', value: 'SUFFIX', kind: 'single' },
  { label: '包含', value: 'CONTAINS', kind: 'single' },
  { label: '属于', value: 'IN', kind: 'single' },
  { label: '包含任一', value: 'TAG_ANY', kind: 'single' },
  { label: '包含所有', value: 'TAG_ALL', kind: 'single' },
];

export function generateConditionId(prefix = 'rule'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createInitialComputeCondition(): ConditionGroup {
  return {
    id: generateConditionId('compute_root'),
    type: 'GROUP',
    logicalOp: 'AND',
    children: [
      {
        id: generateConditionId('compute_leaf'),
        type: 'LEAF',
        field: 'PROJECT',
        operator: 'IN',
        value: '',
      },
    ],
  };
}

export function createInitialDatasourceFilterCondition(): ConditionGroup {
  return {
    id: generateConditionId('ds_root'),
    type: 'GROUP',
    logicalOp: 'AND',
    children: [
      {
        id: generateConditionId('ds_leaf'),
        type: 'LEAF',
        field: 'TABLE_NAME',
        operator: 'CONTAINS',
        value: '',
      },
    ],
  };
}

/** 计算条件树中的规则总数 */
export function countConditionRules(node: ConditionGroup | ConditionLeaf | any): number {
  if (!node) return 0;
  if (node.type === 'LEAF' || (!node.children && !node.rules && !node.filters)) {
    return 1;
  }
  const children = node.children || node.rules || node.filters;
  if (!Array.isArray(children)) return 0;
  return children.reduce((acc: number, child: any) => acc + countConditionRules(child), 0);
}

/** 将计算源数据规范化为标准 ConditionGroup */
export function normalizeComputeCondition(raw: any): ConditionGroup {
  if (!raw) return createInitialComputeCondition();

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return createInitialComputeCondition();
    }
  }

  if (raw.type === 'GROUP' && Array.isArray(raw.children)) {
    return {
      id: raw.id || generateConditionId('compute_root'),
      type: 'GROUP',
      logicalOp: raw.logicalOp === 'OR' ? 'OR' : 'AND',
      children: raw.children.map((child: any) => {
        if (child.type === 'GROUP' || Array.isArray(child.children)) {
          return normalizeComputeCondition(child);
        }
        return {
          id: child.id || generateConditionId('leaf'),
          type: 'LEAF',
          field: child.field || child.targetType || 'PROJECT',
          operator: child.operator || child.matchType || 'IN',
          value: child.value || '',
        };
      }),
    };
  }

  // 兼容旧版 { logic: 'AND', rules: [{ targetType, matchType, value }] }
  if (Array.isArray(raw.rules)) {
    return {
      id: raw.id || generateConditionId('compute_root'),
      type: 'GROUP',
      logicalOp: raw.logic === 'OR' ? 'OR' : 'AND',
      children: raw.rules.map((item: any) => ({
        id: item.id || generateConditionId('leaf'),
        type: 'LEAF',
        field: item.targetType || item.field || 'PROJECT',
        operator: item.matchType || item.operator || 'IN',
        value: item.value || '',
      })),
    };
  }

  return createInitialComputeCondition();
}

/** 将数据源指定表过滤数据规范化为标准 ConditionGroup */
export function normalizeDatasourceFilterCondition(raw: any): ConditionGroup {
  if (!raw) return createInitialDatasourceFilterCondition();

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return createInitialDatasourceFilterCondition();
    }
  }

  if (raw.type === 'GROUP' && Array.isArray(raw.children)) {
    return {
      id: raw.id || generateConditionId('ds_root'),
      type: 'GROUP',
      logicalOp: raw.logicalOp === 'OR' ? 'OR' : 'AND',
      children: raw.children.map((child: any) => {
        if (child.type === 'GROUP' || Array.isArray(child.children)) {
          return normalizeDatasourceFilterCondition(child);
        }
        return {
          id: child.id || generateConditionId('leaf'),
          type: 'LEAF',
          field: child.field || 'TABLE_NAME',
          operator: child.operator || 'CONTAINS',
          value: child.value || '',
        };
      }),
    };
  }

  // 兼容旧版 { filterLogic: 'AND', filters: [{ field, operator, value }] }
  if (Array.isArray(raw.filters)) {
    return {
      id: raw.id || generateConditionId('ds_root'),
      type: 'GROUP',
      logicalOp: raw.filterLogic === 'OR' ? 'OR' : 'AND',
      children: raw.filters.map((item: any) => ({
        id: item.id || generateConditionId('leaf'),
        type: 'LEAF',
        field: item.field || 'TABLE_NAME',
        operator: item.operator || 'CONTAINS',
        value: item.value || '',
      })),
    };
  }

  return createInitialDatasourceFilterCondition();
}

/** 计算条件组的最大嵌套层级深度 */
export function getConditionDepth(node: any, currentDepth = 1): number {
  if (!node || node.type === 'LEAF') return currentDepth;
  const children = node.children || node.rules || node.filters;
  if (!Array.isArray(children) || children.length === 0) return currentDepth;

  let maxChildDepth = currentDepth;
  for (const child of children) {
    if (child.type === 'GROUP' || Array.isArray(child.children) || Array.isArray(child.rules)) {
      const childDepth = getConditionDepth(child, currentDepth + 1);
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth;
      }
    }
  }
  return maxChildDepth;
}

/**
 * 校验计算源 / 数据源条件组约束：
 * 1. 规则数限制（计算源 <= 5, 数据源指定表 <= 10）
 * 2. 关系层级深度限制 (<= 2层)
 * 3. 板块/项目对象数量限制 (<= 100个)
 * 4. 字段值必填校验
 */
export function validateRecognitionCondition(
  group: ConditionGroup,
  sourceType: 'COMPUTE_ENGINE' | 'DATASOURCE' = 'COMPUTE_ENGINE'
): { valid: boolean; message?: string } {
  if (!group) {
    return { valid: false, message: '请配置规则条件' };
  }

  // 1. 规则总数校验
  const total = countConditionRules(group);
  if (total === 0) {
    return {
      valid: false,
      message: sourceType === 'COMPUTE_ENGINE' ? '请至少配置一条计算源规则' : '请至少配置一条指定表过滤规则',
    };
  }

  const maxRules = sourceType === 'COMPUTE_ENGINE' ? 5 : 10;
  if (total > maxRules) {
    return {
      valid: false,
      message:
        sourceType === 'COMPUTE_ENGINE'
          ? `计算源规则最多配置 ${maxRules} 条（当前已配置 ${total} 条）`
          : `指定表过滤规则最多配置 ${maxRules} 条（当前已配置 ${total} 条）`,
    };
  }

  // 2. 嵌套层级深度校验 (<= 2层)
  const depth = getConditionDepth(group);
  if (depth > 2) {
    return {
      valid: false,
      message: `规则关系最多支持 2 层嵌套（当前深度为 ${depth} 层）`,
    };
  }

  // 3. 叶子节点内容与对象数量上限校验
  let leafErrorMsg: string | null = null;

  function traverseLeaves(node: any) {
    if (leafErrorMsg) return;
    if (!node) return;

    if (node.type === 'LEAF' || (!node.children && !node.rules && !node.filters)) {
      const field = node.field || node.targetType;
      const operator = node.operator || node.matchType;
      const val = node.value;

      if (!field) {
        leafErrorMsg = '存在未选择扫描维度的规则行';
        return;
      }
      if (!operator) {
        leafErrorMsg = '存在未选择操作符的规则行';
        return;
      }

      // 非 'ALL' 操作符要求输入值必填
      if (operator !== 'ALL') {
        if (
          val === undefined ||
          val === null ||
          (typeof val === 'string' && !val.trim()) ||
          (Array.isArray(val) && val.length === 0)
        ) {
          leafErrorMsg = '请填写完整的规则匹配内容';
          return;
        }
      }

      // 板块/项目对象数量 <= 100 校验
      if (
        sourceType === 'COMPUTE_ENGINE' &&
        ['PROJECT', 'DATA_DOMAIN'].includes(field) &&
        ['IN', 'NOT_IN'].includes(operator)
      ) {
        let itemCount = 0;
        if (Array.isArray(val)) {
          itemCount = val.length;
        } else if (typeof val === 'string' && val.trim()) {
          itemCount = val.split(/[,，\n\s]+/).filter(Boolean).length;
        }
        if (itemCount > 100) {
          const fieldLabel = field === 'PROJECT' ? '项目' : '数据板块';
          leafErrorMsg = `${fieldLabel}选择/填写的对象数量不能超过100个（当前输入 ${itemCount} 个）`;
          return;
        }
      }

      // 数据源 db/schema <= 500 校验
      if (sourceType === 'DATASOURCE' && ['DB_NAME', 'SCHEMA_NAME'].includes(field) && operator === 'IN') {
        let dsCount = 0;
        if (Array.isArray(val)) {
          dsCount = val.length;
        } else if (typeof val === 'string' && val.trim()) {
          dsCount = val.split(/[,，\n\s]+/).filter(Boolean).length;
        }
        if (dsCount > 500) {
          leafErrorMsg = '数据库/Schema 选择/填写的对象数量不能超过500个';
          return;
        }
      }
    } else {
      const children = node.children || node.rules || node.filters || [];
      for (const child of children) {
        traverseLeaves(child);
        if (leafErrorMsg) break;
      }
    }
  }

  traverseLeaves(group);

  if (leafErrorMsg) {
    return { valid: false, message: leafErrorMsg };
  }

  return { valid: true };
}

export function useRecognitionCondition() {
  const loadComputeFields = async (q: string): Promise<OptionItem[]> => {
    const s = (q || '').toLowerCase();
    if (!s) return computeFieldOptions;
    return computeFieldOptions.filter(
      item => item.label.toLowerCase().includes(s) || item.value.toLowerCase().includes(s)
    );
  };

  const getComputeOperators = async (): Promise<OperatorOption[]> => {
    return computeAllOperatorOptions;
  };

  const loadDatasourceFields = async (q: string): Promise<OptionItem[]> => {
    const s = (q || '').toLowerCase();
    if (!s) return datasourceFieldOptions;
    return datasourceFieldOptions.filter(
      item => item.label.toLowerCase().includes(s) || item.value.toLowerCase().includes(s)
    );
  };

  const getDatasourceOperators = async (): Promise<OperatorOption[]> => {
    return datasourceAllOperatorOptions;
  };

  return {
    computeFieldOptions,
    computeAllOperatorOptions,
    datasourceFieldOptions,
    datasourceAllOperatorOptions,
    loadComputeFields,
    getComputeOperators,
    loadDatasourceFields,
    getDatasourceOperators,
    createInitialComputeCondition,
    createInitialDatasourceFilterCondition,
    normalizeComputeCondition,
    normalizeDatasourceFilterCondition,
    countConditionRules,
    getConditionDepth,
    validateRecognitionCondition,
  };
}
