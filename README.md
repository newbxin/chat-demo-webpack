# chat-demo

一个基于 `React + TypeScript + Webpack` 的聊天界面演示项目，包含消息流、线程上下文、Artifact 展示，以及基础 Agent / Skill 相关 UI 结构。

## 功能概览

- 聊天输入与消息列表渲染
- 线程上下文管理
- 本地设置与模式切换
- Mock 流式响应能力
- Artifact 面板与文件预览

## 技术栈

- React 18
- TypeScript
- Webpack 5
- Tailwind CSS 4
- TanStack Query
- LangGraph SDK

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

默认开发端口为 `8000`，配置见 `webpack.config.cjs`。

### 3. 类型检查

```bash
npm run typecheck
```

### 4. 打包

```bash
npm run build
```

### 5. 预览构建产物

```bash
npm run preview
```

## 目录结构

```text
src/
  components/   # UI 组件与页面组合
  core/         # 业务核心能力（threads、settings、api、tools 等）
  data/         # 演示线程与样例数据
  providers/    # React Context Provider
  styles/       # 全局样式
```

## 开发说明

- 入口文件：`src/main.tsx`
- 应用根组件：`src/App.tsx`
- 主页面：`src/components/ChatDemo.tsx`
- 当前 Demo 默认通过 `useThreadStream(..., isMock: true)` 使用 mock 流式链路

## 建议

- 提交前至少执行 `npm run typecheck` 和 `npm run build`
- 新增业务模块优先放在 `src/core/*`
- 避免直接把大型演示数据静态打入首包
