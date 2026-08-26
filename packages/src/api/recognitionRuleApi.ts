import { customInstance } from '@/api/mutator';

/**
 * 识别规则 API 封装
 */
export const recognitionRuleApi = {
  // 分页查询
  page(params: {
    pageIndex?: number;
    pageSize?: number;
    keyword?: string;
    categoryId?: number;
    owner?: string;
    onlyMine?: boolean;
  }) {
    return customInstance({
      url: '/api/v1/sec/recognition-rules',
      method: 'GET',
      params,
    });
  },

  // 详情
  getDetail(id: number) {
    return customInstance({
      url: `/api/v1/sec/recognition-rules/${id}`,
      method: 'GET',
    });
  },

  // 新建
  create(data: any) {
    return customInstance({
      url: '/api/v1/sec/recognition-rules',
      method: 'POST',
      data,
    });
  },

  // 编辑
  update(id: number, data: any) {
    return customInstance({
      url: `/api/v1/sec/recognition-rules/${id}`,
      method: 'PUT',
      data,
    });
  },

  // 删除
  delete(id: number) {
    return customInstance({
      url: `/api/v1/sec/recognition-rules/${id}`,
      method: 'DELETE',
    });
  },

  // 切换状态
  updateStatus(id: number, status: string) {
    return customInstance({
      url: `/api/v1/sec/recognition-rules/${id}/status`,
      method: 'PUT',
      params: { status },
    });
  },

  // 重置
  reset(id: number) {
    return customInstance({
      url: `/api/v1/sec/recognition-rules/${id}/reset`,
      method: 'POST',
    });
  },

  // 克隆
  clone(id: number) {
    return customInstance({
      url: `/api/v1/sec/recognition-rules/${id}/clone`,
      method: 'POST',
    });
  },

  // 转交负责人
  transferOwner(data: { ruleIds: number[]; newOwner: string }) {
    return customInstance({
      url: '/api/v1/sec/recognition-rules/transfer-owner',
      method: 'POST',
      data,
    });
  },

  // 批量运行
  batchRun(data: { ruleIds: number[]; runScope?: string; lineageInheritance?: boolean }) {
    return customInstance({
      url: '/api/v1/sec/recognition-rules/run',
      method: 'POST',
      data,
    });
  },

  // 手动规则扫描
  manualScan(data: any) {
    return customInstance({
      url: '/api/v1/sec/recognition-rules/manual-scan',
      method: 'POST',
      data,
    });
  },

  // 抽样规则测试
  test(data: { ruleId?: number; testScopeType: string; targetIdentifiers: string[] }) {
    return customInstance({
      url: '/api/v1/sec/recognition-rules/test',
      method: 'POST',
      data,
    });
  },
};
