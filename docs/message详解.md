# Message 组件设计结构

## 概述

`src/components/workspace/messages` 目录包含聊天界面的核心消息渲染组件。采用分层架构，区分消息类型并进行相应渲染。

## 文件清单

### 1. `index.ts`
- **作用**: 桶导出文件，统一导出模块公共接口
- **导出**: `MessageList`（来自 `message-list.tsx`）

### 2. `message-list.tsx`
- **作用**: 主容器组件，渲染整个消息线程
- **核心组件**: `MessageList`
- **Props**:
  ```typescript
  {
    className?: string;
    threadId: string;
    thread: ThreadState;
    paddingBottom?: number; // 默认 160
  }
  ```
- **核心逻辑**:
  1. 使用 `groupMessages()` 将消息分组
  2. 根据分组类型渲染不同组件
  3. 渲染 `StreamingIndicator` 表示加载状态

- **消息分组类型渲染逻辑**:

| 分组类型 | 渲染方式 |
|----------|----------|
| `human` / `assistant` | `MessageListItem` |
| `assistant:clarification` | `MarkdownContent` |
| `assistant:present-files` | `MarkdownContent` + `ArtifactFileList` |
| `assistant:subagent` | `SubtaskCard[]` + `MessageGroup` |
| `assistant:processing` | `MessageGroup` |

- **subagent 分组特殊处理**:
  - 从 `task` tool_call 构建 `Subtask` 对象
  - 通过 `updateSubtask()` 更新任务状态
  - 解析 tool result 字符串判断: `Task Succeeded.` / `Task failed.` / `Task timed out`

### 3. `message-list-item.tsx`
- **作用**: 渲染单条消息（人类或 AI）
- **核心组件**: `MessageListItem`（包装）, `MessageContent_`（内部，memoized）

- **消息内容渲染决策**:

| 条件 | 渲染组件 |
|------|----------|
| `additional_kwargs.element === "task"` | `Task` + `TaskTrigger` + `Loader` |
| AI 消息只有 reasoning 无 content | `Reasoning` + `ReasoningContent` |
| 人类消息 | `humanMessagePlugins` 渲染（无自动链接）|
| AI 消息有 content | `MarkdownContent` + KaTeX + 单词动画 |

- **文件处理**:
  - 从 `additional_kwargs.files` 或解析 `<uploaded_files>` 标签获取文件
  - `RichFilesList` 渲染文件列表
  - `RichFileCard` 单文件卡片，检测文件类型
  - 图片文件显示缩略图，其他文件显示图标和大小
  - 上传中状态显示旋转 Loader

- **辅助函数**:
  - `getFileExt()` - 获取文件扩展名
  - `getFileTypeLabel()` - 返回文件类型标签
  - `isImageFile()` - 判断是否图片
  - `formatBytes()` - 格式化字节大小

### 4. `message-group.tsx`
- **作用**: 渲染 AI 推理过程中的 Chain of Thought（思维链），展示工具调用

- **核心组件**: `MessageGroup`
- **内部组件**: `ToolCall`（根据工具名分发处理）

- **消息转步骤转换** (`convertToSteps`):
  ```typescript
  interface CoTReasoningStep {
    type: "reasoning";
    reasoning: string | null;
  }

  interface CoTToolCallStep {
    type: "toolCall";
    name: string;
    args: Record<string, unknown>;
    result?: string | Record<string, unknown>;
  }
  ```

- **步骤排序逻辑**:
  - `aboveLastToolCallSteps` - 最后一个工具调用之前的所有步骤
  - `lastToolCallStep` - 最后一个工具调用（突出显示）
  - `lastReasoningStep` - 最后一个工具调用之后的 reasoning

- **ToolCall 工具处理器**:

| 工具名 | 图标 | 行为 |
|--------|------|------|
| `web_search` | SearchIcon | 渲染搜索结果列表，可点击跳转 |
| `image_search` | SearchIcon | 渲染图片缩略图网格，带 tooltip |
| `web_fetch` | GlobeIcon | 提取网页标题，点击在新标签页打开 |
| `ls` | FolderOpenIcon | 显示文件夹路径 |
| `read_file` | BookOpenTextIcon | 显示文件路径 |
| `write_file` / `str_replace` | NotebookPenIcon | 点击打开 artifact（自动选择） |
| `bash` | SquareTerminalIcon | 在 CodeBlock 中显示命令 |
| `ask_clarification` | MessageCircleQuestionMarkIcon | 显示 "Need your help" |
| `write_todos` | ListTodoIcon | 显示 "Update to-do list" |
| 其他工具 | WrenchIcon | 通用渲染，显示描述 |

- **特殊行为**:
  - `write_file` / `str_replace` 在 loading + isLast + autoOpen 时自动打开 artifact
  - 折叠/展开控制: `showAbove`, `showLastThinking`

### 5. `markdown-content.tsx`
- **作用**: Markdown 内容渲染封装器，支持引用链接
- **核心组件**: `MarkdownContent`
- **Props**:
  ```typescript
  {
    content: string;
    isLoading: boolean;
    rehypePlugins: MessageResponseProps["rehypePlugins"];
    className?: string;
    remarkPlugins?: MessageResponseProps["remarkPlugins"];
    components?: MessageResponseProps["components"];
  }
  ```
