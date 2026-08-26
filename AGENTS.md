# AGENTS.md — Vue3 微应用模版开发与重构指南

> 本仓库为 **Vue3 + TypeScript + Vite + YSS UI + Orval** 标准微应用脚手架模版。
> AI Agent 或开发者在基于本模版新建子应用或开发新业务页面时，必须遵守本文中的工程规范与硬性约束。

---

## 1. 项目定位与技术栈

| 维度          | 选用技术 / 规范                                                                |
| :------------ | :----------------------------------------------------------------------------- |
| **核心框架**  | Vue 3.x (Composition API `<script setup lang="ts">`) + TypeScript              |
| **构建工具**  | Vite                                                                           |
| **UI 组件库** | **YSS UI 优先** (`@yss-ui/components` / `@yss-ui/hooks`) + Ant Design Vue 补齐 |
| **表单方案**  | `YssFormily` + JSON Schema 表单驱动                                            |
| **表格方案**  | `YTable` + `:action-config` + `@yss-ui/hooks` 自适应高度 (`useTableHeight`)    |
| **接口方案**  | OpenAPI / Orval 自动生成 API + `mutator.ts` 统一拦截封装                       |
| **样式规范**  | Less + 模块化 `style.less`                                                     |

---

## 2. 页面与组件标准目录骨架

每个业务页面模块均须遵循**关注点分离**原则组织目录（主组件 `index.vue` 代码不得超过 **150 行**）：

```text
packages/src/views/{ModuleName}/
├── index.vue                 # 主组件：仅负责组合 Hooks 和渲染视图模板 (≤150行)
├── type.ts                   # 模块私有类型定义 (优先复用 Orval 生成类型)
├── constant.ts               # 表格列配置、createActionConfig、枚举映射、静态 Formily Schema
├── hooks/                    # 业务逻辑 Composables (按职责拆分)
│   ├── use{Module}List.ts    # 列表查询、远程分页、表格高度、删除/操作逻辑
│   └── use{Module}Form.ts    # 弹窗/抽屉表单逻辑、提交、回填
├── components/               # 页面私有弹窗/抽屉/复杂组件
└── style.less                # 模块独立样式文件
```

**Vue 单文件组件 (SFC) 顺序要求**：

1. 第一部分：`<script setup lang="ts">` - 逻辑代码
2. 第二部分：`<template>` - 模板结构
3. 第三部分：`<style scoped lang="less">` - 样式定义 (`@import './style.less';`)

---

## 3. 核心工程硬约束 (Mandatory Rules)

### 3.1 组件选型原则

- ✅ 优先从 `@yss-ui/components`、`@yss-ui/hooks`、`@yss-ui/utils` 导入组件和 Hook。
- ✅ 封装库未提供时，才从 `ant-design-vue` 具名导入。
- ❌ **严禁臆造不存在的 `Y` 前缀组件**。

### 3.2 表格操作列配置 (`action-config`) 规范 (Critical)

- ✅ **优先使用 `action-config`**：AI 在生成表格操作列代码时，**必须优先使用 `YTable` 的 `:action-config` 配置项**（或在 `constant.ts` 中通过工厂函数 `createActionConfig` 统一导出），禁止手写模板插槽 `<template #action>` 手搓操作按钮。
- ✅ **操作列示例**：
  ```typescript
  // constant.ts
  export const createActionConfig = (handlers: {
    onEdit: (row: any) => void;
    onDelete: (row: any) => void;
  }) => ({
    actions: [
      { key: 'edit', label: '编辑', onClick: row => handlers.onEdit(row) },
      {
        key: 'delete',
        label: '删除',
        popconfirm: { title: '确定删除该记录吗？' },
        onClick: row => handlers.onDelete(row),
      },
    ],
  });
  ```
  ```vue
  <!-- index.vue -->
  <YTable :data="dataList" :columns="columns" :action-config="actionConfig" />
  ```

### 3.3 Formily 表单约束

- ✅ **表单**：统一使用 `YssFormily` 传 JSON Schema 驱动，禁止在业务视图中直接导入使用 `@formily/antdv` UI 组件。
- ✅ **查询区**：YssFormily 仅渲染表单项，查询/重置按钮置于外部右侧或右下角。

### 3.4 接口响应与错误处理规范 (Critical)

底层 `mutator.ts` 响应拦截器已统一处理网络错误与 `success === false` 的业务错误（自动调用 `message.error` 提示并抛出 `Promise.reject` 中断）。因此在业务 Hooks 内：

- ❌ **禁止**在接口响应处编写 `else { message.error(...) }` 或在 `catch` 块中重复调用 `message.error`；
- ❌ **禁止**包裹冗余的 `if (res?.success)` / `if (res?.success && res?.data)` 判断（`await` 解析成功即保证成功）；
- ✅ 列表/详情查询直接写 `dataList.value = res?.data ?? []` / `res?.data ?? {}` 做缺省兜底；操作成功后直接调用 `message.success(...)` 和刷新列表。

