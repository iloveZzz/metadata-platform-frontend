import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';

export interface IssueItem {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'processing' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  reporter: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
}

export interface IssueStats {
  total: number;
  open: number;
  processing: number;
  resolved: number;
  closed: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

export const useIssueStore = defineStore('issue', () => {
  // 状态
  const issueList = ref<IssueItem[]>([]);
  const loading = ref(false);
  const searchForm = ref({
    keyword: '',
    status: undefined as string | undefined,
    priority: undefined as string | undefined,
    assignee: undefined as string | undefined,
    dateRange: undefined as [string, string] | undefined,
  });

  const pagination = ref({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 计算属性 - 统计数据
  const stats = computed<IssueStats>(() => {
    const total = issueList.value.length;
    const open = issueList.value.filter(item => item.status === 'open').length;
    const processing = issueList.value.filter(item => item.status === 'processing').length;
    const resolved = issueList.value.filter(item => item.status === 'resolved').length;
    const closed = issueList.value.filter(item => item.status === 'closed').length;
    const highPriority = issueList.value.filter(item => item.priority === 'high').length;
    const mediumPriority = issueList.value.filter(item => item.priority === 'medium').length;
    const lowPriority = issueList.value.filter(item => item.priority === 'low').length;

    return {
      total,
      open,
      processing,
      resolved,
      closed,
      highPriority,
      mediumPriority,
      lowPriority,
    };
  });

  // 计算属性 - 过滤后的列表
  const filteredIssueList = computed(() => {
    let filtered = [...issueList.value];

    // 关键词搜索
    if (searchForm.value.keyword) {
      const keyword = searchForm.value.keyword.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword) ||
          item.assignee.toLowerCase().includes(keyword) ||
          item.reporter.toLowerCase().includes(keyword)
      );
    }

    // 状态筛选
    if (searchForm.value.status) {
      filtered = filtered.filter(item => item.status === searchForm.value.status);
    }

    // 优先级筛选
    if (searchForm.value.priority) {
      filtered = filtered.filter(item => item.priority === searchForm.value.priority);
    }

    // 负责人筛选
    if (searchForm.value.assignee) {
      filtered = filtered.filter(item => item.assignee === searchForm.value.assignee);
    }

    // 日期范围筛选
    if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
      const [startDate, endDate] = searchForm.value.dateRange;
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
      });
    }

    return filtered;
  });

  // 计算属性 - 分页后的列表
  const paginatedIssueList = computed(() => {
    const start = (pagination.value.current - 1) * pagination.value.pageSize;
    const end = start + pagination.value.pageSize;
    return filteredIssueList.value.slice(start, end);
  });

  // 计算属性 - 解决率
  const resolutionRate = computed(() => {
    const total = stats.value.total;
    if (total === 0) return 0;
    return Math.round((stats.value.resolved / total) * 100);
  });

  // 计算属性 - 处理中问题占比
  const processingRate = computed(() => {
    const total = stats.value.total;
    if (total === 0) return 0;
    return Math.round((stats.value.processing / total) * 100);
  });

  // 方法
  const fetchIssueList = async () => {
    loading.value = true;
    try {
      issueList.value = [];
      pagination.value.total = 0;
    } catch (error) {
      message.error('问题列表加载失败！');
    } finally {
      loading.value = false;
    }
  };

  const updateSearchForm = (form: Partial<typeof searchForm.value>) => {
    Object.assign(searchForm.value, form);
    pagination.value.current = 1;
    pagination.value.total = filteredIssueList.value.length;
  };

  const resetSearchForm = () => {
    searchForm.value = {
      keyword: '',
      status: undefined,
      priority: undefined,
      assignee: undefined,
      dateRange: undefined,
    };
    pagination.value.current = 1;
    pagination.value.total = filteredIssueList.value.length;
  };

  const updatePagination = (current: number, pageSize: number) => {
    pagination.value.current = current;
    pagination.value.pageSize = pageSize;
  };

  const createIssue = async (issueData: Omit<IssueItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    loading.value = true;
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const newIssue: IssueItem = {
        ...issueData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      issueList.value.unshift(newIssue);
      pagination.value.total = filteredIssueList.value.length;
      message.success('问题创建成功！');
    } catch (error) {
      message.error('问题创建失败！');
    } finally {
      loading.value = false;
    }
  };

  const updateIssue = async (id: string, issueData: Partial<IssueItem>) => {
    loading.value = true;
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const index = issueList.value.findIndex(item => item.id === id);
      if (index !== -1) {
        issueList.value[index] = {
          ...issueList.value[index],
          ...issueData,
          updatedAt: new Date().toISOString(),
        };
        message.success('问题更新成功！');
      }
    } catch (error) {
      message.error('问题更新失败！');
    } finally {
      loading.value = false;
    }
  };

  const deleteIssue = async (id: string) => {
    loading.value = true;
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));

      const index = issueList.value.findIndex(item => item.id === id);
      if (index !== -1) {
        issueList.value.splice(index, 1);
        pagination.value.total = filteredIssueList.value.length;
        message.success('问题删除成功！');
      }
    } catch (error) {
      message.error('问题删除失败！');
    } finally {
      loading.value = false;
    }
  };

  return {
    // 状态
    issueList,
    loading,
    searchForm,
    pagination,
    // 计算属性
    stats,
    filteredIssueList,
    paginatedIssueList,
    resolutionRate,
    processingRate,
    // 方法
    fetchIssueList,
    updateSearchForm,
    resetSearchForm,
    updatePagination,
    createIssue,
    updateIssue,
    deleteIssue,
  };
});
