/**
 * 数据源管理页 - 列表 Hook
 * 封装全量列表拉取、前端分页、表格高度、删除（引用冲突 409 定制提示）与连接测试（错误分类）。
 * 错误提示依赖 mutator.ts 拦截器；仅针对需要定制文案的场景使用 skipErrorHandler。
 */
import { computed, onMounted, reactive, ref, type Ref } from 'vue';
import { useTableHeight } from '@yss-ui/hooks';
import { GetConnectors, DeleteConnectorsid, PostConnectorsidTest } from '@/api';
import { customMessage, handleErrorResponse } from '@/utils';
import type { ConnectorItem } from '../type';

/** 连接测试失败分类（network / credential / dialect），按错误 code 优先、message 兜底 */
const formatConnectTestError = (error: any): string => {
  const data = error?.response?.data as { code?: string; message?: string } | undefined;
  const code = data?.code ?? '';
  const message = data?.message ?? '';
  if (code.includes('network') || message.includes('网络')) {
    return '连接测试失败：网络不可达或超时（network）';
  }
  if (code.includes('credential') || message.includes('凭据') || message.includes('认证')) {
    return '连接测试失败：账号或凭据错误（credential）';
  }
  if (code.includes('dialect')) {
    return '连接测试失败：SQL 方言不受支持或解析失败（dialect）';
  }
  return message ? `连接测试失败：${message}` : '连接测试失败，请检查连接配置后重试';
};

export function useConnectorList({ tableAreaRef }: { tableAreaRef: Ref<HTMLElement | undefined> }) {
  const loading = ref(false);
  const loadError = ref(false);
  const dataList = ref<ConnectorItem[]>([]);
  /** 正在测试连接的行 id（按钮禁用防重复提交，状态矩阵要求） */
  const testingId = ref('');
  const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true });
  const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true });

  /** 列表全量拉取（GET /api/connectors 无分页），本地前端分页 */
  const fetchList = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetConnectors();
      const list = (res?.data ?? []) as ConnectorItem[];
      dataList.value = list;
      const maxPage = Math.max(1, Math.ceil(list.length / pagination.pageSize));
      if (pagination.current > maxPage) pagination.current = maxPage;
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 删除连接器；409 connector.in_use -> 定制引用冲突提示，其余错误交由统一错误处理 */
  const handleDelete = async (row: ConnectorItem) => {
    try {
      await DeleteConnectorsid(row.id, { skipErrorHandler: true });
      customMessage.success('连接器已删除');
      await fetchList();
    } catch (error: any) {
      const errCode = (error?.response?.data?.code as string) ?? '';
      if (error?.response?.status === 409 || errCode === 'connector.in_use') {
        customMessage.error('连接器仍被采集任务引用，无法删除');
      } else {
        await handleErrorResponse(error).catch(() => undefined);
      }
    }
  };

  /** 测试连接（POST /{id}/test）：成功 success，失败按 network/credential/dialect 分类提示 */
  const handleTest = async (row: ConnectorItem) => {
    if (testingId.value) return;
    testingId.value = row.id;
    try {
      await PostConnectorsidTest(row.id, { skipErrorHandler: true });
      customMessage.success(`连接测试通过：${row.name}`);
    } catch (error: any) {
      customMessage.error(formatConnectTestError(error));
    } finally {
      testingId.value = '';
    }
  };

  /** 按数据源类型统计实例数与采集指标 */
  const statsMap = computed(() => {
    const map: Record<string, { createdCount: number; collectedCount: number }> = {};
    for (const item of dataList.value) {
      if (item.type) {
        if (!map[item.type]) {
          map[item.type] = { createdCount: 0, collectedCount: 0 };
        }
        map[item.type].createdCount += 1;
      }
    }
    return map;
  });

  /** 获取指定数据源类型下的全部实例列表 */
  const getInstancesByType = (typeId: string): ConnectorItem[] => {
    return dataList.value.filter(item => item.type === typeId);
  };

  onMounted(() => {
    fetchList();
  });

  return {
    loading,
    loadError,
    dataList,
    statsMap,
    testingId,
    pagination,
    tableHeight,
    fetchList,
    handleDelete,
    handleTest,
    getInstancesByType,
  };
}
