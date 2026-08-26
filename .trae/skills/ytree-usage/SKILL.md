---
name: YTree Usage
description: 指导 AI 在左树右表、组织树、分类树、树搜索过滤、节点操作菜单、受控选中和树区域自适应高度场景正确使用 @yss-ui/components 的 YTree。
---

# YTree 使用 Skill

## 触发条件

- 生成左树右表、分类树、组织树、目录树、树节点操作。
- 需要树搜索、受控选中、字段名映射、节点更多菜单。
- 树区域有高度计算、Tab/抽屉/折叠面板切换。

## 不适用场景

- 页面只是普通列表，没有树形筛选或层级数据。
- 树数据只作为表单字段选择器：优先在 `YssFormily` schema 中使用 `TreeSelect`。
- 只处理表格分页和操作列：使用 `../ytable-usage/SKILL.md`。

## 硬约束（禁止/必须）

- 必须从 `@yss-ui/components` 导入 `YTree`；高度用 `@yss-ui/hooks` 的 `useTreeHeight`。
- 需要树区域滚动/虚拟滚动时，标准写法是给 `YTree` 传 `:height="treeHeight"`；不要默认追加 `:virtual="true"`。
- `YTree` 虚拟滚动只有在展开后的可见扁平节点数 `* itemHeight > height` 时才会裁剪 DOM；节点少时不裁剪是正常行为。
- 树数据字段不匹配时使用 `fieldNames`，不要手写重复转换。
- 搜索过滤优先使用 `filterable` 和 `v-model:searchValue`。
- 节点操作使用 `showActions + getNodeActions`，不要在节点 title 里拼复杂按钮。
- 左树右表优先使用 `YSplitPane + YCard + YTree + YTable`。

## 标准代码骨架

```vue
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { YTree } from '@yss-ui/components';
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';

const treeAreaRef = ref<HTMLDivElement>();
const searchValue = ref('');
const selectedKeys = ref<(string | number)[]>([]);

const { treeHeight, recalculateHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT + 16,
});

const getNodeActions = (node: any) => [
  { key: 'add', label: '新增' },
  { key: 'edit', label: '编辑' },
  { key: 'delete', label: '删除', danger: true },
];

watch(
  () => activeTab.value,
  () => nextTick(() => recalculateHeight())
);
</script>

<template>
  <div ref="treeAreaRef" class="tree-area">
    <YTree
      :height="treeHeight"
      :tree-data="treeData"
      :field-names="{ title: 'name', key: 'id', children: 'children' }"
      filterable
      show-actions
      v-model:searchValue="searchValue"
      v-model:selectedKeys="selectedKeys"
      :get-node-actions="getNodeActions"
    />
  </div>
</template>
```

## 交付检查清单

- [ ] 树数据字段通过 `fieldNames` 适配。
- [ ] 搜索态和选中态可控。
- [ ] 节点操作通过 `getNodeActions` 输出。
- [ ] 树高度来自 `useTreeHeight(treeAreaRef, options)`。
- [ ] 不把 `:virtual="true"` 作为常规配置；仅在排查旧版本组件库时临时验证。
- [ ] 左树选中后右表查询条件和分页重置逻辑清晰。

## 失败兜底策略

- 树节点字段不统一时，优先配置 `fieldNames`，不要复制转换树数据。
- 高度为 0 时，先检查容器是否隐藏，再在可见后调用 `recalculateHeight`。
- 左树右表联动异常时，先固定选中节点、查询参数和分页重置三条链路。
