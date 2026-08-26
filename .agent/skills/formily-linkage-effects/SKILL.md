---
name: Formily Linkage Effects
description: 指导 YssFormily 联动与副作用实现，覆盖 reactions、scope、effects 与失败兜底。
---

# Formily Linkage Effects Skill

## 触发条件

- 需要字段联动（A 影响 B）、动态显隐/禁用、级联下拉。
- 需要 `createForm + effects`、`onFieldValueChange`、`onFormSubmitFailed`。
- 需要统一失败提示、跨字段状态清理或远程选项刷新。

## 不适用场景

- 纯基础字段与提交：使用 `../formily-foundation/SKILL.md`。
- 详情态渲染和 mode 切换：使用 `../formily-mode-slot-detail/SKILL.md`。
- 分步流程：使用 `../formily-step-flow/SKILL.md`。

## 硬约束（禁止/必须）

- 必须按复杂度选机制：表达式 < `x-reactions` < `scope` < `effects`。
- 仅显隐/禁用优先用表达式，不得上来就写 `effects`。
- 需要改其他字段状态时，必须使用 `form.setFieldState` 或 `x-reactions`。
- 需要异步拉取选项时，必须处理旧值清理和空值回退。
- 必须保留统一提交失败兜底（`onFormSubmitFailed`）。
- 分步需求默认走 `formily-step-flow`，不在此 skill 中给 `FormStep` 默认方案。

## 标准代码骨架

```typescript
import {
  createForm,
  onFieldValueChange,
  onFormSubmitFailed,
} from '@formily/core';

const form = createForm({
  effects() {
    onFieldValueChange('province', field => {
      const province = field.value;
      form.setFieldState('city', state => {
        state.dataSource = getCityOptions(province);
        if (!province) state.value = undefined;
      });
    });

    onFormSubmitFailed(() => {
      const list = form.queryFeedbacks?.({ type: 'error' }) || [];
      message.error(list[0]?.messages?.[0] || '请检查表单');
    });
  },
});

const schema = {
  properties: {
    city: {
      'x-reactions': (field: any) => {
        const province = field.query('province').get('value');
        field.dataSource = getCityOptions(province);
      },
    },
    type: {
      'x-component-props': {
        onChange: '{{ onTypeChange }}',
      },
    },
  },
};
```

## 交付检查清单

- [ ] 已说明为何选择表达式 / reactions / scope / effects。
- [ ] 字段切换后旧值和选项已清理。
- [ ] 至少有一个提交失败兜底策略。
- [ ] 无 DOM hack、无无意义 `setTimeout`。
- [ ] 未把分步逻辑塞入本 skill。

## 失败兜底策略

- 如果 `x-reactions` 失效，先校验字段路径和 schema 实际层级。
- 如果数据源更新但 UI 不刷新，改用 `form.setFieldState` 强制状态更新。
- 如果错误提示缺失，优先补 `onFormSubmitFailed`，不要在每个按钮分散处理。
