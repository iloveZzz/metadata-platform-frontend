---
name: yss-formily
description: 指导在 YSS UI 业务页面中正确使用 @yss-ui/components 的 YssFormily，覆盖 JSON Schema 表单、新增编辑查看、校验提交、字段联动、详情插槽、分步表单和动态 schema，并禁止错误 Formily UI 导入。
---

# YssFormily 表单开发 Skill

## 触发条件

- 生成或修改新增、编辑、查看、弹窗表单、详情表单、查询表单。
- 需要 JSON Schema、字段联动、动态显隐、远程字典、Slot 自定义渲染。
- 需要 `mode=0/1/2`、详情 Descriptions、分步表单。

## 不适用场景

- 页面只有普通列表，不涉及表单：使用 `../page-list-module/SKILL.md`。
- 只处理表格操作列或分页：使用 `../ytable-usage/SKILL.md`。
- 组件库内部改造 YssFormily 源码：使用 `../component-development/SKILL.md`。

## 硬约束（禁止/必须）

- 业务生成代码统一使用 `import { YssFormily, type ISchema } from '@yss-ui/components'`。
- `YFormily` 是兼容别名，除非维护旧代码，不作为新代码首选命名。
- 业务层禁止导入 `@formily/antdv` UI 组件，禁止导入不存在的 `@formily/antd-v3`。
- 所有业务 `YssFormily` schema 必须包含 `FormLayout -> FormGrid -> 字段` 基础层级，禁止直接以字段或单独 `FormGrid` 作为顶层布局。
- `Submit` 组件必须传 `onSubmit`，否则不会触发提交校验。
- 标准业务列表/CRUD 查询区默认让 `YssFormily` 只渲染查询字段；“查询/重置”用外部 `YButton` 放在 `.xxx__search-actions`，由 hook 的 `handleSearch/handleReset` 控制分页重置和请求。
- `AutoButtonGroup + Submit + Reset` 仅用于纯 Formily 表单提交场景，不作为业务列表查询区默认方案。
- 查询区禁止把 `.xxx__search-content` 写成横向“表单 + 按钮”并用大 `gap`、`align-items: flex-start`、`padding-top` 硬调按钮位置；字段换行时按钮必须仍在搜索卡片右下角。
- 横向业务表单必须显式设置 `FormLayout` 的 `labelWidth` 和 `labelAlign: 'right'`；抽屉/弹窗表单不得让 label 宽度随文本抖动。
- `FormGrid` 必须保持响应式：默认 `minColumns: 1`，通过 `maxColumns`、`minWidth` 控制宽屏列数；禁止把 `minColumns` 写成与 `maxColumns` 相同的固定列数，除非用户明确要求固定不响应。
- 查询区默认使用 `FormGrid` 响应式栅格渲染字段，按钮区独占下一行并右对齐；窄屏或缩放后字段变为多行时，按钮仍贴在查询卡片右下角。
- 抽屉/弹窗编辑表单默认 `labelWidth: 140`、`labelAlign: 'right'`、`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320~360 }`；备注、长文本等字段用 `gridSpan` 占满整行。
- `mode=2` 自动进入详情查看态；不要生成旧式详情开关 prop，配置描述列表用 `detail-options`。
- 分步表单默认使用 AntDV `Steps + 多 YssFormily`，不默认使用 `FormStep`。

## 标准代码骨架

```vue
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';

const onSubmit = async (values: Record<string, any>) => {
  await save(values);
};

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': {
        layout: 'horizontal',
        labelWidth: 100,
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
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '请输入' },
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

<template>
  <YssFormily :schema="schema" :scope="{ onSubmit }" />
</template>
```

### 表单布局基准

- 普通业务表单：`FormLayout { layout: 'horizontal', labelWidth: 120, labelAlign: 'right' }`，`FormGrid { maxColumns: 3, minColumns: 1, minWidth: 260 }`。
- 抽屉/弹窗表单：长 label 较多时用 `labelWidth: 140`，`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320 或 360 }`。
- 查询表单：字段少时用 `labelWidth: 100~120`，`FormGrid { maxColumns: 3 或 4, minColumns: 1, minWidth: 260~360 }`；查询/重置按钮放在表单外部的右下角按钮行。
- 不要为了复刻宽屏两列布局写 `minColumns: 2`；这会破坏组件库 demo 中默认的响应式收缩行为。
- 备注、说明、富文本、长输入框等横跨整行字段，在字段 `x-decorator-props` 上设置 `gridSpan`，例如两列表单使用 `gridSpan: 2`。

### 业务列表查询区固定模板

```typescript
const searchSchema: ISchema = {
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
          'x-component-props': {
            maxColumns: 4,
            minColumns: 1,
            minWidth: 260,
            columnGap: 16,
            rowGap: 0,
          },
          properties: {
            keyword: {
              type: 'string',
              title: '关键字',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': {
                placeholder: '请输入关键字',
                allowClear: true,
              },
            },
          },
        },
      },
    },
  },
};
```

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

> 只有纯 Formily 提交表单才把按钮放回 schema 内，例如 `AutoButtonGroup -> Submit/Reset`。

### 抽屉/弹窗表单模板

```typescript
const formSchema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': {
        layout: 'horizontal',
        labelWidth: 140,
        labelAlign: 'right',
      },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': {
            maxColumns: 2,
            minColumns: 1,
            minWidth: 360,
            columnGap: 24,
            rowGap: 16,
          },
          properties: {
            orgName: {
              type: 'string',
              title: '机构名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '请输入机构名称' },
            },
            remark: {
              type: 'string',
              title: '备注',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 2 },
              'x-component': 'Input.TextArea',
              'x-component-props': { placeholder: '请输入备注', rows: 4 },
            },
          },
        },
      },
    },
  },
};
```

## 关联 skill

- 基础表单：`../formily-foundation/SKILL.md`
- 联动副作用：`../formily-linkage-effects/SKILL.md`
- 模式与详情插槽：`../formily-mode-slot-detail/SKILL.md`
- 分步流程：`../formily-step-flow/SKILL.md`
- 完整示例：`../formily-foundation/references/examples.md`

## 交付检查清单

- [ ] 使用 `YssFormily`，模板名和 import 一致。
- [ ] 未生成旧式详情开关 prop。
- [ ] 未导入业务层 `@formily/antdv` UI 组件。
- [ ] Schema 层级完整：`FormLayout -> FormGrid -> 字段`，`Submit.onSubmit` 可触发校验。
- [ ] 所有横向表单已设置固定 `labelWidth` 和 `labelAlign: 'right'`。
- [ ] `FormGrid` 保持响应式，未用 `minColumns: maxColumns` 固定列数。
- [ ] 业务列表查询区的查询/重置按钮在外部 `.xxx__search-actions`，按钮行独占下一行并右对齐；缩窄后不会贴在第一行字段旁。
- [ ] 抽屉/弹窗表单 label 宽度统一、右对齐，窄屏可响应式换列，长字段已占满整行。
- [ ] 复杂联动已选择表达式、`x-reactions`、`scope` 或 `effects` 中合适的一种。

## 失败兜底策略

- 字段不显示时，先检查 `FormLayout -> FormGrid -> 字段` 层级。
- 提交不触发时，先检查 `Submit.x-component-props.onSubmit` 或外部 `formRef.submit()`。
- 查看态显示异常时，先检查 `mode=2`、`detail-options` 和 `detail-<path>` 插槽命名。
