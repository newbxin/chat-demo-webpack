# 前端接入后端线程接口与 SSE 流式渲染方案

## Summary

目标是在尽量不动现有消息展示组件的前提下，把当前基于 `@langchain/langgraph-sdk/react` 的流式链路替换为“前端直接调用后端线程接口 + 用 `fetch` 解析 SSE”的实现。

本次方案按你确认的前提落地：

- `/api/langgraph/threads`、`/api/langgraph/threads/{thread_id}/runs/stream`、`/api/langgraph/threads/{thread_id}/state` 均为 `POST`
- `/runs/stream` 以 `event: values` 为主，`data.messages` 是当前完整消息快照
- `metadata.userInfo`、`metadata.source` 先用默认值联调
- `/state` 暂不作为主链路，先保留为后续兜底能力，不纳入 v1 核心流程

## Key Changes

### 1. 新增独立于 LangGraph SDK 的线程 API 层

新增一组面向你们后端协议的轻量封装，职责拆清楚，不再让 `useThreadStream` 直接依赖 LangGraph SDK：

- `createThread(payload)`
  调用 `POST /api/langgraph/threads`
- `streamThreadRun(params)`
  调用 `POST /api/langgraph/threads/{thread_id}/runs/stream`
- `getThreadState(threadId)`
  调用 `POST /api/langgraph/threads/{thread_id}/state`
- `buildRequestHeaders()`
  统一构造请求头；v1 默认仅 `Content-Type: application/json`，预留后续补 `Authorization`

建议补充明确类型，避免后续 hook 层继续和裸 `unknown` 耦合：

```ts
type CreateThreadRequest = {
  thread_id?: string;
  metadata?: {
    userInfo: string;
    source: string;
  };
};

type CreateThreadResponse = {
  thread_id: string;
  metadata?: Record<string, unknown>;
  values?: {
    title?: string;
    messages?: Message[];
    artifacts?: string[];
    todos?: unknown[];
  };
};

type StreamRunRequest = {
  assistant_id: "lead_agent";
  input: {
    messages: Message[];
  };
  config?: Record<string, unknown>;
  stream_mode: Array<"values" | "messages-tuple" | "custom">;
  stream_subgraphs?: boolean;
  context: {
    thread_id: string;
    user_id?: string;
    thinking_enabled?: boolean;
    is_plan_mode?: boolean;
    subagent_enabled?: boolean;
    [key: string]: unknown;
  };
  metadata: {
    userInfo: string;
    source: string;
  };
};

type ThreadStateResponse = {
  values: {
    title?: string;
    messages?: Message[];
    artifacts?: string[];
    todos?: unknown[];
  };
};
```

### 2. 用 `fetch + ReadableStream` 实现 POST-SSE 解析器

因为流式接口是 `POST`，主方案不用原生 `EventSource`，而是新增通用 SSE 解析层：

- 用 `fetch(..., { method: "POST", body: JSON.stringify(payload), signal })`
- 校验 `response.ok`
- 校验 `content-type` 包含 `text/event-stream`
- 用 `response.body.getReader()` 持续读取字节流
- 用 `TextDecoder` 解码 chunk
- 以空行分割事件块
- 逐行解析 `event:`、`data:`、`id:`
- 支持多行 `data:` 拼接
- 每个事件完成后再 `JSON.parse(data)`

建议统一事件模型：

```ts
type ParsedSSEEvent =
  | { event: "metadata"; data: { run_id?: string; thread_id?: string; [k: string]: unknown }; id?: string }
  | { event: "values"; data: { messages?: Message[]; title?: string; artifacts?: string[]; todos?: unknown[]; [k: string]: unknown }; id?: string }
  | { event: "messages-tuple"; data: unknown; id?: string }
  | { event: "custom"; data: unknown; id?: string }
  | { event: "error"; data: unknown; id?: string }
  | { event: "end"; data: { status?: string; [k: string]: unknown }; id?: string };
```

v1 的核心更新策略明确为：

- 只要收到 `event: values` 且包含 `data.messages`
- 就把它视为服务端当前权威消息快照
- 前端直接替换本地 `thread.messages`
- 不在 v1 里做 token 级别拼接

### 3. 重写 `useThreadStream` 的底层实现，但保持上层调用方式基本不变

保留当前 `useThreadStream` 的职责边界，只替换底层数据来源：

