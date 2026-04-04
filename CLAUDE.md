# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev
- `npm run dev` - Webpack dev server (NOT Vite)
- `npm run build` - Production webpack build
- `npm run typecheck` - TypeScript validation

## Tech Stack
- React 18 + TypeScript + Webpack
- Tailwind CSS v4, TanStack Query, Radix UI
- AI SDK + LangChain/LangGraph

## Architecture

### Provider Layer
- `src/App.tsx` - 应用入口，组合所有 Provider
- `src/providers/ThreadProvider.tsx` - 线程上下文管理

### Core Modules (src/core/*)
每个子目录是独立功能模块，通过 index.ts 导出：
- `agents/` - Agent 相关逻辑
- `api/` - API 调用封装
- `artifacts/` - Artifact 处理
- `config/` - 配置管理
- `mcp/` - MCP 协议支持
- `memory/` - 记忆系统
- `models/` - 模型封装
- `rehype/` - Markdown 处理
- `settings/` - 设置管理
- `skills/` - Skill 系统
- `streamdown/` - 流式响应处理
- `tasks/` - 任务管理
- `threads/` - 线程管理
- `todos/` - Todo 管理
- `uploads/` - 文件上传

### UI Components (src/components/*)
- `ChatDemo.tsx` - 主聊天界面
- `InputBox.tsx` - 输入框
- `ai-elements/` - AI 相关 UI 元素（message, code-block, tool, reasoning 等）
- `ui/` - 基础 UI 组件
- `workspace/` - 工作区组件（chats, messages, artifacts 等）

## Key Paths
- Entry: `src/main.tsx`
- App root: `src/App.tsx`
- Components: `src/components/*`
- Core logic: `src/core/*`
- Providers: `src/providers/*`

## Notes
- `src/backup/` 目录包含未使用的旧 UI 组件备份，可考虑清理
- Mock 流式响应通过 `isMock: true` 参数启用

## Memory
- 用户是锤子
