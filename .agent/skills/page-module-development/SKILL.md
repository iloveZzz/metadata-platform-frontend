---
name: Page Module Development
description: 兼容旧项目的页面模块开发入口；当用户要求生成 Vue3 微应用业务页面、CRUD、列表页、表单页、树表页面、YSS UI 页面模块时使用，并转向 YSS UI Business Page Generation 规则。
---

# 页面模块开发 Skill

此 skill 保留旧项目触发名。新页面开发以 `../yss-ui-business-page-generation/SKILL.md` 为主规则。

## 触发条件

- 用户使用旧说法要求“页面模块开发”“生成页面模块”“业务模块开发”。
- 需要生成 CRUD、列表、表单、详情、左树右表等 YSS UI 业务页面。
- 旧项目中仍引用 `page-module-development` skill 名称。

## 不适用场景

- 组件库内部组件开发：使用 `../component-development/SKILL.md`。
- 只处理提交、发版、文档，不生成业务页面代码。
- 仅修复某个局部表格或表单问题，可直接使用对应细分 skill。

## 硬约束（禁止/必须）

- 先读取 `../yss-ui-business-page-generation/SKILL.md`。
- 列表页继续读取 `../page-list-module/SKILL.md` 和 `../ytable-usage/SKILL.md`。
- 表单页继续读取 `../yss-formily/SKILL.md`。
- 左树右表继续读取 `../ytree-usage/SKILL.md`、`../use-tree-height/SKILL.md`、`../use-table-height/SKILL.md`。

## 标准代码骨架

```text
src/views/{module-name}/
├── index.vue
├── type.ts
├── constant.ts
├── hooks/
├── components/
└── style.less
```

## 交付检查清单

- [ ] 优先使用 `@yss-ui/components`、`@yss-ui/hooks`、`@yss-ui/utils`。
- [ ] 目录结构包含 `index.vue`、`type.ts`、`constant.ts`、`hooks/`、`components/`、`style.less`。
- [ ] 主组件只做编排，业务逻辑进入 hooks。
- [ ] 表格分页、表单查看态、高度 hook 都符合真实 API。

## 失败兜底策略

- 需求范围不清时，先按 `yss-ui-business-page-generation` 落地最小页面骨架。
- 表格、树、表单细节冲突时，以对应细分 skill 为准。
- 发现旧示例和源码 API 不一致时，以 `llms-full.txt` 和源码导出为准。
