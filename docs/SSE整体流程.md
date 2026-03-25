这套链路现在可以理解成 4 层：页面触发、线程 hook 编排、API/SSE 接口层、消息渲染层。

**入口流程**

用户在 [ChatDemo.tsx](/d:/github/chat-demo-webpack/src/components/ChatDemo.tsx) 里输入内容，`InputBox` 提交后会调用 `handleSubmit`，再进入 `useThreadStream` 返回的 `sendMessage`。  
`ChatDemo` 现在不只是拿 `sendMessage`，还拿到了 hook 返回的实时 `thread`，并把它传给 [message-list.tsx](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list.tsx)，所以后续流式更新会直接反映到页面。

**发送消息时做了什么**

核心逻辑都在 [hooks.ts](/d:/github/chat-demo-webpack/src/core/threads/hooks.ts)。

`sendMessage` 执行时，大致顺序是：

1. 先中止上一个未完成的流，保证同一时间只有一个活动 stream。
2. 立刻构造 optimistic human message，让用户消息先显示出来。
3. 如果带附件，先调用上传接口 `uploadFiles`，上传完成后把 optimistic message 里的文件状态从 `uploading` 改成 `uploaded`。
4. 如果当前没有 `threadId`，先调用 `createThread` 创建线程。
5. 拿到线程 id 后，组装流式请求体 `StreamRunRequest`。
6. 调用 `streamThreadRun` 发起 `POST /threads/{threadId}/runs/stream`。
7. 流结束后关闭 loading，触发 `onFinish`，并刷新线程列表缓存。

这里本地线程状态结构定义在 [stream-state.ts](/d:/github/chat-demo-webpack/src/core/threads/stream-state.ts)，包括：

- `threadId`
- `runId`
- `isLoading`
- `messages`
- `values.title/artifacts/todos`

**具体调了哪些接口**

接口封装在 [thread-api.ts](/d:/github/chat-demo-webpack/src/core/api/thread-api.ts)。

1. 创建线程  
   `createThread()`  
   调 `POST /api/langgraph/threads`

2. 创建运行并流式返回  
   `streamThreadRun()`  
   调 `POST /api/langgraph/threads/{thread_id}/runs/stream`

3. 获取线程状态  
   `getThreadState()`  
   调 `POST /api/langgraph/threads/{thread_id}/state`

当前主流程里真正用到的是前两个，`getThreadState()` 先预留了，暂时没接进发送主链路。

请求头也在这里统一处理，`buildRequestHeaders()` 默认放 `Content-Type: application/json`，后面如果要加 `Authorization`，就从这里加。

**SSE 是怎么处理的**

SSE 解析在 [sse.ts](/d:/github/chat-demo-webpack/src/core/api/sse.ts)。

因为后端流式接口是 `POST`，不能直接用原生 `EventSource`，所以这里用的是：

- `fetch`
- `response.body.getReader()`
- `TextDecoder`
- 手动解析 SSE 文本协议

处理流程是：

1. 检查响应是否成功。
2. 检查 `content-type` 是否包含 `text/event-stream`。
3. 从字节流里持续读取 chunk。
4. 按空行切分事件块。
5. 逐行解析 `event:`、`data:`、`id:`。
6. 把多行 `data:` 拼起来后做 `JSON.parse`。
7. 转成统一的 `ParsedSSEEvent` 回调给 `hooks.ts`。

**接口返回后前端怎么处理**

还是在 [hooks.ts](/d:/github/chat-demo-webpack/src/core/threads/hooks.ts) 里。

当前按你确认的协议，主处理的是 `event: values`：

- `metadata`
  只记录 `runId`

- `values`
  如果里面有 `data.messages`，就把它当成服务端当前权威快照
  然后用 `applyThreadSnapshot()` 覆盖本地 `thread.messages`
  同时同步 `title/artifacts/todos`

- `custom`
  先留了扩展口，后面如果后端传 task/subagent/tool 事件，可以从这里继续接

消息归一化在 [stream-state.ts](/d:/github/chat-demo-webpack/src/core/threads/stream-state.ts) 的 `normalizeIncomingMessages()`，主要做：

- 去掉重复 id 的消息
- 保持原顺序
- 不改动消息内容结构

也就是说，当前不是“前端自己拼 token”，而是“后端每次推完整 messages 快照，前端直接替换”。

**页面为什么能实时刷新**

因为 `useThreadStream` 最后返回的是一个 `mergedThread`：

- 服务端已确认的 `thread.messages`
- 加上本地 optimisticMessages

