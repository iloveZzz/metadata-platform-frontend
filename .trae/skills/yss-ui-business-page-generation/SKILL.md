---
name: yss-ui-business-page-generation
description: 指导生成 Vue3 YSS UI 业务页面、CRUD 模块、列表页、表单页、详情页、左树右表、弹窗抽屉流程和微应用管理页面，强制优先复用 @yss-ui/components、@yss-ui/hooks 与 @yss-ui/utils。
---

# YSS UI 业务页面生成 Skill

## 触发条件

- 用户要求生成或改造业务页面、CRUD 模块、列表页、表单页、详情页、左树右表、树表联动页面。
- 页面涉及 `YTable`、`YTree`、`YssFormily`、`YButton`、`YCard`、`YSplitPane`、`YConditionBuilder` 等 YSS UI 组件。
- 需要让 AI 优先复用 YSS UI 组件、hooks、utils，而不是直接使用 Ant Design Vue 或重复造工具函数。
- 用户提供旧项目路径、原型截图、目标截图或要求“照旧项目/照原型还原”。

## 不适用场景

- 只修改组件库内部组件实现：使用 `../component-development/SKILL.md`。
- 只写文档、提交信息或发版流程，不生成业务页面代码。
- 用户明确要求不用 YSS UI 组件库。

## 必读参考

- 组件来源速查：`./references/component-map.md`
- Hooks 速查：`./references/hooks-map.md`
- Utils 速查：`./references/utils-map.md`
- 表格细节：`../ytable-usage/SKILL.md`
- 编辑表格细节：`../yedit-table-usage/SKILL.md`
- 树形细节：`../ytree-usage/SKILL.md`
- 表单细节：`../yss-formily/SKILL.md`
- 原型还原验收：`../prototype-page-acceptance/SKILL.md`
- 主题 Token 与换肤：`../theme-token-usage/SKILL.md`
- 文件导出下载：`../file-export-download/SKILL.md`

## 硬约束（禁止/必须）

- 生成页面前必须先判定组件来源：YSS UI 已封装的组件从 `@yss-ui/components` 导入。
- 表单默认使用 `YssFormily + JSON Schema`，业务代码禁止导入 `@formily/antdv` UI 组件。
- 所有 `YssFormily` 横向业务表单必须显式设置固定 `labelWidth` 与 `labelAlign: 'right'`，并使用 `FormLayout -> FormGrid -> 字段` 响应式结构；禁止用 `minColumns: maxColumns` 固定列数破坏响应式。
- 标准列表/CRUD 查询区必须采用 `YCard -> search-content -> search-form(YssFormily) + search-actions(YButton 查询/重置)` 的纵向布局；按钮行独占下一行并右对齐，缩放或窄屏字段换行后仍位于搜索卡片右下角。
- 查询区禁止横向放“表单 + 按钮”并用大 `gap`、`align-items: flex-start`、`padding-top` 硬调按钮位置。
- 抽屉/弹窗编辑表单默认 `labelWidth: 140`、`FormGrid { maxColumns: 2, minColumns: 1, minWidth: 320~360 }`，备注/长文本字段用 `gridSpan` 占满整行。
- 表格默认使用 `YTable`；远程分页使用 `pageable + pagination.remote + @page-change`。
- 编辑表格默认使用 `YEditTable`；需求出现“编辑表格/添加行/删除行/行内下拉”时禁止直接用 `a-table` 手搓。
- 左树右表优先使用 `YSplitPane + YCard + YTree + YTable`，高度使用 `useTreeHeight/useTableHeight`。
- 标准列表必须使用 `YTable` 真实 API：`:data`、`:columns`、`:loading`、`pageable`、`v-model:pagination`、`@page-change`；禁止臆造 `request/search-params/refresh` 等未在文档出现的 API。
- 有表格列设置或工具按钮时，必须传 `:toolbar-config="{ custom: true }"`，新增/导入等主操作默认放 `#toolbar-right`，不得脱离工具栏放到表格左上角。
- 删除确认默认使用 `YTable actionConfig.isConfirm` 或 AntDV `Popconfirm` 类气泡确认，禁止默认使用居中 `Modal.confirm`。
- 样式抽离到 `style.less`，在 SFC 中使用 `<style scoped lang="less">@import './style.less';</style>`。
- 页面、公共组件、内联样式、TS 渲染配置和 SVG 必须遵循 `theme-token-usage`；禁止硬编码品牌色及 hover/active/selected/focus 色阶，主色透明态必须由真实动态 Token 派生。
- 页面包含导出、报表、模板或附件下载时必须遵循 `file-export-download`，使用 `handleBlobResponse(res.data, res.headers)`，并检查生成方法是否已包含 `responseType: 'blob'`。
- 若用户给出旧项目路径或截图，开发前必须先提取 UI/交互验收清单；交付前逐项对照，不允许只实现字段和接口。