- 保留 optimistic human message
- 保留附件上传逻辑
- 保留 `onStart` / `onFinish` / `onToolEnd`
- 保留 React Query 的线程列表刷新
- 去掉对 `useStream` 和 LangGraph client 的运行时依赖

建议新的发送流程：

1. 调用前记录当前消息数
2. 立即插入 optimistic human message
3. 若存在附件，先上传并把上传结果写回 optimistic message
4. 若当前没有 `threadId`，先调 `createThread`
5. 拿到真实 `threadId` 后触发 `onStart(threadId)`
6. 组装 `StreamRunRequest`
7. 调用 `streamThreadRun`
8. 处理流事件：
   - `metadata`：记录 `runId`
   - `values`：用 `data.messages` 覆盖线程消息，并同步 `title/artifacts/todos`
   - `custom`：若后端后续补 task/subagent 事件，再映射给 `onToolEnd` 或任务上下文
   - `end`：结束 loading，触发 `onFinish`
9. 流结束后刷新 `["threads", "search"]`
10. 出错时清理 loading 和 assistant 占位，保留用户消息并提示错误

建议在 hook 内部引入一个更明确的本地状态模型，避免 UI 直接理解 SSE：

```ts
type ThreadStreamState = {
  threadId: string | null;
  runId?: string;
  isLoading: boolean;
  isThreadLoading: boolean;
  messages: Message[];
  values: {
    title?: string;
    artifacts?: string[];
    todos?: unknown[];
  };
  error?: string;
};
```

### 4. UI 层尽量不动，只对接兼容的 `ThreadState`

`MessageList`、`MessageListItem`、消息分组逻辑继续消费标准 `Message[]`，不让组件层感知 SSE。

这意味着实现里要保证：

- `thread.messages` 始终是可直接渲染的消息数组
- `thread.isLoading` 在流期间正确置为 `true`
- `title/artifacts/todos` 按 `values` 事件同步
- optimistic message 只在服务端首次返回有效 `messages` 后清空

### 5. `/state` 接口先留作扩展点，不进入 v1 主链路

基于你选择“几乎不用”，v1 不把 `/state` 拉取纳入发送和展示主流程。

但方案里保留接口和调用点，便于后续两种场景扩展：

- 进入真实线程时补拉历史
- SSE 异常中断后主动回填最终状态

## Test Plan

### 单元测试

新增并覆盖以下场景：

1. SSE 解析器能解析单个事件
2. SSE 解析器能处理跨 chunk 事件
3. SSE 解析器能拼接多行 `data:`
4. `values` 事件能正确替换消息快照
5. 非法 JSON 事件会被忽略或记录告警，不会直接打断整条流
6. `AbortController` 取消后不再派发后续事件
7. 缺少 `text/event-stream` 响应头时会抛出明确错误

### Hook 行为测试

1. 发送消息时先插入 optimistic human message
2. 有附件时先上传，再提交运行请求
3. 无 `threadId` 时会先创建线程，再发起流式运行
4. 首次收到 `values.messages` 后会清空 optimistic message
5. 收到 `metadata` 时会记录 `runId`
6. 收到 `end` 时会关闭 loading 并触发 `onFinish`
7. 流错误时会清理 loading，且不会污染下一次发送
8. 同线程重复发送时，只允许一个活动 stream 或显式中止旧 stream 后再发新 stream

### 联调验收

1. 首次发送时能成功创建线程并返回 `thread_id`
2. `/runs/stream` 连续推送 `values` 时，消息内容能持续刷新
3. 最终消息结构能被现有 `MessageList` 正常渲染
4. 线程标题若在 `values.title` 中变化，列表缓存能同步更新
5. 页面切换线程或卸载时，旧 stream 不会继续写入当前 UI
6. 后端报错、网络断开、SSE 格式异常时，前端能恢复到可继续发送状态

## Assumptions

- `assistant_id` 固定为 `"lead_agent"`
- `stream_mode` v1 默认传 `["values"]`；仅在联调确认需要时再加 `"messages-tuple"` 或 `"custom"`
- 后端返回的 `values.messages` 结构与当前前端使用的 `@langchain/langgraph-sdk` `Message` 类型兼容
- `metadata.userInfo`、`metadata.source` v1 先使用固定默认值联调，例如 `userInfo: ""`、`source: "Center"`
- `Authorization` 当前按“无需认证”处理，v1 不强制携带；但请求头构造函数必须预留后续扩展点
- `/state` 接口本次只做 API 预留，不纳入核心发送链路
