# chat-demo

一个基于 `Vite + React + TypeScript` 的聊天界面演示项目，包含消息流、线程上下文、Artifact 展示和基础 Agent/Skill 相关 UI 结构。

## 功能概览

- 聊天输入与消息列表渲染
- 线程上下文管理（`ThreadProvider`）
- 本地设置与模式切换（Flash / Pro / Ultra 等上下文能力）
- Mock 流式响应能力（演示模式）
- i18n 结构（`en-US` / `zh-CN`）

## 技术栈

- React 18
- TypeScript
- Vite 5
- Tailwind CSS 4
- TanStack Query
- LangGraph SDK（前端接入）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

默认开发端口：`8000`（见 `vite.config.ts`）。

### 3. 打包

```bash
npm run build
```

### 4. 预览构建产物

```bash
npm run preview
```

## 目录结构（核心）

```text
src/
  components/          # UI 组件与页面组合
  core/                # 业务核心能力（threads, settings, api, tools 等）
  data/                # 演示线程与样例数据
  providers/           # React Context Provider
  styles/              # 全局样式
```

## 开发说明

- 入口文件：`src/main.tsx`
- 应用根组件：`src/App.tsx`
- 主页面：`src/components/ChatDemo.tsx`
- 当前 Demo 默认通过 `useThreadStream(..., isMock: true)` 走演示流式逻辑。

## 建议

- 提交前至少执行一次 `npm run build`，确保 TS 与打包无报错。
- 新增业务模块优先放在 `src/core/*`，保持组件层与业务层解耦。
