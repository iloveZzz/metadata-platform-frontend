---
name: formily-foundation
description: 指导 YssFormily 基础表单开发，覆盖 @yss-ui/components 导入边界、FormLayout/FormGrid 三层 schema、Submit 校验链路、scope 表达式与业务层禁用 @formily/antdv UI 导入。
---

# Formily Foundation Skill

## 触发条件

- 创建或改造 `YssFormily` 基础表单（字段、校验、提交）。
- 修复表单导入路径、schema 层级、提交不触发等问题。
- 实现普通单页表单，不含复杂联动或详情插槽。

## 不适用场景

- 复杂联动、副作用、跨字段逻辑：使用 `../formily-linkage-effects/SKILL.md`。
- 查看态 detail 插槽和 mode 切换：使用 `../formily-mode-slot-detail/SKILL.md`。
- 分步表单：使用 `../formily-step-flow/SKILL.md`。

## 硬约束（禁止/必须）

- 业务生成代码统一从 `@yss-ui/components` 导入 `YssFormily` 与 `ISchema`；`YFormily` 仅作为兼容别名说明。
- 禁止业务层导入 `@formily/antdv`、`@formily/antd*` UI 组件。
- 必须使用三层结构：`FormLayout -> FormGrid -> 字段`，禁止字段直接挂在根节点或单独以 `FormGrid` 作为顶层布局。
- `Submit` 必须传 `onSubmit`，否则不触发表单提交。
- 标准业务列表/CRUD 查询区默认让 `YssFormily` 只渲染字段；查询/重置按钮用外部 `YButton` 放在 `.xxx__search-actions`，由 hook 的 `handleSearch/handleReset` 控制分页重置和请求。
- `AutoButtonGroup -> Submit/Reset` 仅用于纯 Formily 表单提交，不作为业务列表查询区默认方案。
- 查询区禁止横向放“表单 + 按钮”后用大 `gap`、`align-items: flex-start` 或 `padding-top` 硬调位置；字段换行时按钮必须在搜索卡片右下角。
- 横向表单必须显式设置 `FormLayout` 的 `labelWidth` 和 `labelAlign: 'right'`，抽屉/弹窗场景尤其不能让 label 宽度自适应。
- `FormGrid` 默认保持响应式：`minColumns: 1`，通过 `maxColumns` 和 `minWidth` 控制宽屏列数；不要写 `minColumns: maxColumns` 固定列数，除非用户明确要求不响应式。
- 查询表单常用 `labelWidth: 100~120`、`FormGrid { maxColumns: 3 或 4, minColumns: 1, minWidth: 260~360 }`，按钮行在表单外部右下角；抽屉/弹窗编辑表单常用 `labelWidth: 140`、`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320~360 }`。
- 备注、说明等长字段必须用 `x-decorator-props.gridSpan` 占满整行，例如两列布局用 `gridSpan: 2`。
- 事件表达式必须字符串化（`'{{ ... }}'`），并按组件语义使用事件名。
- 分步需求默认走 `formily-step-flow`，不在本 skill 内给 `FormStep` 方案。

## 标准代码骨架

```vue
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';

const onSubmit = async (values: Record<string, any>) => {
  await apiSave(values);
};

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': {
        layout: 'horizontal',
        labelWidth: 120,
        labelAlign: 'right',
      },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 3, minColumns: 1, minWidth: 260 },
          properties: {
            name: {
              type: 'string',
              title: '名称',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              required: true,
            },
            submit: {
              type: 'void',
              'x-component': 'Submit',
              'x-content': '提交',
              'x-component-props': { onSubmit: '{{ onSubmit }}' },
            },
          },
        },
      },
    },
  },
};
</script>
```

## 业务查询区布局

```vue
<template>
  <YCard class="demo-page__search-card" :padding="16">
    <div class="demo-page__search-content">
      <div class="demo-page__search-form">
        <YssFormily
          v-model="queryModel"
          :schema="searchSchema"
          :show-button-group="false"
        />
      </div>
      <div class="demo-page__search-actions">
        <YButton type="primary" @click="handleSearch">查询</YButton>
        <YButton @click="handleReset">重置</YButton>
      </div>
    </div>
  </YCard>
</template>
```

```less
.demo-page {
  &__search-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  &__search-form {
    width: 100%;
    min-width: 0;

    :deep(.ant-formily-form-item) {
      margin-bottom: 0;
    }

    :deep(.ant-formily-form-grid) {
      width: 100%;
    }
  }

  &__search-actions {
    display: flex;
    width: 100%;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }
}
```

## 交付检查清单

- [ ] 导入来源和组件边界正确。
- [ ] schema 三层结构完整。
- [ ] 横向表单有固定 `labelWidth` 且 label 右对齐。
- [ ] `FormGrid` 使用响应式列配置，未把 `minColumns` 固定成宽屏列数。
- [ ] `Submit` 提交链路可用，校验可触发。
- [ ] 业务列表查询/重置按钮在外部 `.xxx__search-actions`，按钮行独占下一行并右对齐；缩窄后不会贴在第一行字段旁。
- [ ] label 宽度和右对齐已显式配置。
- [ ] 包含可运行 `initial-values` 或 `v-model` 示例。
- [ ] 未出现 `@formily/antdv` 业务层导入。

## 失败兜底策略

- 若提交不触发：先检查 `Submit.x-component-props.onSubmit`。
- 若字段不显示：先核对 `FormLayout/FormGrid/properties` 层级。
- 若需求升级为联动/模式/分步：立即切换对应 skill，不在本 skill 内硬扩展。

## 参考

- 完整示例：`./references/examples.md`
