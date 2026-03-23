# SSE 接入编码方案草案（`sse-plan.md`）

## Summary

目标是在不改动现有消息渲染组件能力的前提下，把当前前端从 `@langchain/langgraph-sdk/react` 的 `useStream` 方案，平滑改造成“调用你们后端线程接口 + 用 SSE 接收流式结果”的方案。

基于当前仓库现状，消息展示层已经具备流式渲染条件，核心复用对象是现有 `ThreadState.messages`、`MessageList` 和消息分组逻辑。真正需要替换的是线程发送与流式接收层，也就是当前 [src/core/threads/hooks.ts](/d:/github/chat-demo-webpack/src/core/threads/hooks.ts) 里 `useThreadStream` 对 LangGraph SDK 的依赖。

结合你提供的资料，当前先按以下事实设计：

- 创建线程接口已存在，前端需要先拿到 `threadId`
- 流式接口为 SSE
- 请求体包含 `assistant_id`、`input`、`config`、`stream_mode`、`stream_subgraphs`、`context`、`metadata`
- 你给出的原始返回示例里已经确认存在 `event: metadata` 和 `event: values`
- `values` 事件里的 `data` 目前看是“完整 messages 快照”而不是纯 token 增量
- 认证方式暂不明确，先做成“复用现有请求头注入能力或可配置扩展”的结构，不把认证写死

## 接入原则

- 保持 UI 层最小改动，优先复用现有 [src/components/workspace/messages/message-list.tsx](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list.tsx) 和 [src/components/workspace/messages/message-list-item.tsx](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list-item.tsx)
- 把改动集中在 `src/core/api/*` 和 `src/core/threads/*`
- 不直接依赖原生 `EventSource` 作为主方案
  原因：你们流式接口大概率是 `POST /threads/{threadId}/runs/stream`，而 `EventSource` 只支持 GET，不能携带复杂请求体
- 主方案使用 `fetch` + `ReadableStream` + 手动解析 SSE
- 前端内部状态仍统一收敛为 `ThreadState`
- 先兼容 `values` 事件，后兼容 `messages-tuple` / `custom`
- 如果后端只推送完整 `values.messages` 快照，则前端按“快照替换”更新
- 如果后端后续推送 token 增量，则再补“增量拼装 AI message 内容”的能力

## 关键接口与类型设计

### 1. 新增后端线程 API 封装

建议新增一层独立于 LangGraph SDK 的 API 封装，例如：

- `src/core/api/thread-api.ts`
- `src/core/api/sse.ts`

职责拆分：

- `createThread(payload)`：调用创建线程接口，返回 `thread_id`
- `getThread(threadId)`：获取线程详情或历史
- `streamThreadRun(params)`：发起 SSE 请求并逐条回调事件
- `parseSSEStream(response.body)`：把字节流解析成标准 SSE 事件对象

建议定义的请求类型：

```ts
type CreateThreadRequest = {
  values?: {
    title?: string;
    messages?: Message[];
    artifacts?: string[];
    todos?: unknown[];
  };
};

type StreamRunRequest = {
  assistant_id: string;
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
    [key: string]: unknown;
  };
};
```

建议定义的 SSE 事件类型：

```ts
type SSEEvent =
  | { event: "metadata"; data: { run_id: string; attempt?: number } }
  | { event: "values"; data: { messages?: Message[]; [key: string]: unknown } }
  | { event: "messages-tuple"; data: unknown }
  | { event: "custom"; data: unknown }
  | { event: "error"; data: unknown }
  | { event: "end"; data: { status?: string } };
```

### 2. 线程状态的前端统一模型

建议继续复用当前 [src/types/thread.ts](/d:/github/chat-demo-webpack/src/types/thread.ts) 的 `ThreadState`，但实现时要明确两层数据：

- 服务端线程快照：后端返回的 `values.messages`
- 前端展示线程：`ThreadState`
  其中继续保留：
  - `isLoading`
  - `isThreadLoading`
  - `messages`

建议在 `src/core/threads/*` 内部引入一个更明确的 view model：

```ts
type ThreadStreamState = {
  threadId: string;
  runId?: string;
  isStreaming: boolean;
  messages: Message[];
  values: {
    title?: string;
    artifacts?: string[];
    todos?: unknown[];
  };
  error?: string;
};
```

这样可以避免 UI 组件直接理解 SSE 细节。

## 核心实现方案

### 1. 用 fetch 发送 POST 并手动解析 SSE

实现一个通用方法：

