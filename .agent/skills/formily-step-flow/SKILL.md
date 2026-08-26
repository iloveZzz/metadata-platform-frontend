---
name: Formily Step Flow
description: 指导 YSS UI 分步表单、流程表单、Step Form 默认采用 Ant Design Vue Steps + 多 YssFormily 实例实现独立校验、跨步数据聚合和最终提交。
---

# Formily Step Flow Skill

## 触发条件

- 需求是分步表单（Step Form）或流程化录入。
- 每一步有独立校验与前进/后退控制。
- 需要步骤切换与最终提交编排。

## 不适用场景

- 普通单页表单：使用 `../formily-foundation/SKILL.md`。
- 仅字段联动：使用 `../formily-linkage-effects/SKILL.md`。
- 仅查看态插槽：使用 `../formily-mode-slot-detail/SKILL.md`。

## 硬约束（禁止/必须）

- 默认方案必须是 Ant Design `Steps` + 多 schema / 多 `YssFormily` 实例。
- 业务层禁止把 `@formily/antdv FormStep` 作为默认方案；只有维护旧代码或用户明确指定 FormStep 时才可使用。
- 每步必须单独触发 `submit()` 校验再允许进入下一步。
- 步骤状态必须可回退，且跨步数据有统一状态源。

## 标准代码骨架

```vue
<template>
  <Steps :current="currentStep">
    <Step title="基础信息" />
    <Step title="策略配置" />
    <Step title="确认提交" />
  </Steps>

  <YssFormily
    v-if="currentStep === 0"
    ref="step1Ref"
    :schema="step1Schema"
    v-model="formData.step1"
  />
  <YssFormily
    v-if="currentStep === 1"
    ref="step2Ref"
    :schema="step2Schema"
    v-model="formData.step2"
  />
  <YssFormily
    v-if="currentStep === 2"
    :schema="confirmSchema"
    v-model="formData.step3"
    :mode="2"
    :detail-options="{ bordered: true, maxColumns: 2 }"
  />
</template>
```

```typescript
const next = async () => {
  const refs = [step1Ref, step2Ref];
  const ok = await refs[currentStep.value]?.value?.submit?.();
  if (ok !== false) currentStep.value += 1;
};
```

## 交付检查清单

- [ ] 使用 `Steps + 多 YssFormily` 实现步骤编排。
- [ ] 每步前进前都执行当前步校验。
- [ ] 数据在步骤切换后可保留和回显。
- [ ] 最终提交聚合全部步骤数据。
- [ ] 业务层未使用 `@formily/antdv FormStep` 作为默认实现。

## 失败兜底策略

- 校验串行复杂时，先将每步封装为独立 `useStepXxx` hook。
- 状态串联出错时，先收敛为单一 `reactive` 数据源再分发到每步。
- 若步骤过多导致维护困难，优先按业务阶段拆子组件。
