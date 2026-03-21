# Plan: 实现 `/mock/api` 的 Mock Server

## 背景

当 `isMock=true` 时，LangGraph SDK 向 `/mock/api/*` 发送请求，但**根本不存在 mock server** — 所有请求都返回 404，导致控制台报错。

**报错的接口：**
- `POST /mock/api/threads/{threadId}/history` — `useStream` 的 `fetchStateHistory: { limit: 1 }` 触发
- `POST /mock/api/threads/{threadId}/runs/stream` — 流式接口（从未实现）

## 解决方案：Webpack Dev Server 中间件

通过 `onBeforeSetupMiddleware` 在 webpack-dev-server 内部拦截 `/mock/api/*` 请求。

## 需要创建的文件

### 1. `src/core/mock/types.ts`
Mock 响应的类型定义：
- `MockThread`、`MockRun`、SSE 事件类型等

### 2. `src/core/mock/data/store.ts`
内存数据存储，从 `src/data/threads/` 目录下的现有 thread JSON 文件初始化：
- `MockDataStore` 类，包含方法：`getThread`、`createThread`、`updateThread`、`getThreadHistory`、`searchThreads`、`deleteThread`

### 3. `src/core/mock/handlers/threads.ts`
线程接口的 Express 风格处理器：
- `POST /mock/api/threads/search` → `threads.search()`
- `POST /mock/api/threads/{threadId}/history` → `threads.getHistory()` ← **修复报错**
- `POST /mock/api/threads` → `threads.create()`
- `GET /mock/api/threads/{threadId}` → `threads.get()`
- `DELETE /mock/api/threads/{threadId}` → `threads.delete()`
- `GET/POST /mock/api/threads/{threadId}/state` → `threads.getState()` / `updateState()`

### 4. `src/core/mock/handlers/runs.ts`
SSE 流式处理器：
- `POST /mock/api/threads/{threadId}/runs/stream` — 返回 `text/event-stream`，模拟 AI 逐字输出响应（每字 30ms）

### 5. `src/core/mock/server.ts`
主入口 — 在 webpack-dev-server 传入的 express app 上注册所有路由

## 需要修改的文件

### `webpack.config.js`
添加中间件集成：
```javascript
const { setupMockServer } = require('./src/core/mock/server');

devServer: {
  onBeforeSetupMiddleware(server) {
    setupMockServer(server.app);
  },
}
```

## 关键代码位置

- `src/core/config/index.ts:14-18` — `getLangGraphBaseURL` 已在 `isMock=true` 时返回 `/mock/api`（无需修改）
- `src/core/threads/hooks.ts:91-92` — `useStream` 的 `fetchStateHistory: { limit: 1 }` 触发了失败的 `/history` 调用
- `src/components/ChatDemo.tsx:16` — Demo 硬编码了 `isMock: true`

## 实现顺序

1. 创建 `src/core/mock/types.ts`
2. 创建 `src/core/mock/data/store.ts`
3. 创建 `src/core/mock/handlers/threads.ts`
4. 创建 `src/core/mock/handlers/runs.ts`
5. 创建 `src/core/mock/server.ts`
6. 修改 `webpack.config.js` 注册中间件

## 验证方式

1. 运行 `npm run dev`
2. 用 Playwright 打开 `http://localhost:8000`
3. 检查控制台 — `/mock/api` 报错应消失
4. 发送测试消息 — 应触发流式响应