## 标准代码骨架

```text
src/views/{module-name}/
├── index.vue
├── type.ts
├── constant.ts
├── hooks/
│   ├── use{Module}List.ts
│   └── use{Module}Form.ts
├── components/
│   ├── {Module}Table.vue
│   └── {Module}Modal.vue
└── style.less
```

## 生成流程

1. 读取本 skill 的三个 reference，确认组件、hooks、utils 是否已有能力；不确定时再查 `llms-full.txt`。
2. 读取 `theme-token-usage`，检查项目真实主题变量与运行时同步链路。
3. 若有截图或旧项目路径，先按 `prototype-page-acceptance` 提取布局、按钮位置、表格高度、抽屉宽度、字段控件类型等验收项。
4. 按需求类型加载细分 skill：列表读 `page-list-module` 和 `ytable-usage`；表单读 `yss-formily`；编辑表格读 `yedit-table-usage`；树读 `ytree-usage`；导出下载读 `file-export-download`。
5. 先设计 `type.ts`、`constant.ts`、hooks，再写 `index.vue` 组合视图。
6. 对 API 请求使用 Orval 生成类型和接口，在 hooks 内封装 loading、异常、分页映射。
7. 交付前检查导入来源、真实组件 API、分页字段、Formily schema 层级、主题 Token、查询按钮右下角布局、表格工具栏、样式作用域、删除确认和原型对照清单。

## 最小组合示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { YButton, YCard, YTable } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { TABLE_COLUMNS } from './constant';
import { useRuleList } from './hooks/useRuleList';

const tableAreaRef = ref<HTMLDivElement>();
const { tableHeight, isReady } = useTableHeight(tableAreaRef, {
  withPagination: true,
  withToolbar: true,
});
const { loading, dataList, pagination, handlePageChange } = useRuleList();
</script>

<template>
  <YCard class="page-card">
    <div ref="tableAreaRef" class="table-area">
      <YTable
        v-if="isReady"
        :height="tableHeight"
        :data="dataList"
        :columns="TABLE_COLUMNS"
        :loading="loading"
        :toolbar-config="{ custom: true }"
        pageable
        v-model:pagination="pagination"
        @page-change="handlePageChange"
      >
        <template #toolbar-right>
          <YButton type="primary" @click="openCreate">新增</YButton>
        </template>
      </YTable>
    </div>
  </YCard>
</template>

<style scoped lang="less">
@import './style.less';
</style>
```

## 交付检查清单

- [ ] 已优先复用 `@yss-ui/components`、`@yss-ui/hooks`、`@yss-ui/utils`。
- [ ] 未出现未导出的 Y 前缀组件。
- [ ] 未导入 `@formily/antd-v3`、`@formily/antd` 或业务层 `@formily/antdv` UI 组件。
- [ ] `YTable` 分页字段为 `current/pageSize/total`。
- [ ] `YTable` 未使用未文档化的 `request/search-params/refresh` API。
- [ ] 主表格如有列设置/工具按钮，已配置 `toolbar-config.custom`，主操作在 `#toolbar-right`。
- [ ] 编辑表格场景使用 `YEditTable`，下拉可输入/多选等能力通过列 `props` 配置。
- [ ] `YssFormily` 未使用不存在的详情开关 prop，表单 label 固定宽度右对齐，`FormGrid` 保持响应式。
- [ ] 查询区按钮在外部 `.xxx__search-actions` 右对齐独占一行，缩窄后仍处于搜索卡片右下角。
- [ ] 主题色、状态色、中性色及交互态使用动态 Token；未依赖未同步变量的固定色 fallback。
- [ ] 导出下载使用 `handleBlobResponse`，且 Blob 配置、响应头、loading 与错误链路已验证。
- [ ] 若有截图或旧项目参考，已逐项对照布局、按钮、表格高度、抽屉响应式和字段控件类型。

## 失败兜底策略

- 组件来源不确定时，先查 `component-map.md` 和 `llms-full.txt`，仍不确定则回退 Ant Design Vue 原生组件。
- 页面复杂度过高时，先落地最小列表/表单闭环，再拆分私有组件和 hooks。
- API 契约不稳定时，先在 hook 内做最小字段映射，不把兼容逻辑散落到模板。
