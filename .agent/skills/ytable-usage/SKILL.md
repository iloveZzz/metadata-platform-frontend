---
name: YTable Usage
description: 指导 AI 在业务列表页、CRUD 表格、远程分页、操作列、气泡确认、筛选、字典翻译、行拖拽和自定义插槽场景正确使用 @yss-ui/components 的 YTable。
---

# YTable 使用 Skill

## 触发条件

- 生成或修改列表页、表格页、分页查询、批量操作、行操作。
- 需要配置 `YTableColumn`、`actionConfig`、远程分页、筛选插槽、字典翻译。
- 删除、启停、发布等行操作需要二次确认。

## 不适用场景

- 只处理普通静态展示，不需要表格交互。
- 表单编辑是核心需求：使用 `../yss-formily/SKILL.md`。
- 树节点展示是核心需求：使用 `../ytree-usage/SKILL.md`。

## 硬约束（禁止/必须）

- 必须从 `@yss-ui/components` 导入 `YTable` 和类型 `YTableColumn`。
- 远程分页状态必须使用 `current/pageSize/total/remote`，后端 `pageIndex/totalCount` 只在 hook 内映射。
- 使用分页时必须传 `pageable`；远程分页必须设置 `pagination.remote = true`。
- 业务列表必须显式使用 `:data`、`:columns`、`:loading`、`v-model:pagination` 和 `@page-change`；禁止臆造或沿用未在文档出现的 `request`、`search-params`、`refresh`、`row-key` 等 API。
- 有列设置按钮或表格工具栏时必须传 `:toolbar-config="{ custom: true }"`；新增、导入、批量操作等主按钮默认放在 `#toolbar-right`，不要放在表格卡片左上角。
- 删除确认优先使用 `actionConfig.buttons[].isConfirm = true`，禁止默认使用居中 `Modal.confirm`。
- 列配置放在 `constant.ts`；超过 10 行不得内联在组件里。
- 表格高度应绑定 `:height="tableHeight"`；开启分页或工具栏时同步配置 `useTableHeight(..., { withPagination: true, withToolbar: true })`，避免底部大空白或双滚动。

## 标准代码骨架

```ts
import type { YTableActionConfig, YTableColumn } from '@yss-ui/components';

export const TABLE_COLUMNS: YTableColumn[] = [
  { type: 'seq', title: '序号', width: 70 },
  { field: 'name', title: '名称', minWidth: 180 },
  { field: 'status', title: '状态', width: 120, isTransform: true },
  { type: 'action', title: '操作', width: 180 },
];

export const ACTION_CONFIG: YTableActionConfig = {
  width: 180,
  fixed: 'right',
  buttons: [
    {
      value: 'edit',
      label: '编辑',
      type: 'link',
      click: ({ row }) => openEdit(row),
    },
    {
      value: 'delete',
      label: '删除',
      type: 'link',
      isConfirm: true,
      confirmProps: {
        title: '确认删除该数据吗？',
        okText: '确定',
        cancelText: '取消',
      },
      click: async ({ row }, _btn, helpers) => {
        await deleteItem(row.id);
        helpers.close();
      },
    },
  ],
};
```

```vue
<YTable
  :data="dataList"
  :columns="TABLE_COLUMNS"
  :action-config="ACTION_CONFIG"
  :loading="loading"
  :options-map="{ status: STATUS_OPTIONS }"
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

## 插槽命名

- 单元格插槽：优先用字段名或 kebab-case 字段名，如 `#status`、`#created-time`。
- 表头插槽：`#fieldHeader`、`#field-header`、`#kebab-field-header`。
- 筛选插槽：`#fieldFilter`、`#field-filter`、`#kebab-field-filter`。
- 展开行插槽：`#expand-row`。
- 操作列更多图标：`#action-more-icon`。

## 交付检查清单

- [ ] 分页字段和事件符合 YTable 真实 API。
- [ ] 未使用未文档化的 `request/search-params/refresh` 等 API。
- [ ] 工具栏按钮在 `#toolbar-right`，列设置使用 `toolbar-config.custom`。
- [ ] 开启分页/工具栏时高度计算包含对应偏移，无表格底部大空白。
- [ ] 行操作确认使用气泡确认。
- [ ] 字典翻译优先使用 `optionsMap + isTransform`。
- [ ] 自定义列内容使用插槽而不是在 formatter 里写复杂 VNode。
- [ ] 未直接使用 `a-table` 实现业务主表格。

## 失败兜底策略

- 分页字段混乱时，先在 hook 中明确区分后端查询参数和 YTable 分页状态。
- 操作列按钮过多时，优先使用 `displayLimit` 和更多菜单，不扩宽主表格。
- 删除确认交互不明确时，默认使用 `isConfirm` 气泡确认。
- 如果想用 `request` 风格封装，先查当前 `llms-full.txt` 或组件源码确认存在；不存在时回到 hook 管理 `data/loading/pagination`。
