# ChatDemo.tsx 依赖关系梳理

## 1. 入口位置

`ChatDemo` 的挂载链路如下：

```text
src/main.tsx
  -> src/App.tsx
    -> QueryClientProvider
      -> SubtasksProvider
        -> ThreadProvider
          -> ChatDemo
```

其中：

- `src/main.tsx` 负责挂载 React 应用并加载全局样式。
- `src/App.tsx` 负责把 `ChatDemo` 放进 React Query、子任务状态、线程状态三个上层 Provider 中。
- `src/components/ChatDemo.tsx` 是当前聊天演示页的主组合组件。

## 2. ChatDemo 直接依赖

`src/components/ChatDemo.tsx` 直接引用了 8 个内部依赖：

| 依赖 | 来源 | 作用 |
| --- | --- | --- |
| `useThreadContext` | `src/providers/ThreadProvider.tsx` | 读取当前线程数据与当前线程 ID |
| `MessageList` | `src/components/workspace/messages/message-list.tsx` | 渲染消息流主区域 |
| `ChatBox` | `src/components/workspace/chats/chat-box.tsx` | 提供聊天区和 artifacts 区的双栏容器 |
| `ThreadContext` | `src/components/workspace/messages/context.ts` | 把当前线程注入消息/附件子树 |
| `ArtifactsProvider` | `src/components/workspace/artifacts/context.tsx` | 管理附件面板开关、选中项、附件列表 |
| `InputBox` | `src/components/InputBox.tsx` | 底部输入框，负责文本提交 |
| `useThreadStream` | `src/core/threads/hooks.ts` | 发消息、接收流式响应、维护 optimistic message |
| `useLocalSettings` | `src/core/settings/hooks.ts` | 读取本地聊天上下文配置 |

## 3. ChatDemo 本身做了什么

`ChatDemo` 的职责比较集中，主要有 4 件事：

1. 通过 `useThreadContext()` 取得当前线程 `currentThread` 和 `currentThreadId`。
2. 通过 `useLocalSettings()` 读取本地上下文设置，再传给 `useThreadStream()`。
3. 通过 `sendMessage()` 把 `InputBox` 的输入提交到当前线程。
4. 用 `ThreadContext.Provider` 和 `ArtifactsProvider` 包住消息区，让消息组件和 artifacts 组件共享同一份线程与附件状态。

页面结构可以概括为：

```text
ChatDemo
  main
    ThreadContext.Provider
      ArtifactsProvider
        ChatBox
          MessageList
    bottom fixed area
      InputBox
```

## 4. 依赖树

下面只展开 `ChatDemo.tsx` 这条链路下“实际参与渲染或数据流”的主要子引用，不展开无关模块。

