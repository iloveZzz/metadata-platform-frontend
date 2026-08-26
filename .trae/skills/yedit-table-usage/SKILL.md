---
name: YEditTable Usage
description: 指导在 YSS UI 业务页面中实现可编辑表格、行内编辑、添加行、删除行、下拉可输入、多选下拉、行级联动 options 和校验，强制优先使用 @yss-ui/components 的 YEditTable。
---

# YEditTable 使用 Skill

## 触发条件

- 需求出现“编辑表格、可编辑表格、行内编辑、添加行、删除行、扩展属性表、明细行配置”。
- 表格列需要 `Input`、`Select`、`TreeSelect`、`Cascader`、`Switch` 等行内编辑器。
- 某列下拉候选依赖当前行其它字段，或需要“下拉可输入/多选下拉”。

## 不适用场景

- 主列表只展示和分页：使用 `../ytable-usage/SKILL.md`。
- 表单主体不是表格：使用 `../yss-formily/SKILL.md`。
- 组件库内部改造 `YEditTable`：使用 `../component-development/SKILL.md`。

## 硬约束（禁止/必须）

- 业务可编辑表格必须优先使用 `YEditTable`，从 `@yss-ui/components` 导入 `YEditTable` 和 `YEditTableColumn`。
- 禁止用 `ant-design-vue` 的 `Table/a-table` 手搓可编辑表格，除非文档确认 `YEditTable` 不支持该能力并说明原因。
- 列配置放 `constant.ts` 或局部 `computed<YEditTableColumn[]>`；超过 10 行不得内联模板。
- 下拉列使用 `component: 'form-item-select'`；可输入用 `props.allowCreate: true`，多选用 `props.multiple: true`。
- 行级候选使用 `rowOptionsFieldName` 或 `filterOptions`，不要为了某一行修改全局 `optionsMap` 导致其它行反显错误。注意 `filterOptions` 是“编辑态下拉候选过滤”，与“表头列筛选”（`filterable`）是两回事，不要混用。
- 需要表头列筛选时优先用内置渲染器 `filterRender: { name: 'VxeInput', props: {...} }`，不必再写 `slots: { filter }` + 手搓面板；仅当面板需要高度定制时才用 `#<field>-filter` 插槽。远程筛选监听 `@filter-change`，切换数据/新增行后调用 `getTableInstance().clearFilter()`。
- 添加行优先用组件 `addable/addBtnText/addPosition`；若需自定义文案或校验前置，可自定义底部按钮但仍驱动 `v-model:data`。
- 删除列使用 `type: 'action' + actionConfig.buttons[].isConfirm`；非危险的临时行删除可直接移除，但必须保持查看态禁用。
- 弹窗/抽屉内表格需要稳定高度时，配合 `useTableHeight(tableAreaRef, { withAddButton: true })`，并在打开后 `nextTick(recalculateHeight)`。

## 标准代码骨架

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  YEditTable,
  type YEditTableColumn,
  type YTableActionConfig,
} from '@yss-ui/components';

interface ExtRow {
  id?: string;
  _rowKey: string;
  extName?: string;
  extValu?: string[];
  memo?: string;
  options?: Record<string, Array<{ label: string; value: string }>>;
}

const rows = ref<ExtRow[]>([]);
const tableRef = ref<InstanceType<typeof YEditTable>>();

