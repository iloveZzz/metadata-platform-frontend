---
name: page-list-module
description: 指导实现 YSS UI 标准列表页、分页查询、YTable 操作列、批量操作、左树右表列表模块，覆盖远程分页状态、YTable 事件、hooks 拆分与操作确认。
---

# Page List Module Skill

## 触发条件

- 需求是标准列表页（查询、表格、分页、行操作、批量操作）。
- 需要左树右表、工具栏、筛选区等列表组合场景。
- 需要把列表逻辑拆到 hook，保证可维护性。

## 不适用场景

- 需求核心是表单编辑，不是列表展示。
- 仅新建骨架，不实现列表行为细节。
- 不涉及远程数据和分页交互。

## 硬约束（禁止/必须）

- 组件选型必须先走 `../component-selection-imports/SKILL.md`。
- 表格能力优先遵循 `../ytable-usage/SKILL.md`。
- 查询表单必须遵循 `../yss-formily/SKILL.md` 的业务列表查询区模板：`YssFormily` 只渲染字段，查询/重置放在外部 `.xxx__search-actions`，按钮行独占下一行并右对齐。
- 查询区禁止横向放“表单 + 按钮”并用大 `gap`、`align-items: flex-start`、`padding-top` 硬调位置；字段换行时按钮必须仍在搜索卡片右下角。
- 列表请求必须封装在 `useXxxList`，禁止模板内直接请求。
- 后端查询参数可用 `pageIndex/pageSize`，但传给 `YTable` 的分页状态必须是 `current/pageSize/total`。
- 远程分页必须启用 `pageable`，并设置 `pagination.remote = true`。
- 表格不得使用未文档化的 `request/search-params/refresh` API；查询、重置、分页都调用 hook 内的 `fetchData/handleSearch/handleReset`。
- 有新增/导入/列设置时，必须使用 `YTable #toolbar-right` 和 `:toolbar-config="{ custom: true }"`。
- 行操作必须显式区分“立即操作”和“二次确认”。
- 列定义、状态映射、筛选配置必须放 `constant.ts`。
- 行操作回传 id（删除、启用禁用、详情、批量等）禁止用 `Number()`/`parseInt`/`parseFloat`/`+x`/`*1`/`~~` 转换接口返回的 number 字段，一律字符串透传；id 比较用字符串相等。底层 json-bigint 已存为字符串保精度，详见 `../api-integration/SKILL.md`「大数字与精度」。
- 接口响应处理禁止使用 `if (res?.success)` 冗余逻辑包裹或在 `else`/`catch` 块中重复调用 `message.error`；底层 `mutator.ts` 拦截器已统一处理 `success === false` 自动弹窗并 `reject` 中断，直接使用 `res?.data ?? []` / `res?.data ?? {}` 做数据兜底。

## 标准代码骨架

```typescript
export function useRuleList() {
  const loading = ref(false);
  const dataList = ref<any[]>([]);
  const query = reactive({ pageIndex: 1, pageSize: 20, keyword: '' });
  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    remote: true,
  });

  const fetchData = async () => {
    loading.value = true;
    try {
      query.pageIndex = pagination.current ?? 1;
      query.pageSize = pagination.pageSize ?? 20;
      const res = await queryRuleList(query);
      dataList.value = res.data?.list ?? [];
      pagination.total = res.data?.totalCount ?? 0;
    } finally {
      loading.value = false;
    }
  };

  const handlePageChange = ({
    current,
    pageSize,
  }: {
    current: number;
    pageSize: number;
  }) => {
    pagination.current = current;
    pagination.pageSize = pageSize;
    fetchData();
  };

  const handleSearch = () => {
    pagination.current = 1;
    fetchData();
  };

  const handleReset = () => {
    Object.assign(query, {
      pageIndex: 1,
      pageSize: pagination.pageSize,
      keyword: '',
    });
    pagination.current = 1;
    fetchData();
  };

  return {
    loading,
    dataList,
    query,
    pagination,
    fetchData,
    handlePageChange,
    handleSearch,
    handleReset,
  };
}
```

```vue
<YTable
  :data="dataList"
  :columns="TABLE_COLUMNS"
  :loading="loading"
  :toolbar-config="{ custom: true }"
  :height="tableHeight"
  pageable
  v-model:pagination="pagination"
  @page-change="handlePageChange"
>
  <template #toolbar-right>
    <YButton type="primary" @click="openCreate">新增</YButton>
  </template>
</YTable>
```

## 交付检查清单

- [ ] 查询参数和 YTable 分页状态字段已正确映射。
- [ ] 查询区为纵向 `search-content`，按钮行在外部 `.xxx__search-actions` 右对齐独占一行。
- [ ] `pageable`、`pagination.remote`、`@page-change` 已配置。
- [ ] 查询/重置会重置页码并重新请求。
- [ ] 未使用 `request/search-params/refresh` 等未确认 API。
- [ ] 新增/导入等主操作在表格 `#toolbar-right`，列设置按钮已开启。
- [ ] 列配置和状态映射已抽离。
- [ ] 行操作有权限和确认策略。
- [ ] 行操作传给接口的 id 等 number 字段未被 `Number()`/`parseInt`/`+x` 转换，保持字符串透传。
- [ ] 异常态、空态和 loading 态可见。
- [ ] 列表状态在返回页面时可恢复（如有需求）。

## 失败兜底策略

- 查询条件多且混乱时，先冻结最小查询集（关键词 + 分页）再扩展。
- 请求性能差时，先减少联动触发频率并加防抖。
- 列表复杂度过高时，拆分 `useListData` 与 `useListActions` 两个 hooks。