```text
ChatDemo
├─ useThreadContext
│  └─ ThreadProvider
│     ├─ src/data/threads/index.ts
│     └─ src/types/thread.ts
├─ useLocalSettings
│  └─ src/core/settings/local.ts
├─ useThreadStream
│  ├─ src/core/api/index.ts
│  ├─ src/core/messages/utils.ts
│  ├─ src/core/tasks/context.tsx
│  ├─ src/core/uploads/index.ts
│  └─ src/components/ai-elements/prompt-input.tsx
├─ ThreadContext.Provider
│  └─ src/components/workspace/messages/context.ts
├─ ArtifactsProvider
│  └─ src/env.ts
├─ ChatBox
│  ├─ src/components/workspace/artifacts/index.ts
│  │  ├─ ArtifactFileDetail
│  │  │  ├─ src/core/artifacts/hooks.ts
│  │  │  │  └─ src/core/artifacts/loader.ts
│  │  │  ├─ src/core/artifacts/utils.ts
│  │  │  ├─ src/components/workspace/code-editor.tsx
│  │  │  ├─ src/components/ai-elements/artifact.tsx
│  │  │  └─ src/components/workspace/messages/context.ts
│  │  ├─ ArtifactFileList
│  │  │  ├─ src/core/artifacts/utils.ts
│  │  │  ├─ src/core/skills/api.ts
│  │  │  └─ src/components/workspace/artifacts/context.tsx
│  │  └─ context.tsx
│  ├─ src/components/ai-elements/conversation.tsx
│  ├─ src/components/ui/button.tsx
│  ├─ src/components/ui/resizable.tsx
│  └─ src/components/workspace/messages/context.ts
├─ MessageList
│  ├─ src/components/ai-elements/conversation.tsx
│  ├─ src/core/messages/utils.ts
│  ├─ src/core/rehype/index.ts
│  ├─ src/core/tasks/context.tsx
│  ├─ MarkdownContent
│  │  ├─ src/components/ai-elements/message.tsx
│  │  ├─ src/core/streamdown/index.ts
│  │  └─ src/components/workspace/citations/citation-link.tsx
│  ├─ MessageListItem
│  │  ├─ src/components/ai-elements/message.tsx
│  │  ├─ src/components/ai-elements/reasoning.tsx
│  │  ├─ src/components/ai-elements/task.tsx
│  │  ├─ src/components/ai-elements/loader.tsx
│  │  ├─ src/core/messages/utils.ts
│  │  ├─ src/core/artifacts/utils.ts
│  │  ├─ src/core/rehype/index.ts
│  │  ├─ src/core/streamdown/index.ts
│  │  ├─ CopyButton
│  │  └─ MarkdownContent
│  ├─ MessageGroup
│  │  ├─ src/components/ai-elements/chain-of-thought.tsx
│  │  ├─ src/components/ai-elements/code-block.tsx
│  │  ├─ src/core/messages/utils.ts
│  │  ├─ src/core/rehype/index.ts
│  │  ├─ src/core/utils/markdown.ts
│  │  ├─ src/components/workspace/artifacts/context.tsx
│  │  ├─ FlipDisplay
│  │  ├─ Tooltip
│  │  └─ MarkdownContent
│  ├─ SubtaskCard
│  │  ├─ src/components/ai-elements/chain-of-thought.tsx
│  │  ├─ src/components/ai-elements/shimmer.tsx
│  │  ├─ src/core/messages/utils.ts
│  │  ├─ src/core/rehype/index.ts
│  │  ├─ src/core/streamdown/index.ts
│  │  ├─ src/core/tasks/context.tsx
│  │  ├─ src/core/tools/utils.ts
│  │  ├─ FlipDisplay
│  │  └─ MarkdownContent
│  ├─ ArtifactFileList
│  └─ StreamingIndicator
└─ InputBox
   └─ src/lib/utils.ts
```

## 5. 关键组件作用说明

### 5.1 ChatDemo

文件：`src/components/ChatDemo.tsx`

- 聊天页总装配组件。
- 不直接处理消息渲染细节，而是负责拼装线程上下文、artifact 上下文、消息区和输入区。
- `isMock: true` 表示当前页面走 mock 模式流式会话。

### 5.2 ThreadProvider / useThreadContext

文件：`src/providers/ThreadProvider.tsx`

- 从 `src/data/threads/index.ts` 读取本地线程 JSON。
- 维护当前线程 ID。
- 产出 `currentThread`、`currentThreadId`、`setCurrentThreadId`。
- 相当于 `ChatDemo` 的线程数据入口。

### 5.3 useThreadStream

文件：`src/core/threads/hooks.ts`

- 是 `ChatDemo` 发消息能力的核心 hook。
- 基于 `@langchain/langgraph-sdk/react` 的 `useStream` 建立流式线程通信。
- 负责：
  - 提交用户消息
  - 文件上传
  - optimistic message 展示
  - 流式事件监听
  - 更新线程列表缓存
  - 同步子任务执行状态

### 5.4 useLocalSettings

文件：`src/core/settings/hooks.ts`

