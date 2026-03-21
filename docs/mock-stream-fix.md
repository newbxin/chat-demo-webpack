# 修复 Mock Server 流式输出问题

## 背景

当使用 mock 服务器（`isMock=true`）时，发送消息后会触发两个网络请求（`/runs/stream` 和 `/history`），但页面上没有任何流式输出效果。用户期望的效果是：发送消息后，能在消息列表中看到 AI 响应逐字输出的效果。

## 根本原因分析

### 核心问题：SSE 事件格式不匹配

Mock 服务器发送的是 `values` 事件，但 LangGraph SDK 的 `StreamManager` 期望的是 `messages` 事件来进行流式消息更新。

从 SDK 的 `manager.cjs` 第 417 行可以看出：
```javascript
if (this.matchEventType("messages", event, data)) {
    const [serialized, metadata] = data;
    // 处理消息块...
    this.setStreamValues((streamValues) => {
        let messages = options.getMessages(values).slice();
        // 在指定索引位置更新消息
        return options.setMessages(values, messages);
    });
}
```

而 `values` 事件（第 399 行）只是调用 `this.setStreamValues(data)` 替换整个状态，不会增量更新消息。

### Mock 服务器当前格式（错误）
```javascript
sendSSE(res, "values", {
  messages: [{ type: "ai", id: "xxx", content: "H" }]
});
```

### SDK 期望的流式格式
```javascript
sendSSE(res, "messages", [
  { type: "ai", id: "xxx", content: "H" },
  { langgraph_checkpoint_ns: "main" }  // metadata
]);
```

`messages` 事件格式是 `[serializedMessage, metadata]` 元组，其中：

- **serialized**: 消息对象 `{ type, id, content, ... }`
- **metadata**: 可选对象，用于标识消息来源。关键字段：
  - `langgraph_checkpoint_ns` 或 `checkpoint_ns`: 用于子代理路由
  - 对于主线程消息，可使用 `{ langgraph_checkpoint_ns: "main" }` 或空对象 `{}`

从 SDK `manager.cjs:418-419` 可以看到：
```javascript
const [serialized, metadata] = data;
const rawCheckpointNs = metadata?.langgraph_checkpoint_ns || metadata?.checkpoint_ns;
```

当 `checkpoint_ns` 是子代理命名空间（如 `tools:<uuid>`）时，SDK 会将消息路由到子代理；否则由主 `MessageTupleManager` 处理。

## 修复方案

### 步骤 1：修改 `mock-server.cjs` 中的 `handleRunsStream`

将 SSE 事件格式从 `values` 改为 `messages`，使用正确的元组格式：

```javascript
// 错误写法：
sendSSE(res, "values", {
  messages: [{ type: "ai", id: "xxx", content: chars }]
});

// 正确写法：
sendSSE(res, "messages", [
  { type: "ai", id: "xxx", content: chars },
  { langgraph_checkpoint_ns: "main" }  // metadata
]);
```

### 步骤 2：验证 `sendSSE` 辅助函数

`sendSSE` 函数当前将 `data` 用 `JSON.stringify(data)` 发送。对于 `messages` 事件的元组格式，需要确保数组能正确序列化。

### 步骤 3：测试验证

1. 运行 `npm run dev` 启动开发服务器
2. 在 mock 模式下发送一条消息
3. 期望效果：人类消息立即显示，AI 响应逐字流式输出
4. 检查 Network 标签页：应看到 `/mock/api/threads/:threadId/runs/stream` 返回的是 `messages` 事件（而非 `values`）

## 需要修改的文件

- `src/core/mock/mock-server.cjs` - 修改 `handleRunsStream` 中的 SSE 事件格式

## 关键代码位置

- `src/core/threads/hooks.ts:87-153` - `useStream` 中的 `onUpdateEvent` 回调
- `src/components/workspace/messages/message-list.tsx` - 从 `thread.messages` 渲染消息列表
- LangGraph SDK `manager.cjs:399-454` - `messages` 事件如何更新流式状态
- LangGraph SDK `messages.cjs:31-46` - `MessageTupleManager.add()` 如何按 ID 拼接消息块