这个 `mergedThread` 被 [ChatDemo.tsx](/d:/github/chat-demo-webpack/src/components/ChatDemo.tsx) 传给 [message-list.tsx](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list.tsx)，消息列表只关心：

- `thread.messages`
- `thread.isLoading`

所以 UI 层不需要知道 SSE 细节，它只负责按已有消息组件渲染。

**涉及到的主要文件**

核心业务链路：

- [ChatDemo.tsx](/d:/github/chat-demo-webpack/src/components/ChatDemo.tsx)
- [hooks.ts](/d:/github/chat-demo-webpack/src/core/threads/hooks.ts)
- [thread-api.ts](/d:/github/chat-demo-webpack/src/core/api/thread-api.ts)
- [sse.ts](/d:/github/chat-demo-webpack/src/core/api/sse.ts)
- [stream-state.ts](/d:/github/chat-demo-webpack/src/core/threads/stream-state.ts)

渲染层：

- [message-list.tsx](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list.tsx)
- [utils.ts](/d:/github/chat-demo-webpack/src/core/messages/utils.ts)

附件上传：

- [api.ts](/d:/github/chat-demo-webpack/src/core/uploads/api.ts)

本地 mock 联调：

- [mock-server.cjs](/d:/github/chat-demo-webpack/src/core/mock/mock-server.cjs)



```
用户
  |
  | 1. 在输入框发送消息
  v
[InputBox / ChatDemo]
  文件: [ChatDemo.tsx](/d:/github/chat-demo-webpack/src/components/ChatDemo.tsx)
  |
  | 2. 调用 useThreadStream 返回的 sendMessage(threadId, message)
  v
[useThreadStream.sendMessage]
  文件: [hooks.ts](/d:/github/chat-demo-webpack/src/core/threads/hooks.ts)
  |
  | 3. 先插入 optimistic human message
  |    页面立刻看到“用户消息”
  |
  | 4. 如果有附件:
  |    调 uploadFiles(threadId, files)
  v
[上传接口]
  文件: [api.ts](/d:/github/chat-demo-webpack/src/core/uploads/api.ts)
  |
  | 5. 返回上传结果后，更新 optimistic message 里的文件状态
  v
[useThreadStream.sendMessage]
  |
  | 6. 如果当前没有 threadId:
  |    调 createThread(...)
  v
[thread-api.createThread]
  文件: [thread-api.ts](/d:/github/chat-demo-webpack/src/core/api/thread-api.ts)
  |
  | 7. POST /api/langgraph/threads
  v
[后端]
  |
  | 8. 返回 thread_id
  v
[useThreadStream.sendMessage]
  |
  | 9. 组装 StreamRunRequest
  |    assistant_id = "lead_agent"
  |    input.messages = [当前这条 human message]
  |    context = thread_id + 模式相关参数
  |    metadata = { userInfo: "", source: "Center" }
  |
  | 10. 调 streamThreadRun(...)
  v
[thread-api.streamThreadRun]
  文件: [thread-api.ts](/d:/github/chat-demo-webpack/src/core/api/thread-api.ts)
  |
  | 11. POST /api/langgraph/threads/{thread_id}/runs/stream
  |     Accept: text/event-stream
  v
[后端 SSE 响应]
  |
  | 12. 持续返回 SSE 数据
  |     event: metadata
  |     event: values
  |     event: end
  v
[sse parser]
  文件: [sse.ts](/d:/github/chat-demo-webpack/src/core/api/sse.ts)
  |
  | 13. parseSSEStream()
  |     - reader.read()
  |     - TextDecoder 解码
  |     - 按空行切事件
  |     - 解析 event/data/id
  |     - JSON.parse(data)
  v
[useThreadStream.onEvent]
  文件: [hooks.ts](/d:/github/chat-demo-webpack/src/core/threads/hooks.ts)
  |
  | 14. 收到 metadata:
  |     保存 runId
  |
  | 15. 收到 values:
  |     用 data.messages 作为权威快照
  |     替换本地 thread.messages
  |     同步 title/artifacts/todos
  |     清掉 optimisticMessages
  |
  | 16. 收到 end:
  |     isLoading = false
  |     触发 onFinish
  |     invalidateQueries(["threads", "search"])
  v
[React 状态更新]
  |
  | 17. 返回新的 mergedThread
  v
[ChatDemo / MessageList]
  文件: [ChatDemo.tsx](/d:/github/chat-demo-webpack/src/components/ChatDemo.tsx)
  文件: [message-list.tsx](/d:/github/chat-demo-webpack/src/components/workspace/messages/message-list.tsx)
  |
  | 18. MessageList 读取 thread.messages
  |     重新渲染消息列表
  v
用户看到流式更新结果
