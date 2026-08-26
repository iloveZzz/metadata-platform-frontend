---
name: Use Tree Height
description: 指导在 YTree、左树右表、树搜索过滤、Tab/抽屉内树区域场景正确使用 @yss-ui/hooks 的 useTreeHeight，实现稳定自适应高度；当用户生成树形筛选、组织树、分类树页面时使用。
---

# Use Tree Height Skill

## 触发条件

- 左树右表或纯树页需要树区域自适应高度。
- 树区域包含搜索、筛选、工具栏，导致内容裁剪或滚动异常。
- 容器切换（Tab/折叠面板/抽屉）后树高度不更新。

## 不适用场景

- 树节点很少且无需滚动容器。
- 页面主问题是数据联动，而不是布局高度。
- 高度已由父级布局组件完全托管。

## 硬约束（禁止/必须）

- 必须使用 `useTreeHeight`，禁止固定高度魔法值。
- 必须传入树区域父容器 `ref`：`useTreeHeight(treeAreaRef, options)`。
- 必须使用真实返回值 `recalculateHeight`，禁止使用旧的错误返回名。
- `YTree` 标准写法是传 `:height="treeHeight"`；不要默认追加 `:virtual="true"`。
- 虚拟滚动只有在展开后的可见扁平节点数 `* itemHeight > height` 时才会裁剪 DOM；节点少时不裁剪是正常行为。
- 必须考虑搜索区高度（如 `YTREE_SEARCH_HEIGHT`）和额外偏移。
- 必须在容器可见后触发重算，避免隐藏态计算失败。
- 禁止把高度逻辑散落在多个组件，统一在页面 hook 层管理。

## 标准代码骨架

```vue
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { YTree } from '@yss-ui/components';
import { useTreeHeight, YTREE_SEARCH_HEIGHT } from '@yss-ui/hooks';

const treeAreaRef = ref<HTMLDivElement>();
const activeTab = ref('tree');

const { treeHeight, recalculateHeight } = useTreeHeight(treeAreaRef, {
  extraOffset: YTREE_SEARCH_HEIGHT + 16,
});

watch(
  () => activeTab.value,
  () => nextTick(() => recalculateHeight())
);
</script>

<template>
  <div ref="treeAreaRef" class="tree-area">
    <YTree :height="treeHeight" :tree-data="treeData" filterable />
  </div>
</template>
```

## 交付检查清单

- [ ] 树高度来自 hook 计算且参数合理。
- [ ] 已传入树区域父容器 ref。
- [ ] 搜索区/工具栏偏移已纳入。
- [ ] 容器切换后树高度可重算。
- [ ] 无树区溢出或截断问题。
- [ ] 与右侧内容区滚动互不干扰。

## 失败兜底策略

- 若高度为 0，优先检查容器是否处于隐藏态初始化。
- 若传了 `height` 但未出现 DOM 裁剪，先确认展开后的节点数量是否足够，再检查组件库版本；旧版本排障可临时加 `:virtual="true"` 验证，不作为最终写法。
- 若滚动异常，先核对父容器是否具备可计算高度。
- 若多布局叠加复杂，先在最外层统一高度上下文再下钻。