- 从 `localStorage` 读取本地配置。
- 为 `useThreadStream` 提供上下文参数，例如模型、模式、推理强度。

### 5.5 ThreadContext

文件：`src/components/workspace/messages/context.ts`

- 这是消息展示树专用的线程上下文。
- 与 `ThreadProvider` 不同，它只向下暴露当前线程对象和 `isMock` 标记。
- `ChatBox`、`ArtifactFileDetail` 等展示层组件都通过它读取当前线程。

### 5.6 ArtifactsProvider

文件：`src/components/workspace/artifacts/context.tsx`

- 管理附件/产物面板的 UI 状态。
- 维护：
  - `artifacts`
  - `selectedArtifact`
  - 面板是否打开
  - 自动打开/自动选中逻辑
- `ChatBox` 与消息中的文件展示都依赖它。

### 5.7 ChatBox

文件：`src/components/workspace/chats/chat-box.tsx`

- 是聊天页中间的“双栏布局容器”。
- 左侧放消息内容，右侧放 artifact 面板。
- 通过 `ResizablePanelGroup` 实现可伸缩布局。
- 会根据当前线程中的 `thread.values.artifacts` 同步附件列表。
- 当选择了某个 artifact 时，右侧显示 `ArtifactFileDetail`；否则显示 `ArtifactFileList` 或空状态。

补充：

- `src/components/workspace/chats/index.ts` 还额外 re-export 了 `use-chat-mode.ts`、`use-thread-chat.ts`。
- 但这两个 hook 当前没有被 `ChatDemo.tsx` 实际使用，只是同目录的公共导出。

### 5.8 MessageList

文件：`src/components/workspace/messages/message-list.tsx`

- 是消息区的主调度组件。
- 接收整个线程对象后，调用 `groupMessages()` 对消息做语义分组。
- 按消息类型分发给不同子组件：
  - 普通人类/助手消息 -> `MessageListItem`
  - 推理/工具调用过程 -> `MessageGroup`
  - 澄清内容 -> `MarkdownContent`
  - 文件展示 -> `ArtifactFileList`
  - 子代理任务 -> `SubtaskCard`
- 在流式响应时显示 `StreamingIndicator`。

### 5.9 MessageListItem

文件：`src/components/workspace/messages/message-list-item.tsx`

- 负责单条消息气泡渲染。
- 区分用户消息与助手消息。
- 处理的内容较多：
  - 用户文本
  - 助手 Markdown
  - reasoning-only 消息
  - 文件上传中的 optimistic 状态
  - 图片内容
  - 复制按钮
- 如果消息里带附件信息，会渲染 `RichFilesList`。

### 5.10 MessageGroup

文件：`src/components/workspace/messages/message-group.tsx`

- 负责展示“思考过程 + 工具调用过程”。
- 会把 AI 消息转换成 `ChainOfThought` 结构。
- 典型展示内容包括：
  - web search
  - image search
  - web fetch
  - read/write file
  - bash
  - clarification
  - todo 更新
- 和 artifacts 面板有联动：
  - 当工具调用是 `write_file` / `str_replace` 时，可以自动打开对应 artifact。

### 5.11 MarkdownContent

文件：`src/components/workspace/messages/markdown-content.tsx`

- 是通用 Markdown 渲染封装。
- 基于 `ai-elements/message` 中的 `MessageResponse`。
- 默认启用 `streamdownPlugins`。
- 会把形如 `citation:*` 的链接替换成 `CitationLink`。

### 5.12 SubtaskCard

文件：`src/components/workspace/messages/subtask-card.tsx`

- 展示子代理任务卡片。
- 从 `useSubtask(taskId)` 获取子任务状态。
- 能显示：
  - 执行中
  - 执行成功
  - 执行失败
  - 最新工具调用说明
  - 子任务结果 Markdown

### 5.13 ArtifactFileList

文件：`src/components/workspace/artifacts/artifact-file-list.tsx`