### 3.5 特殊接口自定义请求配置 (`options`)

Orval 已开启 `options: true`，生成的每个 API 函数（如 `createUser(data, options)`）均支持第二个可选参数透传配置：

- **自定义错误处理**：若某接口需跳过全局错误 Toast，传入 `{ skipBusinessError: true }` 并在 `catch` 块中编写自定义错误逻辑；
- **文件导出/下载**：传入 `{ responseType: 'blob' }`；
- **其他 Axios 配置**：支持透传 `headers`、`timeout`、`signal` (用于 `AbortController` 取消请求) 等。

### 3.6 大数字与精度防丢失 (json-bigint)

- 接口返回的所有数字类型字段（雪花 ID、长整型主键、大金额等）在底层已通过 `json-bigint` 全局解析为**字符串**。
- ❌ **凡是涉及 number 类型的字段，一律禁止做任何数字转换**（禁止 `Number()`、`parseInt`、`+x`、`*1`、`~~x` 等）；
- ✅ 页面显示、回传接口、ID 相等比较时，**一律直接透传和使用原始字符串**。

### 3.7 主题 Token 与动态换肤 (Critical)

- ✅ 新增或修改页面、公共组件、`.vue`、`style.less`、内联样式、TS 渲染配置、SVG 色值前，必须读取 `.agent/skills/theme-token-usage/SKILL.md`。
- ✅ 先检查 `packages/src/styles/variables.less`、`packages/src/store/theme.ts` 和 `packages/src/config/themes.ts`，确认 Token 已声明且会被运行时主题同步。
- ✅ 主色、交互态、状态色、中性色、背景和边框必须使用项目语义 Token，例如 `--primary-color`、`--primary-color-hover`、`--primary-color-active`、`--text-color`、`--bg-color-container`、`--border-color`。
- ✅ 主色透明背景、focus ring 和阴影使用 `color-mix(in srgb, var(--primary-color, #3371ff) 10%, transparent)` 动态派生。
- ❌ 业务消费代码禁止硬编码品牌色及其 hover/active/selected/focus 色阶，包括 `#hex`、`rgb/rgba/hsl`、渐变和阴影。
- ❌ 禁止仅因变量在 `:root` 声明就认定它可换肤；必须确认主题同步链路会更新它。
- ✅ 交付前至少使用默认主色和一个差异明显的主色验证；项目支持暗色模式时必须同时验收文本、容器背景和边框。

---

## 4. 标准开发工作流

当要求 AI 或开发者新增功能页面时，须按以下顺序执行：

1. **规则与主题检查**：读取匹配的业务 Skill；涉及视觉样式时同时读取 `theme-token-usage`，确认主题源和动态 Token。
2. **接口生成**：若有新接口，先在 `openapi/openapi.json` 更新规范，执行 `pnpm generate:api` 自动产出 Orval 类型与 API 函数。
3. **定义列与操作配置**：在 `constant.ts` 中配置表格列 `columns`、操作列配置 `createActionConfig` 和查询 Schema。
4. **编写逻辑 Composable**：
   - 在 `hooks/useXxxList.ts` 中封装 `pageApi` 调用、`dataList` 赋值、分页及自适应高度 `useTableHeight`；
   - 在 `hooks/useXxxForm.ts` 中封装新增/编辑/提交及 `onSuccess` 回调。
5. **编排主视图**：在 `index.vue` 组合上述 Hooks，传递 `:action-config` 并渲染视图模板。
6. **主题验收**：扫描本次变更中的硬编码色值，并切换至少两种主题色验证所有交互态。

---

## 5. 禁止事项清单

- ❌ 禁止手搓表格操作列插槽（优先使用 `YTable` 的 `:action-config` 配置项）。
- ❌ 禁止把大型业务逻辑全部堆砌在单个 `.vue` 文件内（超出 150 行必须按规范拆分）。
- ❌ 禁止手写与 Orval 生成产物重复的 API 函数或 DTO 类型接口。
- ❌ 禁止在 `await` 接口成功后编写 `if (res?.success)` 冗余逻辑包裹或重复 `message.error`。
- ❌ 禁止对接口返回的 number/ID 字段做 `Number()` 强制类型转换。
- ❌ 禁止绕过 YSS UI 规则使用 `a-table` 手搓列表或表格。
- ❌ 禁止在业务页面或公共组件中硬编码品牌色及交互态色阶，或使用未被运行时同步的“伪主题变量”。

---

## 6. 一句话原则

**契约对齐 OpenAPI；表格操作列优先 `:action-config`；逻辑拆分 hook；视觉样式消费动态主题 Token；数据防御兜底，大数字透传字符串，错误响应信赖拦截器。**