const columns = computed<YEditTableColumn[]>(() => [
  {
    field: 'extName',
    title: '扩展属性',
    minWidth: 240,
    component: 'form-item-select',
    props: { allowCreate: true, placeholder: '请选择或输入扩展属性' },
    options: extClassOptions.value,
    editRender: {},
    customRule: (value, row, _field, all) => {
      if (!value) return { errMsg: '扩展属性不能为空' };
      if (!/^[A-Za-z0-9_]+$/.test(value))
        return { errMsg: '只能输入英文、数字、下划线' };
      if (String(value).length > 50) return { errMsg: '最多 50 个字符' };
      if (all.filter(item => item.extName === value).length > 1)
        return { errMsg: '扩展属性不能重复' };
      return {};
    },
  },
  {
    field: 'extValu',
    title: '扩展值',
    minWidth: 240,
    component: 'form-item-select',
    props: {
      allowCreate: true,
      multiple: true,
      placeholder: '请选择或输入扩展值',
    },
    editRender: {},
    customRule: value =>
      String(value ?? '').length > 100 ? { errMsg: '最多 100 个字符' } : {},
  },
  {
    field: 'memo',
    title: '备注',
    minWidth: 260,
    component: 'form-item-input',
    props: { placeholder: '请输入备注' },
    editRender: {},
    customRule: value =>
      String(value ?? '').length > 200 ? { errMsg: '最多 200 个字符' } : {},
  },
  {
    field: 'operation',
    title: '操作',
    width: 100,
    type: 'action',
    fixed: 'right',
  },
]);

const actionConfig: YTableActionConfig = {
  buttons: [
    {
      value: 'delete',
      label: '删除',
      type: 'link',
      isConfirm: true,
      confirmProps: {
        title: '是否确认删除此条数据？',
        okText: '确定',
        cancelText: '取消',
      },
      click: ({ row }) => {
        rows.value = rows.value.filter(item => item._rowKey !== row._rowKey);
      },
    },
  ],
};

const validateRows = async () => {
  const result = await tableRef.value?.validate?.();
  return result?.valid !== false;
};
</script>

<template>
  <YEditTable
    ref="tableRef"
    v-model:data="rows"
    :columns="columns"
    :action-config="actionConfig"
    :row-config="{ keyField: '_rowKey' }"
    :edit-config="{ trigger: 'click', mode: 'row', autoClear: false }"
    :disabled="mode === 2"
    addable
    add-btn-text="添加一行"
  />
</template>
```

## 表头列筛选（与 YTable 对齐）

可编辑表格的表头筛选机制与 `YTable` 一致：列设 `filterable: true`，并提供 `filters` 与本地 `filterMethod`；多选筛选加 `filterMultiple: true`。

```ts
// 文本筛选：内置渲染器（推荐，最省事，不用写插槽）
{
  field: 'columnName',
  title: '目标列名称',
  component: 'form-item-input',
  filterable: true,
  filters: [{ data: '' }],
  filterMethod: ({ option, cellValue }) =>
    `${cellValue ?? ''}`.toLowerCase().includes(`${option?.data ?? ''}`.trim().toLowerCase()),
  filterRender: { name: 'VxeInput', props: { clearable: true, placeholder: '请输入关键词' } },
}

// 多选筛选
{
  field: 'type', filterable: true, filterMultiple: true,
  filters: [{ label: '内置', value: '1' }, { label: '自定义', value: '0' }],
  filterMethod: ({ values, cellValue }) => !values?.length || values.includes(String(cellValue)),
}
```

要点：

- 远程筛选监听 `@filter-change`（透传 vxe 参数）。
- 切换区域/数据源或新增行后调用 `tableRef.value?.getTableInstance?.()?.clearFilter?.(field?)` 清空。
- 仅当筛选面板需要复杂定制时才用 `#<field>-filter` 插槽，并在面板内 `updateFilterOptionStatus(option, !!option.data)` 同步状态。

## 交付检查清单

- [ ] 已使用 `YEditTable`，没有用 `a-table` 手搓编辑表格。
- [ ] 下拉可输入、多选下拉通过 `props.allowCreate/props.multiple` 实现。
- [ ] 行级联动候选没有污染全局 `optionsMap`。
- [ ] 必填、长度、重复校验通过 `validate()` 或列 `customRule` 可触发。
- [ ] 保存组装时清理前端临时 key，新行不传临时 id，已有后端 id 保留。
- [ ] 查看态禁用编辑、添加和删除。

## 失败兜底策略

- 若下拉面板导致编辑态丢失，优先保持 `editConfig.autoClear=false`。
- 若候选依赖当前行字段，先把候选写入当前行 `options` 映射，再用 `rowOptionsFieldName` 读取。
- 若复杂列无法通过内置编辑器表达，只对该列使用插槽，表格主体仍保留 `YEditTable`。
