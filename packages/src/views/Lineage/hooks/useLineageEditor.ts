/**
 * 血缘图谱页 - 人工补录编辑器 Hook（WU-FE-06）
 * 远程搜索资产选项（GET /api/assets，type=table）+ 提交 POST /api/lineage/manual（图版本 token 透传）。
 * CYCLE 409 定制提示（定位冲突边，后端 fieldErrors 携带）+ CONFLICT 409 定制提示（重读图谱拿最新
 * graphVersionToken 后重试）。脏表单跟踪（关闭/离开前提醒，状态矩阵「血缘编辑器-表单已修改」）。
 * ID 一律字符串透传（json-bigint），不做 Number 转换。
 */
import { createForm, onFormValuesChange } from '@formily/core';
import { nextTick, ref } from 'vue';
import { GetAssets, PostLineageManual } from '@/api';
import type { LineageManualRequest } from '@/api/generated/metadata/schemas';
import { customMessage, handleErrorResponse } from '@/utils';
import { LINEAGE_EDITOR_INITIAL_VALUES } from '../constant';
import type { AssetItem } from '../../Asset/type';
import type { CycleConflictItem, LineageEdgeItem, LineageEditorFormValues } from '../type';

export function useLineageEditor({
  centerId,
  getGraphVersionToken,
  getEdges,
  onSuccess,
}: {
  /** 中心资产 id（缺省时不可打开） */
  centerId: () => string | undefined;
  /** 当前图谱版本 token（提交时透传；CONFLICT 后由图谱刷新更新） */
  getGraphVersionToken: () => string | undefined;
  /** 当前图谱边（本地环预检用；后端环检测为权威） */
  getEdges: () => LineageEdgeItem[];
  /** 补录成功 / CONFLICT 刷新后回调（刷新图谱拿最新 token） */
  onSuccess: () => void;
}) {
  const visible = ref(false);
  const submitting = ref(false);
  const dirty = ref(false);
  const cycleError = ref<CycleConflictItem | null>(null);
  const conflictError = ref(false);

  /**
   * Formily 表单实例（外部创建：脏标记 effects + 初始值；YssFormily :form 传入）。
   * 注意：YSS wrapper 对外部 form 不应用 initialValues prop，故初始值在 createForm 声明，
   * 每次打开经 form.reset() 恢复（类型默认人工、置信度默认人工-高）。
   * 脏标记按「与初始值快照比较」判定：form.reset() 与字段挂载期应用初始值属程序性写入，
   * 不产生脏状态（独立审查 F2 修复：避免未编辑关闭误弹「离开确认」）。
   */
  const form = createForm({
    initialValues: { ...LINEAGE_EDITOR_INITIAL_VALUES },
    effects: () => {
      onFormValuesChange(() => {
        const values = form.values as Partial<LineageEditorFormValues>;
        dirty.value = Boolean(
          values.fromAssetId ||
            values.toAssetId ||
            values.remark ||
            (values.type && values.type !== LINEAGE_EDITOR_INITIAL_VALUES.type) ||
            (values.confidence && values.confidence !== LINEAGE_EDITOR_INITIAL_VALUES.confidence)
        );
        // 用户实际修改后清除旧环冲突/图版本冲突提示（状态矩阵「血缘编辑器-环冲突」）
        if (dirty.value) {
          cycleError.value = null;
          conflictError.value = false;
        }
      });
    },
  });

  /** 远程搜索资产（GET /api/assets，type=table，按关键字；空关键字取首页） */
  const searchAssets = async (keyword: string, fieldName: 'fromAssetId' | 'toAssetId') => {
    try {
      const res = await GetAssets({ page: 1, size: 20, type: 'table', keyword: keyword.trim() || undefined });
      const list = (res?.data as unknown as AssetItem[]) ?? [];
      const options = list.map(item => ({ label: item.name || item.id, value: item.id }));
      // Formily 动态 enum：Field.dataSource 驱动 Select 选项（远程搜索标准做法；
      // GeneralField 联合类型不含该属性，此处按 Field 形状收窄）
      form.query(fieldName).take(field => {
        (field as { dataSource: { label: string; value: string }[] }).dataSource = options;
      });
    } catch {
      // 拦截器已统一提示，此处不重复
    }
  };

  /** Formily scope：schema 内 {{ }} 表达式可调用（yss-formily：远程搜索走 scope） */
  const scope = {
    searchUpstream: (keyword: string) => searchAssets(keyword, 'fromAssetId'),
    searchDownstream: (keyword: string) => searchAssets(keyword, 'toAssetId'),
  };

  const open = () => {
    if (!centerId()) return;
    cycleError.value = null;
    conflictError.value = false;
    dirty.value = false;
    // 重置为初始值（类型/置信度默认），清空上次输入
    form.reset();
    visible.value = true;
    // 预载默认选项（空关键字首页表）：等抽屉内容挂载、字段存在后再写入 dataSource（独立审查 F6 修复）
    nextTick(() => {
      searchAssets('', 'fromAssetId');
      searchAssets('', 'toAssetId');
    });
  };

  const close = () => {
    if (submitting.value) return;
    visible.value = false;
  };

  /**
   * 本地环预检：新增边 from→to 若已存在 to→from 路径则成环（BFS；定位冲突边）。
   * 后端环检测（CYCLE 409）为权威兜底，此处仅为即时反馈（状态矩阵「血缘编辑器-环冲突」）。
   */
  const findCyclePath = (from: string, to: string): string[] => {
    if (from === to) return [];
    const adjacency = new Map<string, string[]>();
    for (const edge of getEdges()) {
      const list = adjacency.get(edge.fromAssetId) ?? [];
      list.push(edge.toAssetId);
      adjacency.set(edge.fromAssetId, list);
    }
    const queue: string[] = [to];
    const visited = new Set<string>([to]);
    const parent = new Map<string, string>();
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === from) {
        // 还原路径：from → ... → to（新边 to→from 闭合为环）
        const path: string[] = [from];
        let node = from;
        while (node !== to) {
          node = parent.get(node) as string;
          path.push(node);
        }
        return path;
      }
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          parent.set(next, current);
          queue.push(next);
        }
      }
    }
    return [];
  };

  /** 提交补录（本地预检 → POST；CYCLE/CONFLICT 定制提示，其余交拦截器） */
  const submit = async (values: LineageEditorFormValues) => {
    if (submitting.value) return;
    const { fromAssetId, toAssetId, type, confidence, remark } = values;
    if (!fromAssetId || !toAssetId) return;

    // 自环 / 本地环预检（定位冲突边；后端 CYCLE 仍为权威兜底）
    if (fromAssetId === toAssetId) {
      cycleError.value = {
        fromAssetId,
        toAssetId,
        message: '血缘成环（CYCLE）：源资产与目标资产相同（自环），请调整连线',
      };
      return;
    }
    const cyclePath = findCyclePath(fromAssetId, toAssetId);
    if (cyclePath.length > 0) {
      cycleError.value = {
        fromAssetId,
        toAssetId,
        message: `血缘成环（CYCLE）：边 ${fromAssetId} → ${toAssetId} 将形成环，冲突路径 [${cyclePath.join(' → ')}]，已阻断保存，请调整连线`,
      };
      return;
    }
    cycleError.value = null;

    const payload: LineageManualRequest = {
      fromAssetId,
      toAssetId,
      type,
      confidence,
      remark: remark?.trim() || undefined,
      // 图版本 token：从图谱响应透传（并发防冲突；CONFLICT 恢复路径=重读图谱拿最新 token）
      graphVersionToken: getGraphVersionToken(),
    };

    submitting.value = true;
    try {
      await PostLineageManual(payload, { skipErrorHandler: true });
      customMessage.success('血缘已补录并标记置信度');
      conflictError.value = false;
      dirty.value = false;
      visible.value = false;
      onSuccess();
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      if (status === 409 && code === 'lineage.cycle') {
        // CYCLE：定位冲突边（后端 fieldErrors[0] 携带冲突边描述）
        const fieldMsg = error?.response?.data?.fieldErrors?.[0]?.message;
        cycleError.value = {
          fromAssetId,
          toAssetId,
          message: fieldMsg || error?.response?.data?.message || '血缘成环（CYCLE）：已阻断保存，请调整连线',
        };
        conflictError.value = false;
      } else if (status === 409 && code === 'lineage.conflict') {
        // CONFLICT：图版本已变化（他人在同一图并发补录）；恢复=刷新图谱拿最新 token 后重试
        cycleError.value = null;
        conflictError.value = true;
        customMessage.warning('图版本冲突（CONFLICT）：血缘图谱已被其他用户更新，已刷新最新图谱，请重新提交');
        onSuccess();
      } else {
        await handleErrorResponse(error).catch(() => undefined);
      }
    } finally {
      submitting.value = false;
    }
  };

  return { visible, submitting, dirty, cycleError, conflictError, form, scope, open, close, submit };
}
