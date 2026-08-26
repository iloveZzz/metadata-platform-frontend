---
name: Microapp Commit
description: 指导微应用仓库生成 Conventional Commits 提交信息并正确选择 scope。
---

# Microapp Commit Skill

## 触发条件

- 用户要求提交微应用代码或生成提交信息。
- 需要根据改动文件推断 commit type 与 scope。
- 需要确保提交说明覆盖真实业务改动。

## 不适用场景

- 当前仓库是组件库发版流程：使用 `../commit-linting/SKILL.md`。
- 仅请求代码实现，不涉及 `git commit` 操作。
- 无代码改动或改动内容与提交意图不匹配。

## 硬约束（禁止/必须）

- 必须先读 `git diff --name-only` 再生成提交信息。
- type 必须符合 Conventional Commits（`feat/fix/docs/refactor/chore/test`）。
- scope 必须来自改动模块，不得编造。
- 提交说明必须描述“用户价值”而不是仅列文件名。
- 若涉及多类改动，优先拆分提交，避免“大杂烩”。

## 标准代码骨架

```text
feat(rule-management): support batch enable action

- add batch enable API integration and loading state
- add row selection and toolbar action in list page
- keep single-row enable flow backward compatible
```

## 交付检查清单

- [ ] type 与改动性质一致。
- [ ] scope 与目录模块一致。
- [ ] 标题精炼且可读。
- [ ] body 覆盖关键行为变化。
- [ ] 未把无关改动混入同一提交。

## 失败兜底策略

- scope 不明确时，先按主改动目录生成最小 scope。
- 改动过大时，先建议拆分提交草案，再逐个确认。
- 无法判定 type 时，优先 `chore` 并解释原因，避免误标 `feat/fix`。
