# 修复 /mock/api 404 错误详细记录

## 问题描述

### 现象
访问 `http://localhost:8000` 时，控制台报错：
```
Failed to load resource: 404 /mock/api/threads/21cfea46-34bd-4aa6-9e1f-3009452fbeb9/history
Cannot POST /mock/api/threads/.../history
```

### 影响范围
共 5 个错误：
- 4 个 `/mock/api/threads/{threadId}/history` 404 错误
- 1 个 `favicon.ico` 404 错误（已忽略）

---

## 问题根因分析

### 1. 调用链路追踪

```
ChatDemo.tsx (isMock: true)
  ↓
useThreadStream({ isMock: true })
  ↓
getAPIClient(isMock)
  ↓
LangGraphClient({ apiUrl: getLangGraphBaseURL(isMock) })
  ↓
getLangGraphBaseURL(isMock=true)
  → 返回: http://localhost:8000/mock/api
```

### 2. 关键代码位置

**URL 配置** ([src/core/config/index.ts:14-18](src/core/config/index.ts#L14-L18))
```typescript
export function getLangGraphBaseURL(isMock?: boolean) {
  if (env.NEXT_PUBLIC_LANGGRAPH_BASE_URL) {
    return env.NEXT_PUBLIC_LANGGRAPH_BASE_URL;
  } else if (isMock) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/mock/api`; // 指向 /mock/api
    }
    return "http://localhost:3000/mock/api";
  }
  // ...
}
```

**useStream 配置** ([src/core/threads/hooks.ts:87-92](src/core/threads/hooks.ts#L87-L92))
```typescript
const thread = useStream<AgentThreadState>({
  client: getAPIClient(isMock),
  assistantId: "lead_agent",
  threadId: onStreamThreadId,
  reconnectOnMount: true,
  fetchStateHistory: { limit: 1 }, // ← 触发 POST /threads/{threadId}/history
});
```

### 3. 根因

当 `isMock=true` 时：
1. LangGraph SDK 向 `/mock/api/*` 发送 HTTP 请求
2. 但项目中**从未实现过 mock server**
3. 所有请求直接返回 404

---

## 修复过程

### 步骤 1：创建 mock server 模块

**文件结构**：
```
src/core/mock/
├── mock-server.cjs      # 主入口，导出 setupMockServer
├── types.js            # 类型定义
└── data/
    └── store.js        # 内存数据存储
```

### 步骤 2：实现内存数据存储 ([src/core/mock/data/store.js](src/core/mock/data/store.js))

```javascript
const threads = new Map();

function createDefaultThread() {
  const threadId = "demo-thread-001";
  threads.set(threadId, {
    thread_id: threadId,
    values: { title: "Demo Chat", messages: [], artifacts: [] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

function getThread(threadId) { return threads.get(threadId); }
function createThread(values = {}) { /* ... */ }
function updateThread(threadId, values) { /* ... */ }
function getThreadHistory(threadId, limit = 10) { /* ... */ }
function searchThreads(params = {}) { /* ... */ }
function deleteThread(threadId) { return threads.delete(threadId); }
```

### 步骤 3：实现线程接口处理器 ([src/core/mock/mock-server.cjs](src/core/mock/mock-server.cjs))

```javascript
async function handleThreadHistory(req, res, threadId) {
  const body = await parseBody(req);
  const limit = body.limit ?? 10;
  const history = getThreadHistory(threadId, limit);
  sendJSON(res, 200, history);
}
```

### 步骤 4：实现流式响应处理器（SSE）

```javascript
async function handleRunsStream(req, res, threadId) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // 解析用户输入，选择响应内容
  const words = responseText.split("");
  let index = 0;

  function sendChunk() {
    if (index < words.length) {
      sendSSE(res, "values", {
        messages: [{ type: "ai", content: words.slice(0, index + 1).join("") }]
      }, String(index));
      index++;
      setTimeout(sendChunk, 30); // 每30ms发送一个字
    } else {
      sendSSE(res, "end", { status: "complete" });
      res.end();
    }
  }
  setTimeout(sendChunk, 100);
}
```

### 步骤 5：注册路由

```javascript
function setupMockServer(app) {
  app.post("/mock/api/threads/search", handleThreadSearch);
  app.post("/mock/api/threads", handleThreadCreate);
  app.get("/mock/api/threads/:threadId", handleThreadGet);
  app.delete("/mock/api/threads/:threadId", handleThreadDelete);
  app.post("/mock/api/threads/:threadId/history", handleThreadHistory); // 修复关键
  app.get("/mock/api/threads/:threadId/state", handleThreadState);
  app.post("/mock/api/threads/:threadId/state", handleThreadState);
  app.post("/mock/api/threads/:threadId/runs/stream", handleRunsStream); // 流式响应
  console.log("[Mock Server] Registered /mock/api routes");
}
```

### 步骤 6：集成到 webpack-dev-server

**修改 webpack.config.cjs**：
```javascript
const { setupMockServer } = require('./src/core/mock/mock-server.cjs');