- **自定义组件**:
  - `a` 标签拦截 `citation:` 协议链接，渲染为 `CitationLink`

### 6. `skeleton.tsx`
- **作用**: 初始加载时的骨架屏
- **核心组件**: `MessageListSkeleton`, `SkeletonBar`
- **动画**: `animate-skeleton-entrance`，60ms 交错延迟
- **布局**: 用户消息右对齐（`origin-[right]`），助手消息左对齐（`origin-[left]`）

### 7. `subtask-card.tsx`
- **作用**: 渲染 subagent 执行组内的单个子任务
- **核心组件**: `SubtaskCard`
- **Props**:
  ```typescript
  {
    className?: string;
    taskId: string;
    isLoading: boolean;
  }
  ```

- **任务状态显示**:

| 状态 | 图标 | 内容 |
|------|------|------|
| `in_progress` | Loader2Icon（旋转）| Shimmer 动画 + 工具调用说明 |
| `completed` | CheckCircleIcon | `MarkdownContent` 渲染 result |
| `failed` | XCircleIcon（红色）| 红色错误信息 |

- **视觉效果**:
  - 运行中: `ShineBorder` + `ambilight` 发光效果
  - 可折叠，显示 ChevronUp 箭头

### 8. `context.ts`
- **作用**: 定义线程上下文（**注意：目前未被 message-list 组件使用**）
- **接口**:
  ```typescript
  interface ThreadContextType {
    thread: ThreadState;
    isMock?: boolean;
  }
  ```
- **组件**: `ThreadContext`, `useThread()` hook

## 数据流

```
API / Mock Response
        ↓
    ThreadState
        ↓
    MessageList (message-list.tsx)
        ↓
    groupMessages() - 按类型分组消息
        ↓
    ┌───────────────────────────────────────┐
    │  human      → MessageListItem         │
    │  assistant  → MessageListItem         │
    │  assistant:clarification → Markdown  │
    │  assistant:present-files → Artifact  │
    │  assistant:subagent → SubtaskCard[]   │
    │  assistant:processing → MessageGroup  │
    └───────────────────────────────────────┘
```

## 依赖关系图

```
message-list.tsx
├── ai-elements/conversation.tsx (Conversation, ConversationContent)
├── core/messages/utils.ts (groupMessages, hasContent, etc.)
├── core/rehype/index.ts (useRehypeSplitWordsIntoSpans)
├── core/tasks/context.tsx (useUpdateSubtask)
├── workspace/messages/markdown-content.tsx
├── workspace/messages/message-group.tsx
├── workspace/messages/message-list-item.tsx
├── workspace/messages/skeleton.tsx
├── workspace/messages/subtask-card.tsx
└── workspace/streaming-indicator.tsx

message-list-item.tsx
├── ai-elements/message.tsx (Message, MessageContent, etc.)
├── ai-elements/reasoning.tsx (Reasoning, ReasoningTrigger, etc.)
├── ai-elements/task.tsx (Task, TaskTrigger)
├── core/messages/utils.ts
├── core/streamdown/index.ts
├── core/artifacts/utils.ts
└── workspace/copy-button.tsx

message-group.tsx
├── ai-elements/chain-of-thought.tsx
├── ai-elements/code-block.tsx
├── core/messages/utils.ts
├── core/rehype/index.ts
└── workspace/artifacts/index.ts (useArtifacts)

subtask-card.tsx
├── ai-elements/chain-of-thought.tsx
├── ai-elements/shimmer.tsx
├── ai-elements/shine-border.tsx
├── core/tasks/context.tsx (useSubtask)
└── core/streamdown/index.ts

markdown-content.tsx
├── ai-elements/message.tsx (MessageResponse)
└── workspace/citations/citation-link.tsx
```

## 关键工具函数 (`src/core/messages/utils.ts`)

| 函数 | 作用 |
|------|------|
| `groupMessages()` | 将消息按类型分组 |
| `extractContentFromMessage()` | 提取消息文本内容 |
| `extractReasoningContentFromMessage()` | 提取 AI 推理内容 |
| `extractPresentFilesFromMessage()` | 提取 present_files 工具调用 |
| `extractTextFromMessage()` | 提取消息纯文本 |
| `hasContent()` | 检查是否有内容 |
| `hasPresentFiles()` | 检查是否有 present_files |
| `hasReasoning()` | 检查是否有推理 |
| `hasToolCalls()` | 检查是否有工具调用 |
| `findToolCallResult()` | 根据 tool_call_id 查找结果 |
| `parseUploadedFiles()` | 解析 `<uploaded_files>` 标签 |
| `stripUploadedFilesTag()` | 移除上传文件标签 |

## 相关类型

### ThreadState (`src/types/thread.ts`)
```typescript
interface ThreadState extends ThreadData {
  isLoading: boolean;
  isThreadLoading: boolean;
  messages: Message[];
}

interface ThreadData {
  values: {
    messages: unknown[];
    title?: string;
    artifacts?: string[];
    todos?: unknown[];
  };
}
```

### Subtask (`src/core/tasks/types.ts`)
```typescript
interface Subtask {
  id: string;
  status: "in_progress" | "completed" | "failed";
  subagent_type: string;
  description: string;
  latestMessage?: AIMessage;
  prompt: string;
  result?: string;
  error?: string;
}
```
