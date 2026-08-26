---
name: Formily Mode Slot Detail
description: 指导 YssFormily 新增/编辑/查看模式、mode 0/1/2、详情 Descriptions 渲染、detail-options 和 Slot/detail 插槽渲染。
---

# Formily Mode Slot Detail Skill

## 触发条件

- 需要 `mode: 0/1/2` 的新增、编辑、查看三态切换。
- 查看态需要 `Descriptions` 风格渲染与 `detail-*` 插槽。
- 同字段需要编辑态 Slot 与查看态 detail slot 双通道渲染。

## 不适用场景

- 基础表单骨架：使用 `../formily-foundation/SKILL.md`。
- 复杂联动与副作用：使用 `../formily-linkage-effects/SKILL.md`。
- 分步流程：使用 `../formily-step-flow/SKILL.md`。

## 硬约束（禁止/必须）

- mode 语义固定：`0=新增`、`1=编辑`、`2=查看`。
- `mode=2` 会进入查看态 Descriptions 渲染；源码没有额外的详情开关 prop，禁止生成旧式详情开关写法。
- 描述列表配置使用 `:detail-options="{ ... }"`。
- 查看态定制内容必须使用 `#detail-<path>`，`.` 替换为 `-`。
- 编辑态定制内容必须使用 schema `x-component: 'Slot'` + `name`。
- 切换 mode 必须加 `:key="mode"` 避免状态残留。
- 分步需求默认走 `formily-step-flow`，不在本 skill 中给 `FormStep` 默认方案。

## 标准代码骨架

```vue
<YssFormily
  :key="mode"
  :schema="schema"
  :initial-values="initialValues"
  :mode="mode"
  :detail-options="{ bordered: true, maxColumns: 3 }"
>
  <template #sql="{ value, onChange }">
    <YMonaco :value="value" language="sql" @change="onChange" />
  </template>

  <template #detail-user-email="{ value }">
    <a :href="`mailto:${value}`">{{ value }}</a>
  </template>
</YssFormily>
```

```typescript
const schema = {
  properties: {
    user: {
      properties: {
        email: {
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'Input',
        },
      },
    },
    sql: {
      type: 'string',
      'x-decorator': 'FormItem',
      'x-component': 'Slot',
      'x-component-props': { name: 'sql', params: ['field'] },
    },
  },
};
```

## 交付检查清单

- [ ] mode 语义、默认值与切换行为正确。
- [ ] 未生成不存在的详情开关 prop。
- [ ] 查看态插槽命名符合 `detail-<path>` 规则。
- [ ] 编辑 Slot 名称与模板插槽名一致。
- [ ] `:key="mode"` 已配置，切换后无脏状态。
- [ ] 无分步 `FormStep` 默认实现。

## 失败兜底策略

- 查看态插槽不生效时，先核对字段路径映射与 `detail-` 命名。
- 编辑态插槽不生效时，先核对 `x-component-props.name` 与模板名是否一致。
- 模式切换错乱时，先补 `:key="mode"` 再排查其他状态源。