```ts
streamThreadRun({
  threadId,
  body,
  signal,
  onEvent,
  onError,
  onClose,
})
```

实现要点：

- 使用 `fetch(url, { method: "POST", headers, body: JSON.stringify(...) })`
- 校验 `response.ok`
- 校验 `content-type` 包含 `text/event-stream`
- 从 `response.body.getReader()` 持续读取
- 用 `TextDecoder` 按 chunk 解码
- 以 `\n\n` 为事件分隔
- 逐行解析 `event:`、`data:`、`id:`
- 支持多行 `data:` 拼接
- 每个事件解析后执行 `JSON.parse`
- 通过回调把事件推给 `useThreadStream`

这里要特别注意：

- 不能假设一个 chunk 就是一个完整事件
- 不能假设 `data:` 只有一行
- 流结束时要处理残余 buffer
- `AbortController` 要支持主动取消当前流

### 2. 改造 `useThreadStream`，替换对 LangGraph `useStream` 的依赖

当前 [src/core/threads/hooks.ts](/d:/github/chat-demo-webpack/src/core/threads/hooks.ts) 的职责其实很适合保留，只需要替换底层数据来源。

改造后的 `useThreadStream` 仍然保留这几个能力：

- 发送消息
- 创建 optimistic human message
- 上传附件
- 维护 `thread.isLoading`
- 把服务端流式结果映射成 `thread.messages`
- 在结束后刷新线程列表缓存

建议新的内部流程：

1. 发送前记录当前消息数
2. 立即插入 optimistic human message
3. 如果没有 threadId，则先调用创建线程接口
4. 拿到 `threadId` 后回调 `onStart`
5. 用 `fetch + SSE parser` 调用流式接口
6. 收到 `metadata` 时记录 `runId`
7. 收到 `values` 时：
   - 如果包含 `messages`，直接用服务端消息快照替换当前线程消息
   - 清空 optimisticMessages
8. 收到 `messages-tuple` 时：
   - 先做兼容解析入口，但默认不作为 v1 主渲染来源
9. 收到 `custom` 时：
   - 若是 task/subagent 事件，映射给 `onToolEnd` 或子任务状态管理
10. 收到 `end` 时：
   - 标记 `isLoading = false`
   - 触发 `onFinish`
   - 刷新 thread search/query cache
11. 任意异常时：
   - 清空 loading 状态
   - 保留用户消息
   - 给出 toast 错误提示

### 3. 消息更新策略

基于你给的原始返回示例，v1 推荐采用“完整快照优先”：

- 只要收到 `values.data.messages`
- 就把它视为服务端当前权威消息列表
- 前端直接替换本地 `thread.messages`

原因：

- 当前样例里 `values` 已经直接返回完整 `messages`
- 仓库现有消息渲染层就是围绕完整 `Message[]` 工作
- 这比前端自行拼 token、拼 tool_call 稳定很多
- 与现有 `groupMessages(messages, mapper)` 最兼容

替换规则建议：

- 在首次收到有效 `values.messages` 后，移除 optimistic AI 占位
- 人类消息以服务端最终返回为准
- 若服务端会回传重复 human message，不在 UI 层做去重，统一在消息归并层做可选去重策略

建议预留一个轻量归并函数：

```ts
function normalizeIncomingMessages(messages: Message[]): Message[]
```

职责：

- 过滤空消息
- 按 `id` 去重
- 保留原始顺序
- 不篡改 `tool_calls`、`additional_kwargs`、`response_metadata`

### 4. 关于“是否真的能流式渲染”的判断

这是本方案里最重要的产品事实之一：

- 如果后端在生成过程中多次推送 `event: values`
  前端就能实时刷新消息内容，形成真正流式效果
- 如果后端只在结束时推一次 `values`
  前端只能表现为“请求中 loading，结束后一次性展示最终答案”
- 如果后端提供 `messages-tuple` 或 `custom` 的增量 token 事件
  才能做更细粒度的逐字渲染

因此 v1 方案的默认结论是：

- 先按 `values` 事件完成稳定接入
- 如果联调时发现 `values` 不是持续推送，再追加 `messages-tuple/custom` 的增量适配
- 也就是说，前端方案要“兼容真流式”，但不依赖它才能先落地

## 与现有仓库的衔接方式

### 1. ChatDemo 层

当前 [src/components/ChatDemo.tsx](/d:/github/chat-demo-webpack/src/components/ChatDemo.tsx) 仍从 `ThreadProvider` 取静态线程，并调用 `useThreadStream({ isMock: true })`。

