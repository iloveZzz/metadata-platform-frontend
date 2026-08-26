---
name: Use Table Height
description: 指导在 YTable、YEditTable 或弹窗/抽屉表格场景正确使用 @yss-ui/hooks 的 useTableHeight，实现稳定自适应高度；当用户生成列表页、左树右表、分页表格、自适应表格高度、避免双滚动条时使用。
---

# Use Table Height Skill

## 触发条件

- 列表页需要自适应表格高度、避免滚动区域错位。
- 页面有工具栏、分页、筛选区，需要统一计算高度。
- 弹窗/抽屉内嵌表格出现高度塌陷或超出容器。

## 不适用场景

- 表格不需要滚动高度管理（纯短表）。
- 仅做数据逻辑，不涉及布局高度问题。
- 使用了其他已封装布局组件并已托管高度。

## 硬约束（禁止/必须）

- 必须传入表格父容器 `ref`：`useTableHeight(tableAreaRef, options)`。
- 必须使用真实返回值 `recalculateHeight`，禁止使用旧的错误返回名。
- 必须把分页、工具栏、底部添加按钮、额外偏移纳入配置。
- `YTable` 开启 `pageable` 时 `withPagination: true`；开启 `toolbar-config.custom` 或使用工具栏插槽时 `withToolbar: true`；`YEditTable` 使用底部添加按钮时 `withAddButton: true`。
- 表格容器必须是可计算高度的 flex 子元素：父级 `height: 100%; display: flex; flex-direction: column;`，表格区域 `flex: 1; min-height: 0; overflow: hidden;`。
- 给 `YTable` 优先绑定 `:height="tableHeight"`，不要只绑 `max-height` 或让内容撑开容器。
- 禁止写死大常量高度替代 hook 计算。
- 弹窗/抽屉场景必须监听可见性变化并触发重算。

## 标准代码骨架

```vue
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';

const tableAreaRef = ref<HTMLDivElement>();
const drawerOpen = ref(false);

const { tableHeight, isReady, recalculateHeight } = useTableHeight(
  tableAreaRef,
  {
    withPagination: true,
    withToolbar: true,
    extraOffset: 16,
  }
);

watch(
  () => drawerOpen.value,
  visible => {
    if (visible) nextTick(() => recalculateHeight());
  }
);
</script>

<template>
  <div ref="tableAreaRef" class="table-area">
    <YTable
      v-if="isReady"
      :height="tableHeight"
      :data="dataList"
      :columns="columns"
      pageable
    />
  </div>
</template>

<style scoped lang="less">
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
```

## 交付检查清单

- [ ] 表格高度来自 hook，而不是硬编码。
- [ ] 已传入表格父容器 ref。
- [ ] 分页、工具栏、筛选区、添加按钮偏移已纳入。
- [ ] 表格区域具备 `flex: 1; min-height: 0; overflow: hidden;`。
- [ ] `YTable` 使用 `height`，未因 `max-height` 或外层内容撑开产生底部空白。
- [ ] 容器尺寸变化后调用 `recalculateHeight` 可重算。
- [ ] 弹窗/抽屉场景已处理可见性时机。
- [ ] 页面滚动行为稳定，无双滚动条冲突。

## 失败兜底策略

- 高度异常先打印容器尺寸和偏移项，确认计算输入。
- 首屏错位先在 `nextTick` 后重算一次。
- 容器结构复杂时，先缩小到最小布局复现再回填业务区域。
