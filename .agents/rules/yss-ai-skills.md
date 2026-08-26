---
trigger: always_on
---

# YSS AI Skills Entry

本项目使用 YSS UI 业务页面开发规范。处理 Vue3 业务页面、CRUD、列表、表单、抽屉、YTable、YEditTable、YssFormily、YTree、API 对接任务时，必须先读取匹配的 SKILL.md，再写计划或代码。

## Available Skills

- api-integration: .agent/skills/api-integration/SKILL.md
- component-selection-imports: .agent/skills/component-selection-imports/SKILL.md
- file-export-download: .agent/skills/file-export-download/SKILL.md
- formily-foundation: .agent/skills/formily-foundation/SKILL.md
- formily-linkage-effects: .agent/skills/formily-linkage-effects/SKILL.md
- formily-mode-slot-detail: .agent/skills/formily-mode-slot-detail/SKILL.md
- formily-step-flow: .agent/skills/formily-step-flow/SKILL.md
- microapp-commit: .agent/skills/microapp-commit/SKILL.md
- page-form-module: .agent/skills/page-form-module/SKILL.md
- page-list-module: .agent/skills/page-list-module/SKILL.md
- page-module-development: .agent/skills/page-module-development/SKILL.md
- page-skeleton: .agent/skills/page-skeleton/SKILL.md
- prototype-page-acceptance: .agent/skills/prototype-page-acceptance/SKILL.md
- theme-token-usage: .agent/skills/theme-token-usage/SKILL.md
- use-table-height: .agent/skills/use-table-height/SKILL.md
- use-tree-height: .agent/skills/use-tree-height/SKILL.md
- vue3-best-practices: .agent/skills/vue3-best-practices/SKILL.md
- yedit-table-usage: .agent/skills/yedit-table-usage/SKILL.md
- yss-formily: .agent/skills/yss-formily/SKILL.md
- yss-ui-business-page-generation: .agent/skills/yss-ui-business-page-generation/SKILL.md
- ytable-usage: .agent/skills/ytable-usage/SKILL.md
- ytree-usage: .agent/skills/ytree-usage/SKILL.md

## Mandatory Workflow

1. 页面/CRUD/列表/表单任务：先读 `.agent/skills/yss-ui-business-page-generation/SKILL.md`。
2. 新增或修改页面、组件、Less、内联样式、TS 渲染配置、SVG 色值：必须读 `.agent/skills/theme-token-usage/SKILL.md`。
3. 导出、报表、模板、附件、Excel、CSV、PDF、ZIP、Blob 下载任务：必须读 `.agent/skills/file-export-download/SKILL.md`。
4. 列表或表格任务：同时读 `.agent/skills/page-list-module/SKILL.md`、`.agent/skills/ytable-usage/SKILL.md`、`.agent/skills/use-table-height/SKILL.md`。
5. 新增/编辑/查看/抽屉表单：同时读 `.agent/skills/yss-formily/SKILL.md`、`.agent/skills/page-form-module/SKILL.md`。
6. 可编辑表格、扩展属性、添加行/删除行：必须读 `.agent/skills/yedit-table-usage/SKILL.md`。
7. 用户给原型截图或旧项目路径：必须读 `.agent/skills/prototype-page-acceptance/SKILL.md`，先生成验收清单，再实现。

## Hard Stops

- 禁止使用未在文档中确认的 YTable API，例如 `request`、`search-params`、`refresh`、`actionConfig.actions`。
- 标准列表必须使用 `:data`、`:columns`、`:loading`、`pageable`、`v-model:pagination`、`@page-change`。
- 表格工具栏必须使用 `:toolbar-config="{ custom: true }"`，新增/导入等主按钮放 `#toolbar-right`。
- 查询表单按钮必须在 YssFormily schema 内使用 `AutoButtonGroup + Submit + Reset`。
- 所有 YssFormily 横向业务表单必须使用 `FormLayout(labelWidth, labelAlign: 'right') -> FormGrid -> 字段`，不得省略固定 label 宽度和右对齐。
- FormGrid 必须保持响应式：默认 `minColumns: 1`，通过 `maxColumns`、`minWidth` 控制宽屏列数；禁止 `minColumns` 等于 `maxColumns` 固定列数，除非用户明确要求不响应式。
- 抽屉/弹窗编辑表单默认 `labelWidth: 140`、`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320~360 }`；备注/长文本字段必须用 `gridSpan` 占满整行。
- 可编辑表格必须优先使用 `YEditTable`，禁止用 `a-table` 手搓。
- 抽屉表单必须有响应式宽度，查看态不显示保存按钮。
- 页面和组件禁止硬编码品牌色及 hover/active/selected/focus 色阶；主色透明态必须从真实动态 Token 派生，不得依赖未同步变量的固定色 fallback。
- 导出下载必须优先调用 `handleBlobResponse(res.data, res.headers)`；生成方法缺少 Blob 配置时，第二参数必须传 `{ responseType: 'blob' }`，禁止手改 Orval 生成文件。
- 有截图/旧项目参考时，交付前必须逐项对照查询区、表格工具栏、分页高度、抽屉、label、字段控件类型。