后续接入时建议分两步：

- 第一步：保留 `ChatDemo` 的使用方式不变，只把 `useThreadStream` 底层从 LangGraph SDK 切到自定义 SSE
- 第二步：再把 `ThreadProvider` 从静态本地 JSON 切到真实线程查询接口

这样能把“流式接入”与“线程数据源改造”拆开，降低风险。

### 2. MessageList 层

[MessageList](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list.tsx) 和 [MessageListItem](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list-item.tsx) 原则上不需要因为 SSE 改结构。

它们依赖的是：

- `thread.messages`
- `thread.isLoading`
- `Message` 的标准字段
- `tool_calls`
- `additional_kwargs`

因此只要 SSE 最终能稳定产出兼容的 `Message[]`，UI 层应尽量不动。

### 3. Query / 缓存层

当前 `hooks.ts` 已经在用 React Query 管线程列表缓存，这部分建议继续保留：

- 流开始时，不强制立即刷新列表
- 流结束后，`invalidateQueries(["threads", "search"])`
- 若流内收到新的 title，也可局部更新缓存
- 如果后端创建线程时返回 title 或初始 values，也可在本地先写入缓存，减少列表闪动

## 错误处理与边界场景

### 1. 请求失败

场景：

- 创建线程失败
- 流式接口返回 4xx/5xx
- 返回内容不是 `text/event-stream`

处理：

- 清掉 assistant optimistic 占位
- human optimistic message 可保留或转失败态
- toast 提示失败原因
- `thread.isLoading = false`

### 2. 流中断

场景：

- 网络中断
- 用户切线程
- 用户重复发送
- 页面卸载

处理：

- 用 `AbortController` 中止当前 reader
- 中止时不再更新已切换线程的 UI
- 仅允许同一线程同时存在一个活动 stream
- 若切线程后旧流回包，按 `threadIdRef` 丢弃

### 3. SSE 数据格式异常

场景：

- 非法 JSON
- 缺少 `event`
- `values` 没有 `messages`

处理：

- 忽略单条坏事件
- 记录 `console.warn`
- 不让整个流因为一条坏事件崩掉
- 只有严重错误才结束流并弹错

### 4. 认证未知

当前你无法确认 `Authorization` 方式，v1 默认这样设计：

- 请求头构造统一走一个 `buildRequestHeaders()` 方法
- 默认只带 `Content-Type: application/json`
- 若后端实际要求 `Authorization`，在该方法集中补充
- 若后端走 cookie，会在 `fetch` 中开启 `credentials: "include"`

这项在实现时不写死，作为环境配置或统一 API client 策略处理。

## Test Plan

### 单元测试

建议新增测试覆盖以下内容：

1. SSE 解析器能正确解析单事件
2. SSE 解析器能正确解析跨 chunk 事件
3. SSE 解析器能正确拼接多行 `data:`
4. `values` 事件能正确替换消息列表
5. 非法 JSON 事件会被忽略而不是中断整个流
6. `AbortController` 取消后不再派发事件

### Hook 行为测试

1. 发送消息时会先插入 optimistic human message
2. 首次收到 `values.messages` 后 optimistic message 被正确收敛
3. 收到 `metadata` 时能记录 runId / 触发 `onStart`
4. 收到 `end` 时能结束 loading 并触发 `onFinish`
5. 线程切换后旧流事件不会污染新线程

### 联调验收场景

1. 首次进入页面，创建线程成功
2. 输入普通文本后，后端返回 `values`，消息列表正常展示
3. 后端若连续多次推送 `values`，回答内容能逐步刷新
4. 带附件发送时，文件上传与消息发送链路不冲突
5. 流中断后 UI 能恢复可继续发送状态
6. tool call / reasoning / artifact 相关消息若出现在 `messages` 中，现有消息组件仍可正常渲染

## Assumptions

- 默认后端流式接口是 `POST`，因此前端主方案不用原生 `EventSource`
- 默认以 `values` 事件为 v1 的权威消息来源
- 默认后端返回的 `messages` 结构与当前前端使用的 LangGraph `Message` 兼容
- 默认 `metadata.userInfo` 与 `metadata.source` 由前端业务上下文提供，若缺失则允许先给空字符串或降级默认值
- 默认认证不在本次方案中定死，实现时预留 header / credentials 扩展点
- 如果联调后确认后端不会持续推送 `values`，则需追加 `messages-tuple/custom` 的增量拼装方案，才能实现真正逐字流式显示
