/**
 * 分级分类页 - 核心 Hook（WU-FE-08）
 * 概览（GetClassifications 组合 VO：识别规则 + 识别结果一次返回）、规则启停（幂等 + 审计）、
 * 候选确认/修正（幂等）、传播（202 异步任务：同版本只跑一次幂等 + 覆盖范围可核验 + 审计）。
 * 错误提示依赖 mutator.ts 拦截器（禁止重复 message.error）。
 * ID 一律字符串透传（json-bigint），不做 Number 转换。
 */
import { computed, onActivated, ref } from 'vue';
import {
  GetClassifications,
  PostClassifications,
  PostClassificationsidConfirm,
  PostClassificationsidPropagate,
  PutClassificationsidStatus,
} from '@/api';
import { customMessage } from '@/utils';
import type {
  ClassificationItem,
  ClassificationOverviewItem,
  ClassRuleItem,
  PropagateTaskItem,
  RuleFormValues,
} from '../type';

export function useGovernance() {
  const loading = ref(false);
  const loadError = ref(false);
  const rules = ref<ClassRuleItem[]>([]);
  const results = ref<ClassificationItem[]>([]);
  /** 传播进行中（全局：行传播按钮禁用防重复触发，状态矩阵「传播中」要求） */
  const propagating = ref(false);
  /** 最近一次传播任务（传播区覆盖范围提示） */
  const propagateTask = ref<PropagateTaskItem | null>(null);
  /** 规则启停请求进行中的行 id（该行 Switch 禁用防重复提交，Connector testingId 模式） */
  const togglingRuleId = ref('');

  /** 结果行展示标签（资产.字段；组合字段缺失时回退 id） */
  const displayLabel = (row: ClassificationItem): string => {
    const asset = row.assetName || row.assetId || '';
    const column = row.columnName ? `.${row.columnName}` : '';
    return `${asset}${column}`;
  };

  /** 拉取概览（组合 VO：识别规则 + 识别结果；0 候选空结构非错误） */
  const fetchOverview = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetClassifications();
      // 生成类型 ClassificationListResponse 的 data 为无属性 object，经 unknown 桥接为本地类型（切片 02 模式）
      const overview = (res?.data as unknown as ClassificationOverviewItem) ?? {};
      rules.value = overview.rules ?? [];
      results.value = overview.results ?? [];
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 规则启停（幂等 + 审计 classify.rule.status；Switch 乐观更新，失败回滚；行级 in-flight 守卫） */
  const handleToggleRule = async (row: ClassRuleItem, checked: unknown) => {
    if (togglingRuleId.value) return;
    const enabled = checked === true;
    const prev = row.enabled;
    row.enabled = enabled;
    togglingRuleId.value = row.id;
    try {
      await PutClassificationsidStatus(row.id, { enabled });
      customMessage.success(`规则「${row.name}」已${enabled ? '启用' : '停用'}（已审计）`);
    } catch {
      // 拦截器已统一提示；回滚乐观更新
      row.enabled = prev;
    } finally {
      togglingRuleId.value = '';
    }
  };

  /** 新增/修正规则（POST body 经 options.data 透传：冻结 spec 未声明 requestBody，切片 02 先例；审计 classify.rule） */
  const handleCreateRule = async (values: RuleFormValues): Promise<boolean> => {
    try {
      await PostClassifications({
        data: {
          name: values.name,
          type: values.type,
          pattern: values.pattern,
          enabled: values.enabled ?? true,
        },
      });
      customMessage.success(`规则「${values.name}」已创建（已审计）`);
      await fetchOverview();
      return true;
    } catch {
      // 拦截器已统一提示
      return false;
    }
  };

  /** 候选确认（幂等：已确认/已修正重复确认无操作） */
  const handleConfirm = async (row: ClassificationItem) => {
    try {
      await PostClassificationsidConfirm(row.id);
      customMessage.success(`已确认「${displayLabel(row)}」=${row.name}`);
      await fetchOverview();
    } catch {
      // 拦截器已统一提示，此处不重复
    }
  };

  /** 候选修正（correctedName 经 options.data 透传：冻结 spec 未声明 body；流转为已修正） */
  const handleCorrect = async (row: ClassificationItem, correctedName: string): Promise<boolean> => {
    try {
      await PostClassificationsidConfirm(row.id, { data: { correctedName } });
      customMessage.success(`已修正「${displayLabel(row)}」=${correctedName}`);
      await fetchOverview();
      return true;
    } catch {
      // 拦截器已统一提示
      return false;
    }
  };

  /** 触发分类沿血缘传播（202 异步任务：同版本只跑一次幂等 + 覆盖范围可核验 + 审计） */
  const handlePropagate = async (row: ClassificationItem) => {
    if (propagating.value) return;
    propagating.value = true;
    propagateTask.value = null;
    try {
      const res = await PostClassificationsidPropagate(row.id);
      const task = (res?.data as unknown as PropagateTaskItem) ?? {};
      propagateTask.value = task;
      const coverage = task.coverage;
      customMessage.success(
        coverage
          ? `分类「${row.name}」已沿血缘传播完成（覆盖范围：${coverage}，可在资产详情核验）`
          : '分类传播任务已创建（202，同版本只跑一次幂等）'
      );
      await fetchOverview();
    } catch {
      // 拦截器已统一提示
    } finally {
      propagating.value = false;
    }
  };

  /** 传播区描述：任务状态 + 覆盖范围（可核验；coverage 为自由文本，原样透出不臆断数值） */
  const propagateDescription = computed(() => {
    const task = propagateTask.value;
    if (!task) return '';
    if (task.status === 'failed') {
      return '传播失败（任务状态承载，不抛异常）；可稍后在识别结果行重新触发传播（同版本失败任务原地复用重试）。';
    }
    if (task.status !== 'success') {
      return `传播任务 ${task.id} 处理中（同版本只跑一次幂等，已审计）。`;
    }
    const coverage = task.coverage;
    return coverage
      ? `传播任务 ${task.id}：分类已沿血缘传播，覆盖范围 ${coverage}（可在资产详情核验）。`
      : `传播任务 ${task.id} 已完成（同版本只跑一次幂等，已审计）。`;
  });

  // keep-alive 激活（首进 + 返回）时刷新；数据变更后由各操作主动 fetchOverview
  onActivated(() => {
    fetchOverview();
  });

  return {
    loading,
    loadError,
    rules,
    results,
    propagating,
    togglingRuleId,
    propagateTask,
    propagateDescription,
    fetchOverview,
    handleToggleRule,
    handleCreateRule,
    handleConfirm,
    handleCorrect,
    handlePropagate,
  };
}
