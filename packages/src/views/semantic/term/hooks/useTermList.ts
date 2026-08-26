/**
 * 术语管理页 - 列表 Hook（服务端分页 + 筛选）
 * GET /api/semantic/terms 返回 PageResult（A2-AM-01 运行时形态：data 数组 +
 * 顶层 totalCount / pageIndex / pageSize，0 条以空分页表达，非错误）。
 * 状态覆盖：loading / empty（空分页）/ error（可重试，不清空筛选条件）。
 */
import { onActivated, reactive, ref, type Ref } from 'vue';
import { useTableHeight } from '@yss-ui/hooks';
import { semanticTermsApi } from '@/api';
import type { GetSemanticTermsParams } from '@/api/generated/semantic/model';
import { normalizeSearchValues } from '../schemas/searchSchema';
import type { SearchSchemaValues } from '../schemas/searchSchema';
import type { TermFilter, TermRow } from '../type';

export function useTermList({ tableAreaRef }: { tableAreaRef: Ref<HTMLElement | undefined> }) {
  const loading = ref(false);
  const loadError = ref(false);
  const dataList = ref<TermRow[]>([]);

  /** 已提交筛选条件（query 触发的服务端参数；搜索框输入草稿见 keywordDraft） */
  const filter = reactive<TermFilter>({});
  const keywordDraft = ref('');

  /** YTable 远程分页（remote: true 表示服务端分页） */
  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    remote: true,
  });
  const { tableHeight } = useTableHeight(tableAreaRef, { withPagination: true });

  const buildParams = (): GetSemanticTermsParams => ({
    page: pagination.current,
    size: pagination.pageSize,
    keyword: filter.keyword || undefined,
    status: filter.status || undefined,
    onlyCertified: filter.onlyCertified || undefined,
  });

  const fetchList = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await semanticTermsApi.GetSemanticTerms(buildParams());
      // PageResult.data 为对象数组（契约 data 元素=Term），经 unknown 桥接为本地行类型
      dataList.value = (res?.data as unknown as TermRow[]) ?? [];
      pagination.total = Number(res?.totalCount ?? 0);
    } catch {
      // mutator 拦截器已统一提示；错误态保留当前筛选条件，重试不丢失
      dataList.value = [];
      pagination.total = 0;
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** YTable 分页变化（服务端分页重新拉取） */
  const onPageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    fetchList();
  };

  /** 筛选变化后回到第一页并拉取 */
  const resetPageAndFetch = () => {
    pagination.current = 1;
    fetchList();
  };

  /** 查询区提交（YssFormily 表单值 → 服务端参数） */
  const handleSearch = (values: SearchSchemaValues) => {
    Object.assign(filter, normalizeSearchValues(values));
    resetPageAndFetch();
  };

  /** 查询区重置 */
  const handleReset = () => {
    Object.assign(filter, { keyword: undefined, status: undefined, onlyCertified: undefined });
    keywordDraft.value = '';
    resetPageAndFetch();
  };

  /** 搜索提交（keywordDraft 回车 / 搜索按钮） */
  const handleKeywordSearch = (value: string) => {
    handleSearch({ keyword: value, status: filter.status, onlyCertified: filter.onlyCertified });
  };

  /** 空态引导：新建第一个术语 */
  const guideCreate = () => {
    // 由页面通过 openCreate 事件回调接管；此处仅作空态引导占位
  };

  // keep-alive 激活时刷新：首次进入（挂载）与返回时均触发；筛选条件保持
  onActivated(() => {
    fetchList();
  });

  return {
    loading,
    loadError,
    dataList,
    filter,
    keywordDraft,
    pagination,
    tableHeight,
    fetchList,
    onPageChange,
    resetPageAndFetch,
    handleSearch,
    handleReset,
    handleKeywordSearch,
    guideCreate,
  };
}
