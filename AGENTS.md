# AGENTS.md

本文件定义在本仓库中协作的人类开发者与 AI Agent 的统一约定。

## 目标

- 保持改动小而清晰，优先可读性与可维护性。
- 避免无关重构，聚焦当前任务范围。
- 修改后尽量可直接运行与验证。

## 项目上下文

- 前端框架：React + TypeScript + Vite
- 样式体系：Tailwind CSS
- 状态与数据：TanStack Query + 本地 Context
- 线程/消息核心：`src/core/threads/*`

## 开发流程

1. 先阅读相关模块再改代码，避免“盲改”。
2. 优先最小改动完成需求。
3. 改动后运行可用验证（至少 `npm run build`）。
4. 说明变更内容与影响范围。

## 代码组织约定

- UI 展示逻辑放 `src/components/*`
- 业务能力与 API 封装放 `src/core/*`
- Provider 放 `src/providers/*`
- 通用工具优先复用已有 `utils`，避免重复实现

## 编码约定

- 保持 TypeScript 类型完整，不引入 `any`（必要时说明原因）。
- 函数组件与 hooks 命名要语义化。
- 仅在必要处添加注释，注释解释“为什么”，不是“做了什么”。
- 不做大规模格式化，避免噪音 diff。

## Agent 行为约束

- 不修改与任务无关文件。
- 不随意升级依赖版本。
- 不引入破坏性命令（如强制重置 Git 历史）。
- 若发现仓库已有未提交改动，默认保留并在说明中告知。

## 验证与交付

- 默认验证命令：
  - `npm run build`
- 若未能执行验证，需明确说明原因与潜在风险。

## 提交说明建议

- 标题示例：`docs: add project README and collaboration AGENTS guide`
- 描述至少包含：
  - 改了什么
  - 为什么这么改
  - 如何验证