- 展示当前线程的 artifact 文件列表。
- 点击文件会调用 `useArtifacts()` 把该文件设为当前选中项并打开右侧面板。
- 对 `.skill` 文件额外提供安装按钮。
- 对所有文件提供下载能力。

### 5.14 ArtifactFileDetail

文件：`src/components/workspace/artifacts/artifact-file-detail.tsx`

- 展示当前选中的 artifact 内容。
- 支持三类主要场景：
  - 代码文件：使用 `CodeEditor` 只读查看
  - Markdown / HTML：支持 preview 与 code 切换
  - 其他文件：用 `iframe` 打开
- 内部通过 `useArtifactContent()` 加载真实内容。
- 也支持 `write-file:` 这种由工具调用生成的临时虚拟 artifact。

### 5.15 InputBox

文件：`src/components/InputBox.tsx`

- 底部输入框组件。
- 仅负责输入与提交，不负责线程状态。
- Enter 发送，Shift + Enter 换行。
- 真正发送消息的逻辑由 `ChatDemo` 传入的 `onSubmit` 完成。

## 6. 关键数据流

### 6.1 发消息链路

```text
InputBox.onSubmit
  -> ChatDemo.handleSubmit
    -> sendMessage(currentThreadId, { text, files: [] })
      -> useThreadStream.submit()
        -> LangGraph stream
        -> Thread messages 更新
        -> MessageList 重新渲染
```

### 6.2 线程数据链路

```text
src/data/threads/index.ts
  -> ThreadProvider
    -> useThreadContext
      -> ChatDemo
        -> ThreadContext.Provider
          -> ChatBox / ArtifactFileDetail / 其他消息子组件
```

### 6.3 Artifact 联动链路

```text
thread.values.artifacts
  -> ChatBox 同步到 ArtifactsProvider
    -> ArtifactFileList 展示文件列表
    -> 用户点击某个 artifact
      -> useArtifacts.select(filepath)
        -> ArtifactFileDetail 加载并展示内容
```

### 6.4 子任务联动链路

```text
useThreadStream.onCustomEvent / MessageList 子代理解析
  -> useUpdateSubtask
    -> SubtasksProvider 中的 tasks 状态更新
      -> SubtaskCard 根据 taskId 渲染最新状态
```

## 7. 关键辅助模块

### 7.1 `src/core/messages/utils.ts`

- 是 `MessageList` 这一支最重要的工具文件。
- 提供：
  - `groupMessages`
  - `extractContentFromMessage`
  - `extractReasoningContentFromMessage`
  - `hasToolCalls`
  - `hasPresentFiles`
  - `hasSubagent`
  - `parseUploadedFiles`

它决定了消息最终会落到哪个展示组件上。

### 7.2 `src/core/rehype/index.ts`

- 提供 `useRehypeSplitWordsIntoSpans()`。
- 用于把文本拆成带动画的 `span`，服务于流式渲染效果。

### 7.3 `src/core/artifacts/utils.ts`

- 负责生成 artifact 访问 URL。
- `MessageListItem`、`ArtifactFileList`、`ArtifactFileDetail` 都会用到。

### 7.4 `src/core/tasks/context.tsx`

- 管理子任务状态仓库。
- `useThreadStream` 负责写入，`SubtaskCard` 和 `MessageList` 负责消费。

## 8. 一句话总结

`ChatDemo.tsx` 自身并不复杂，它更像一个“聊天页面装配器”：

- 上游从 `ThreadProvider` 和 `useLocalSettings` 取数据；
- 中游通过 `useThreadStream` 驱动消息发送与流式返回；
- 下游把消息展示拆分给 `MessageList`，把附件展示拆分给 `ChatBox/Artifact*`，把输入交给 `InputBox`。

真正复杂的地方主要在两个分支：

- `MessageList` 负责把不同类型的消息拆成不同展示组件；
- `ChatBox` 负责把聊天内容和 artifact 面板组织成可联动的双栏界面。
