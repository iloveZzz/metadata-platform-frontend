---
name: Page Form Module
description: 指导实现 YSS UI 标准新增、编辑、查看表单模块，覆盖 YssFormily Schema、回填、校验、提交、mode 0/1/2 和列表刷新闭环。
---

# Page Form Module Skill

## 触发条件

- 需求是新增/编辑/查看表单模块（页面内或弹窗内）。
- 需要 schema 表单、校验、提交、回填和模式切换。
- 需要和列表页联动（提交成功后刷新列表）。

## 不适用场景

- 页面只有只读展示，无交互提交。
- 需求核心是列表结构，不是表单行为。
- 分步表单需求：改用 `../formily-step-flow/SKILL.md`。

## 硬约束（禁止/必须）

- 基础表单必须遵循 `../formily-foundation/SKILL.md`。
- 有联动副作用必须遵循 `../formily-linkage-effects/SKILL.md`。
- 模式和详情渲染必须遵循 `../formily-mode-slot-detail/SKILL.md`。
- 提交前必须触发 `formRef.submit()` 或 `Submit.onSubmit` 校验链路。
- 表单状态（open/mode/id/loading）必须收敛在单一 hook。
- 抽屉表单默认使用响应式宽度：`:width="drawerWidth"`，宽屏不超过业务所需最大值，窄屏不超过 `90vw`。
- 新增/编辑模式用 `YssFormily :mode="mode"`；查看态 `mode=2` 不展示保存按钮。
- 抽屉基础表单必须设置 `FormLayout` 的 `labelWidth` 与 `labelAlign: 'right'`，常规业务抽屉默认 `labelWidth: 140`。
- 抽屉表单的 `FormGrid` 必须响应式：默认 `maxColumns: 2`、`minColumns: 1`、`minWidth: 320~360`，禁止用 `minColumns: 2` 固定两列。
- 备注、说明、长文本等字段必须通过 `x-decorator-props.gridSpan` 跨满整行，两列布局通常设置 `gridSpan: 2`。
- 当表单组件（`YssFormily`）作为默认插槽放入 `a-modal` 弹窗或 `a-drawer` 抽屉等初始隐藏的容器中时，**必须在 `YssFormily` 上显式配置 `v-if` 条件渲染（如 `v-if="formVisible"`）**。这样能确保组件在弹窗完全展开、获取到真实容器宽度后再行挂载，防止栅格系统由于测量宽度为 0 而退化成单列布局，并在关闭弹窗时彻底销毁回收状态（防止残留表单脏数据/错误提示闪现）。
- 编辑/查看回填用的 id 以及提交时回传的 number 字段，禁止用 `Number()`/`parseInt`/`+x`/`*1`/`~~` 转换，一律按接口返回的字符串透传（`currentId` 用 `ref<string>()`，不要 `ref<number>()`）；id 比较用字符串相等。底层 json-bigint 已存为字符串保精度，详见 `../api-integration/SKILL.md`「大数字与精度」。

## 标准代码骨架

```typescript
export function useRuleForm(onSuccess: () => void) {
  const open = ref(false);
  const mode = ref<0 | 1 | 2>(0);
  const currentId = ref<string>();
  const formRef = ref<any>();

  const submit = async () => {
    const values = await formRef.value?.submit?.();
    if (!values) return;
    await saveRule(values);
    open.value = false;
    onSuccess();
  };

  return { open, mode, currentId, formRef, submit };
}
```

```vue
<YssFormily
  ref="formRef"
  :key="mode"
  :schema="schema"
  :mode="mode"
  :detail-options="{ bordered: true, maxColumns: 3 }"
/>
```

```typescript
const drawerFormLayout = {
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
        // fields
      },
    },
  },
};
```

## 交付检查清单

- [ ] 模式语义（0/1/2）正确且切换稳定。
- [ ] 提交链路触发校验并处理 loading。
- [ ] 回填、清空、关闭弹窗流程一致。
- [ ] 回填/提交的 id 等 number 字段保持字符串透传，未被 `Number()`/`parseInt`/`+x` 转换。
- [ ] 成功后回调列表刷新（或上层回调）。
- [ ] 抽屉宽度响应式，窄屏不溢出。
- [ ] label 统一宽度右对齐，FormGrid 保持 2 列到 1 列响应式，查看态不显示保存按钮。
- [ ] 长字段已用 `gridSpan` 占满整行。
- [ ] 导入边界正确，无 `@formily/antdv` 业务 UI 依赖。

## 失败兜底策略

- 提交无响应时，先检查 `submit()` 是否被实际调用。
- 编辑回填异常时，先核对字段路径与后端数据映射。
- 表单过于复杂时，优先拆 schema 生成函数与提交逻辑 hook。
