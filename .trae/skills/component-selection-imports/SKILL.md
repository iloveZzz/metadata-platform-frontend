---
name: Component Selection Imports
description: 指导 YSS UI 业务页面、CRUD、列表页、表单页生成前先判定组件来源，优先从 @yss-ui/components、@yss-ui/hooks、@yss-ui/utils 复用，未封装组件才从 ant-design-vue 导入，避免编造未导出的 Y 前缀组件。
---

# Component Selection Imports Skill

## 触发条件

- 业务需求开始前需要决定组件导入来源。
- Agent 不确定组件是否有 `Y` 封装版本。
- 代码评审发现导入混乱、组件命名幻觉或错误前缀。

## 不适用场景

- 已明确组件来源且只做局部逻辑修复。
- 仅做文档或提交信息，不产出业务页面代码。
- 组件库内部开发（而非业务层应用开发）。

## 硬约束（禁止/必须）

- 组件信息源默认使用 `llms-full.txt`，上下文受限才降级 `llms.txt`。
- 可先读取 `../yss-ui-business-page-generation/references/component-map.md`、`hooks-map.md`、`utils-map.md` 作为本地速查。
- YSS 已封装组件必须从 `@yss-ui/components` 导入并使用 `Y` 前缀。
- 未封装组件才允许从 `ant-design-vue` 导入。
- YSS hooks 和工具函数必须优先从 `@yss-ui/hooks`、`@yss-ui/utils` 导入。
- 需求是可编辑表格时，`YEditTable` 已封装，必须优先从 `@yss-ui/components` 导入；禁止直接用 `Table/a-table` 手搓。
- 禁止编造组件（例如未导出的 Y 前缀弹窗、抽屉、输入框）。
- 业务层禁止导入 `@formily/antdv` 与 `@formily/antd*` UI 组件。

## 标准代码骨架

```typescript
// 1) 已封装组件
import {
  YTable,
  YEditTable,
  YButton,
  YCard,
  YssFormily,
} from '@yss-ui/components';
import type { YTableColumn, YEditTableColumn } from '@yss-ui/components';
import { useTableHeight, useLoading } from '@yss-ui/hooks';
import { formatDate, copyToClipboard } from '@yss-ui/utils';

// 2) 未封装组件
import { Modal, Drawer, message } from 'ant-design-vue';
```

```text
判定流程：
1. 先查 llms-full.txt 组件清单
2. 在清单中 => 用 Y 前缀导入
3. 不在清单中 => 从 ant-design-vue 导入
4. 若组件清单和需求冲突 => 查当前项目相近页面或组件源码，确认后再落代码
```

## 交付检查清单

- [ ] 关键组件都完成来源判定。
- [ ] 编辑表格场景已判定并优先使用 `YEditTable`。
- [ ] 无错误 `Y` 前缀组件名。
- [ ] Formily UI 导入边界正确。
- [ ] 导入列表可被 IDE 正常解析。
- [ ] 组件选择决策可追溯（可说明依据）。

## 失败兜底策略

- 组件来源不确定时，先用 `ant-design-vue` 安全落地并标注待确认。
- 出现导入冲突时，优先删掉猜测导入，按判定流程重建。
- 若 llms 文档暂不可达，先基于仓库已有业务代码就近复用导入模式。