// 注意事项：
// 1. package.json 中 "type": "module"，所以配置文件必须使用 .cjs 扩展名
// 2. webpack-dev-server v5 使用 setupMiddlewares，而非 onBeforeSetupMiddleware

devServer: {
  // ...
  setupMiddlewares(middlewares, devServer) {
    setupMockServer(devServer.app);
    return middlewares;
  },
}
```

### 步骤 7：更新 package.json scripts

```json
{
  "scripts": {
    "dev": "webpack serve --mode development --config webpack.config.cjs",
    "build": "webpack --mode production --config webpack.config.cjs"
  }
}
```

---

## 解决的关键问题

### 问题 1：ES Module 兼容性
- **现象**：`require is not defined in ES module scope`
- **原因**：package.json 中 `"type": "module"` 导致所有 .js 文件被视为 ESM
- **解决**：将配置文件和 mock server 改为 `.cjs` 扩展名

### 问题 2：webpack-dev-server API 变化
- **现象**：`options has an unknown property 'onBeforeSetupMiddleware'`
- **原因**：webpack-dev-server v5 使用 `setupMiddlewares` 而非 `onBeforeSetupMiddleware`
- **解决**：使用正确的 API

### 问题 3：devServer.app 为 undefined
- **现象**：`Cannot read properties of undefined (reading 'post')`
- **原因**：`setupMiddlewares` 回调的第一个参数是 `middlewares`，不是 `devServer`
- **解决**：`setupMiddlewares(middlewares, devServer) => { setupMockServer(devServer.app); }`

---

## Mock Server 支持的接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/mock/api/threads/search` | POST | 搜索线程列表 |
| `/mock/api/threads` | POST | 创建新线程 |
| `/mock/api/threads/{threadId}` | GET | 获取线程详情 |
| `/mock/api/threads/{threadId}` | DELETE | 删除线程 |
| `/mock/api/threads/{threadId}/history` | POST | **获取线程历史（修复关键）** |
| `/mock/api/threads/{threadId}/state` | GET | 获取线程状态 |
| `/mock/api/threads/{threadId}/state` | POST | 更新线程状态 |
| `/mock/api/threads/{threadId}/runs/stream` | POST | **流式响应（SSE）** |

---

## 验证结果

### 修复前
```
Console: 5 errors
- 4x /mock/api/threads/{threadId}/history 404
- 1x favicon.ico 404
```

### 修复后
```
Console: 1 error (仅 favicon.ico)
[Mock Server] Registered /mock/api routes
```

---

## 文件清单

### 新建文件
- `src/core/mock/mock-server.cjs` — Mock server 主模块
- `src/core/mock/types.js` — 类型定义
- `src/core/mock/data/store.js` — 内存数据存储

### 修改文件
- `webpack.config.js` → `webpack.config.cjs` — 添加 mock server 中间件
- `package.json` — 更新 scripts 使用 .cjs 配置文件

---

## 如何测试流式输出

1. 启动服务器：`npm run dev`
2. 访问 http://localhost:8000
3. 在输入框发送消息
4. 观察 AI 回复逐字显示（每字 30ms）

---

## 后续优化方向

1. **自定义响应**：修改 `MOCK_RESPONSES` 数组实现不同回复
2. **加载真实数据**：从 `src/data/threads/` 目录加载已有线程数据
3. **扩展流式逻辑**：根据用户输入动态生成响应内容
