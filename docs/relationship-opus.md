# ChatDemo.tsx 依赖关系文档

## 目录

- [1. 组件总览](#1-组件总览)
- [2. 直接依赖（Level 0）](#2-直接依赖level-0)
- [3. 子组件依赖（Level 1）](#3-子组件依赖level-1)
- [4. AI Elements 组件（Level 2）](#4-ai-elements-组件level-2)
- [5. UI 基础组件](#5-ui-基础组件)
- [6. Core 核心模块](#6-core-核心模块)
- [7. Providers 与应用结构](#7-providers-与应用结构)
- [8. 依赖关系图](#8-依赖关系图)
- [9. 外部包依赖汇总](#9-外部包依赖汇总)

---

## 1. 组件总览

`ChatDemo.tsx` 是主聊天界面组件，位于 `src/components/ChatDemo.tsx`。它组合了线程上下文、消息列表、Artifact 面板和输入框，构成完整的聊天交互界面。

**组件层级结构：**
```
ChatDemo
├── ThreadContext.Provider        (线程数据上下文)
│   └── ArtifactsProvider         (Artifact 状态管理)
│       └── ChatBox               (可调整大小的双面板布局)
│           ├── MessageList        (消息列表渲染)
│           │   ├── MessageListItem   (单条消息)
│           │   ├── SubtaskCard       (子任务卡片)
│           │   ├── ArtifactFileList  (Artifact 文件列表)
│           │   └── StreamingIndicator(流式加载指示器)
│           └── ArtifactFileDetail (Artifact 详情面板)
└── InputBox                      (消息输入框)
```

---

## 2. 直接依赖（Level 0）

`ChatDemo.tsx` 直接导入以下 8 个内部模块：

| 导入名 | 来源路径 | 类型 | 作用 |
|--------|---------|------|------|
| `useThreadContext` | `@/providers/ThreadProvider` | Hook | 获取当前线程状态（threadId、messages 等） |
| `MessageList` | `@/components/workspace/messages` | 组件 | 渲染对话消息列表 |
| `ChatBox` | `@/components/workspace/chats` | 组件 | 聊天/Artifact 双面板布局容器 |
| `ThreadContext` | `@/components/workspace/messages/context` | Context | 向下传递线程数据和 mock 标志 |
| `ArtifactsProvider` | `@/components/workspace/artifacts/context` | Provider | 管理 Artifact 选中/展开状态 |
| `InputBox` | `@/components/InputBox` | 组件 | 消息输入框（textarea + 发送按钮） |
| `useThreadStream` | `@/core/threads/hooks` | Hook | 消息流式传输、文件上传、消息提交 |
| `useLocalSettings` | `@/core/settings/hooks` | Hook | 本地浏览器设置管理 |

---

## 3. 子组件依赖（Level 1）

### 3.1 InputBox（`src/components/InputBox.tsx`）

**作用：** 简单的文本输入组件，包含 textarea 和发送按钮。支持 Enter 提交、Shift+Enter 换行。

| 依赖 | 来源 | 说明 |
|------|------|------|
| `ArrowUpIcon` | lucide-react | 发送按钮图标 |
| `cn` | `@/lib/utils` | CSS 类名合并工具 |

---

### 3.2 ChatBox（`src/components/workspace/chats/chat-box.tsx`）

**作用：** 可调整大小的双面板布局。左侧显示消息列表，右侧显示 Artifact 文件详情。管理 Artifact 面板的展开/折叠和自动选中逻辑。

| 依赖 | 来源 | 说明 |
|------|------|------|
| `FilesIcon, XIcon` | lucide-react | 图标 |
| `ConversationEmptyState` | `@/components/ai-elements/conversation` | 空白对话状态 |
| `Button` | `@/components/ui/button` | 按钮组件 |
| `ResizableHandle/Panel/PanelGroup` | `@/components/ui/resizable` | 可调整大小面板 |
| `ArtifactFileDetail` | `../artifacts` | Artifact 文件查看器 |
| `ArtifactFileList` | `../artifacts` | Artifact 文件列表 |
| `useArtifacts` | `../artifacts` | Artifact 状态 Hook |
| `useThread` | `../messages/context` | 获取线程数据 |
| `env` | `@/env` | 环境变量 |
| `cn` | `@/lib/utils` | CSS 类名工具 |

**同目录相关文件：**
- `use-chat-mode.ts` — 聊天模式状态 Hook
- `use-thread-chat.ts` — 线程聊天 Hook
- `index.ts` — 模块导出

---

### 3.3 MessageList（`src/components/workspace/messages/message-list.tsx`）

**作用：** 渲染对话消息列表。将消息按类型分组（human、assistant、processing、subagent 等），支持流式动画和 Artifact 文件内联显示。

| 依赖 | 来源 | 说明 |
|------|------|------|
| `Conversation, ConversationContent` | `@/components/ai-elements/conversation` | 对话容器（粘底滚动） |
| `extractContentFromMessage` 等工具函数 | `@/core/messages/utils` | 消息内容提取与分组 |
| `useRehypeSplitWordsIntoSpans` | `@/core/rehype` | CJK 文本逐字动画 |
| `Subtask, useUpdateSubtask` | `@/core/tasks` | 子任务类型与更新 |
| `cn` | `@/lib/utils` | CSS 类名工具 |
| `ThreadState` | `@/types/thread` | 线程状态类型 |
| `ArtifactFileList` | `../artifacts/artifact-file-list` | 内联 Artifact 文件列表 |
| `StreamingIndicator` | `../streaming-indicator` | 流式加载动画 |
| `MarkdownContent` | `./markdown-content` | Markdown 渲染 |
| `MessageGroup` | `./message-group` | 消息分组容器 |
| `MessageListItem` | `./message-list-item` | 单条消息渲染 |
| `MessageListSkeleton` | `./skeleton` | 加载骨架屏 |
| `SubtaskCard` | `./subtask-card` | 子任务卡片 |

**同目录相关文件：**

| 文件 | 作用 |
|------|------|
| `message-list-item.tsx` | 单条消息：包含 reasoning、文件、工具栏 |
| `message-group.tsx` | 消息分组展示 |
| `markdown-content.tsx` | 使用 Streamdown 渲染 Markdown |
| `subtask-card.tsx` | 子任务状态卡片（计划模式） |
| `skeleton.tsx` | 消息加载骨架屏 |
| `context.ts` | ThreadContext 定义，提供 `useThread()` Hook |

---

### 3.4 ArtifactsProvider（`src/components/workspace/artifacts/context.tsx`）

**作用：** 管理 Artifact 状态，包括选中的 Artifact、面板展开/关闭、自动选中逻辑。

| 依赖 | 来源 | 说明 |
|------|------|------|
| `env` | `@/env` | 环境变量（控制 Artifact 功能开关） |

**同目录相关文件：**

| 文件 | 作用 |
|------|------|
| `artifact-file-detail.tsx` | 文件查看器：代码/预览模式切换、下载、复制 |
| `artifact-file-list.tsx` | 可选择的 Artifact 文件列表 |
| `artifact-trigger.tsx` | 打开 Artifact 面板的按钮 |
| `index.ts` | 模块统一导出 |

---

### 3.5 ThreadContext（`src/components/workspace/messages/context.ts`）

**作用：** React Context，向 MessageList 及相关子组件提供线程数据和 mock 标志。

| 依赖 | 来源 | 说明 |
|------|------|------|
| `ThreadState` | `@/types/thread` | 线程状态类型定义 |

---

### 3.6 useThreadStream（`src/core/threads/hooks.ts`）

**作用：** 核心流式 Hook。管理消息流式传输、文件上传、乐观 UI 更新、错误处理。递归上限 1000。

| 依赖 | 来源 | 说明 |
|------|------|------|
| `useStream` | `@langchain/langgraph-sdk/react` | LangGraph 流式传输 |
| `useMutation, useQuery, useQueryClient` | `@tanstack/react-query` | 数据请求与缓存 |
| `PromptInputMessage` | `@/components/ai-elements/prompt-input` | 输入消息类型 |
| `getAPIClient` | `../api` | LangGraph API 客户端 |
| `FileInMessage` | `../messages/utils` | 文件类型 |
| `LocalSettings` | `../settings` | 本地设置类型 |
| `useUpdateSubtask` | `../tasks/context` | 子任务更新 |
| `uploadFiles, UploadedFileInfo` | `../uploads` | 文件上传 |
| `AgentThread, AgentThreadState` | `./types` | 线程类型定义 |

**传递给 Agent 的上下文参数：**
```typescript
{
  thread_id: string;
  model_name?: string;
  thinking_enabled: boolean;
  is_plan_mode: boolean;
  subagent_enabled: boolean;
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
  agent_name?: string;
}
```

---

### 3.7 useLocalSettings（`src/core/settings/hooks.ts`）

**作用：** 管理浏览器 localStorage 中的用户偏好设置。

| 依赖 | 来源 | 说明 |
|------|------|------|
| `DEFAULT_LOCAL_SETTINGS` | `./local` | 默认设置值 |
| `getLocalSettings` | `./local` | 读取设置 |
| `saveLocalSettings` | `./local` | 保存设置 |
| `LocalSettings` | `./local` | 设置类型定义 |

**模式映射：**
- `flash` → thinking_enabled=false
- `thinking` → thinking_enabled=true
- `pro` → is_plan_mode=true
- `ultra` → is_plan_mode=true, subagent_enabled=true

---

## 4. AI Elements 组件（Level 2）

`src/components/ai-elements/` 目录包含 26 个 AI 专用 UI 组件，被 MessageList 及其子组件使用。

| 文件 | 导出 | 作用 | 关键依赖 |
|------|------|------|---------|
| `artifact.tsx` | `Artifact`, `ArtifactHeader`, `ArtifactContent` 等 | Artifact 显示容器 | ui/button, ui/tooltip |
| `canvas.tsx` | `Canvas` | ReactFlow 画布包装 | @xyflow/react |
| `chain-of-thought.tsx` | `ChainOfThought`, `ChainOfThoughtStep` 等 | 可折叠思维链展示 | ui/badge, ui/collapsible |
| `checkpoint.tsx` | `Checkpoint`, `CheckpointIcon` 等 | 书签式检查点分隔符 | ui/button, ui/separator, ui/tooltip |
| `code-block.tsx` | `CodeBlock`, `highlightCode` | 语法高亮代码块（行号+复制） | shiki |
| `connection.tsx` | `Connection` | ReactFlow 连接线（贝塞尔曲线） | @xyflow/react |
| `context.tsx` | `Context`, `ContextInputUsage` 等 | Token 用量展示（HoverCard） | ui/hover-card, ui/progress, tokenlens |
| `controls.tsx` | `Controls` | ReactFlow 控制组件 | @xyflow/react |
| `conversation.tsx` | `Conversation`, `ConversationContent`, `ConversationEmptyState` | 粘底滚动对话容器 | use-stick-to-bottom |
| `edge.tsx` | `Edge` | ReactFlow 边（带粒子动画） | @xyflow/react |
| `image.tsx` | `Image` | 图片展示（base64/URL） | ai (类型) |
| `loader.tsx` | `Loader` | 旋转加载动画 | — |
| `message.tsx` | `Message`, `MessageContent`, `MessageActions` 等 | 消息气泡（分支、附件、工具栏） | ui/button, streamdown |
| `model-selector.tsx` | `ModelSelector`, `ModelSelectorTrigger` 等 | 模型选择对话框 | ui/command, ui/dialog |
| `node.tsx` | `Node`, `NodeHeader`, `NodeContent` 等 | ReactFlow 节点卡片 | ui/card, @xyflow/react |
| `open-in-chat.tsx` | `OpenIn`, `OpenInChatGPT`, `OpenInClaude` 等 | 跳转外部聊天平台菜单 | ui/dropdown-menu |
| `panel.tsx` | `Panel` | ReactFlow 面板包装 | @xyflow/react |
| `plan.tsx` | `Plan`, `PlanHeader`, `PlanContent` 等 | 可折叠计划卡片（流式闪烁效果） | ui/card, ui/collapsible, ./shimmer |
| `prompt-input.tsx` | `PromptInput`, `PromptInputTextarea` 等 | 高级输入框（文件附件、语音、菜单） | ui/*, nanoid |
| `queue.tsx` | `Queue`, `QueueItem`, `QueueSection` 等 | 可折叠任务队列列表 | ui/collapsible, ui/scroll-area |
| `reasoning.tsx` | `Reasoning`, `ReasoningTrigger`, `ReasoningContent` | 可折叠推理/思考过程展示 | ui/collapsible, streamdown |
| `shimmer.tsx` | `Shimmer` | 流式文本闪烁动画 | motion/react |
| `sources.tsx` | `Sources`, `SourcesTrigger`, `Source` 等 | 可折叠来源引用列表 | ui/collapsible |
| `suggestion.tsx` | `Suggestions`, `Suggestion` | 水平滚动建议标签 | ui/scroll-area |
| `task.tsx` | `Task`, `TaskTrigger`, `TaskContent` 等 | 可折叠任务卡片（含文件标签） | ui/collapsible |
| `toolbar.tsx` | `Toolbar` | ReactFlow 节点工具栏 | @xyflow/react |
| `web-preview.tsx` | `WebPreview`, `WebPreviewBody` 等 | iframe 网页预览器 | ui/button, ui/collapsible, ui/input, ui/tooltip |

---

## 5. UI 基础组件

`src/components/ui/` 目录包含 25 个基于 Radix UI + Tailwind 的基础组件。

| 文件 | 作用 | 底层实现 |
|------|------|---------|
| `badge.tsx` | 标签徽章 | Radix |
| `button.tsx` | 按钮（default/destructive/outline/ghost/link 变体） | CVA |
| `button-group.tsx` | 按钮组布局 | div |
| `card.tsx` | 卡片容器（header/content/footer） | div |
| `collapsible.tsx` | 折叠/展开 | Radix Collapsible |
| `command.tsx` | 命令面板/自动补全 | Radix Command |
| `dialog.tsx` | 模态对话框 | Radix Dialog |
| `dropdown-menu.tsx` | 下拉菜单 | Radix DropdownMenu |
| `hover-card.tsx` | 悬停触发弹出卡片 | Radix HoverCard |
| `input.tsx` | 文本输入框 | input |
| `input-group.tsx` | 输入框组合（带前后缀） | div |
| `magic-bento.tsx` | Bento 网格布局 | 自定义 |
| `progress.tsx` | 进度条 | Radix Progress |
| `resizable.tsx` | 可调整大小面板 | react-resizable-panels |
| `scroll-area.tsx` | 自定义滚动区域 | Radix ScrollArea |
| `select.tsx` | 下拉选择框 | Radix Select |
| `separator.tsx` | 分隔线 | Radix Separator |
| `sheet.tsx` | 侧边抽屉 | Radix Dialog |
| `shine-border.tsx` | 发光边框动画 | 自定义 |
| `skeleton.tsx` | 加载骨架屏 | div |
| `spotlight-card.tsx` | 聚光灯悬停效果卡片 | 自定义 |
| `textarea.tsx` | 多行文本输入 | textarea |
| `toggle.tsx` | 切换按钮 | Radix Toggle |
| `toggle-group.tsx` | 切换按钮组 | Radix ToggleGroup |
| `tooltip.tsx` | 悬停提示 | Radix Tooltip |

---

## 6. Core 核心模块

`src/core/` 目录包含所有业务逻辑模块，每个子目录通过 `index.ts` 导出。

### 6.1 config（`src/core/config/`）

**作用：** 集中管理 API 端点配置，被几乎所有 API 模块依赖。

| 导出 | 说明 |
|------|------|
| `getBackendBaseURL()` | 后端 API 基础 URL |
| `getLangGraphBaseURL(isMock?)` | LangGraph API URL（支持 mock 模式） |

**被引用：** agents, api, artifacts, mcp, memory, models, skills, uploads（共 9 个模块）

---

### 6.2 api（`src/core/api/`）

**作用：** 创建并缓存 LangGraph API 客户端单例，处理流模式兼容性。

| 导出 | 说明 |
|------|------|
| `getAPIClient(isMock?)` | 获取 LangGraph API 客户端 |
| `sanitizeRunStreamOptions()` | 过滤不支持的流模式 |

**依赖：** config, @langchain/langgraph-sdk

---

### 6.3 threads（`src/core/threads/`）

**作用：** 核心线程管理模块。处理消息流式传输、文件上传、线程 CRUD。

| 导出 | 说明 |
|------|------|
| `useThreadStream()` | 主流式 Hook（乐观 UI、文件上传、错误处理） |
| `useThreads()` | 线程列表查询（分页） |
| `useDeleteThread()` | 删除线程 |
| `useRenameThread()` | 重命名线程 |
| `AgentThreadState` | 线程状态类型 |
| `AgentThread` | 线程类型 |

**依赖：** api, messages, settings, tasks, uploads, @langchain/langgraph-sdk, @tanstack/react-query

---

### 6.4 messages（`src/core/messages/`）

**作用：** 消息处理工具集。分组、提取、分类各种消息类型。

| 导出 | 说明 |
|------|------|
| `groupMessages()` | 按类型分组：human/processing/assistant/present-files/clarification/subagent |
| `extractTextFromMessage()` | 提取纯文本 |
| `extractContentFromMessage()` | 提取内容块 |
| `extractReasoningContentFromMessage()` | 提取推理内容 |
| `hasContent()`, `hasReasoning()`, `hasToolCalls()` | 消息类型判断 |
| `hasPresentFiles()`, `hasSubagent()` | 文件/子代理判断 |
| `parseUploadedFiles()` | 解析上传文件元数据 |
| `FileInMessage` | 消息内文件类型 |

**依赖：** @langchain/langgraph-sdk（仅类型）

---

### 6.5 settings（`src/core/settings/`）

**作用：** 浏览器 localStorage 用户偏好管理。

| 导出 | 说明 |
|------|------|
| `LocalSettings` | 设置接口（通知、上下文、布局） |
| `DEFAULT_LOCAL_SETTINGS` | 默认值 |
| `getLocalSettings()` | 读取设置 |
| `saveLocalSettings()` | 保存设置 |
| `useLocalSettings()` | React Hook |

**依赖：** 无（直接使用 localStorage）

---

### 6.6 tasks（`src/core/tasks/`）

**作用：** 计划模式子任务管理（ultra/pro 模式下 agent 生成的子代理任务）。

| 导出 | 说明 |
|------|------|
| `Subtask` | 子任务类型（id, status, description, result, error） |
| `SubtasksProvider` | 子任务 Context Provider |
| `useSubtaskContext()` | 获取子任务上下文 |
| `useSubtask(id)` | 获取单个子任务 |
| `useUpdateSubtask()` | 更新子任务状态 |

**被引用：** threads/hooks（自定义事件处理）

---

### 6.7 uploads（`src/core/uploads/`）

**作用：** 文件上传管理，支持线程级别的文件 CRUD。

| 导出 | 说明 |
|------|------|
| `uploadFiles(threadId, files)` | 上传文件到线程 |
| `listUploadedFiles(threadId)` | 获取线程文件列表 |
| `deleteUploadedFile(threadId, filename)` | 删除文件 |
| `useUploadFiles(threadId)` | 上传 Mutation Hook |
| `useUploadedFiles(threadId)` | 文件列表 Query Hook |
| `UploadedFileInfo` | 文件信息类型 |

**依赖：** config, @tanstack/react-query

---

### 6.8 artifacts（`src/core/artifacts/`）

**作用：** Artifact 文件加载与 URL 解析。

| 导出 | 说明 |
|------|------|
| `loadArtifactContent()` | 获取 Artifact 文件内容 |
| `loadArtifactContentFromToolCall()` | 从 write-file 工具调用提取 |
| `extractArtifactsFromThread()` | 从线程状态提取 Artifact 列表 |
| `resolveArtifactURL()` | 路径转完整 URL |
| `useArtifactContent()` | React Query 缓存 Hook（5 分钟过期） |

**依赖：** config, workspace/messages/context

---

### 6.9 agents（`src/core/agents/`）

**作用：** Agent CRUD 操作。

| 导出 | 说明 |
|------|------|
| `Agent` | Agent 类型（name, description, model, tool_groups, soul） |
| `listAgents()`, `getAgent()`, `createAgent()`, `updateAgent()`, `deleteAgent()` | API 函数 |
| `useAgents()`, `useAgent()`, `useCreateAgent()` 等 | React Hook |

**依赖：** config, @tanstack/react-query

---

### 6.10 models（`src/core/models/`）

**作用：** 可用 LLM 模型列表及能力查询。

| 导出 | 说明 |
|------|------|
| `Model` | 模型类型（id, name, supports_thinking, supports_reasoning_effort） |
| `loadModels()` | 获取模型列表 |
| `useModels()` | React Hook |

**依赖：** config, @tanstack/react-query

---

### 6.11 memory（`src/core/memory/`）

**作用：** 用户持久记忆系统。

| 导出 | 说明 |
|------|------|
| `UserMemory` | 记忆类型（work_context, personal_context, top_of_mind, history, facts） |
| `loadMemory()` | 加载用户记忆 |
| `useMemory()` | React Hook |

**依赖：** config, @tanstack/react-query

---

### 6.12 skills（`src/core/skills/`）

**作用：** Skill 插件管理。

| 导出 | 说明 |
|------|------|
| `Skill` | Skill 类型（name, description, category, enabled） |
| `loadSkills()`, `enableSkill()`, `installSkill()` | API 函数 |
| `useSkills()`, `useEnableSkill()` | React Hook |

**依赖：** config, @tanstack/react-query

---

### 6.13 mcp（`src/core/mcp/`）

**作用：** MCP（Model Context Protocol）服务器配置管理。

| 导出 | 说明 |
|------|------|
| `MCPServerConfig`, `MCPConfig` | 配置类型 |
| `loadMCPConfig()`, `updateMCPConfig()` | API 函数 |
| `useMCPConfig()`, `useEnableMCPServer()` | React Hook |

**依赖：** config, @tanstack/react-query

---

### 6.14 rehype（`src/core/rehype/`）

**作用：** Rehype 插件，将 Markdown 文本按词拆分为 span 以实现逐字动画（CJK 支持）。

| 导出 | 说明 |
|------|------|
| `rehypeSplitWordsIntoSpans()` | Rehype 插件函数 |
| `useRehypeSplitWordsIntoSpans(enabled)` | React Hook |

**依赖：** unist-util-visit, hast, Intl.Segmenter

---

### 6.15 streamdown（`src/core/streamdown/`）

**作用：** Markdown 渲染插件配置集。

| 导出 | 说明 |
|------|------|
| `streamdownPlugins` | 默认插件集（remark-gfm, remark-math, rehype-raw, rehype-katex） |
| `streamdownPluginsWithWordAnimation` | 含逐字动画的插件集 |
| `humanMessagePlugins` | 用户消息专用插件（仅 math，无 autolink） |

**依赖：** remark-gfm, remark-math, rehype-raw, rehype-katex, core/rehype

---

### 6.16 tools（`src/core/tools/`）

**作用：** 工具调用的人类可读描述生成。

| 导出 | 说明 |
|------|------|
| `explainLastToolCall()` | 生成最近工具调用的描述 |
| `explainToolCall()` | 支持 web_search, image_search, web_fetch, present_files, write_todos 等 |

**依赖：** messages/utils

---

### 6.17 todos（`src/core/todos/`）

**作用：** Todo 数据结构定义。

| 导出 | 说明 |
|------|------|
| `Todo` | Todo 类型（content, status: pending/in_progress/completed） |

**依赖：** 无

---

### 6.18 notification（`src/core/notification/`）

**作用：** 浏览器通知 API 集成。

| 导出 | 说明 |
|------|------|
| `useNotification()` | 通知 Hook（权限请求、限流、设置检查） |

**依赖：** settings

---

## 7. Providers 与应用结构

### 应用组件树

```
App.tsx
└─ QueryClientProvider           (@tanstack/react-query 数据缓存)
   └─ SubtasksProvider           (core/tasks - 子任务状态管理)
      └─ ThreadProvider          (providers/ThreadProvider - 线程上下文)
         └─ ChatDemo             (主聊天界面)
```

### ThreadProvider（`src/providers/ThreadProvider.tsx`）

**作用：** 提供全局线程上下文。

| 提供数据 | 说明 |
|---------|------|
| `threads` | 静态线程数据（13 个预加载 demo 线程） |
| `currentThread` | 当前线程状态 |
| `currentThreadId` | 当前活跃线程 ID |
| `setCurrentThreadId` | 线程切换函数 |

**依赖：** `@/data/threads`（预加载 JSON 线程数据）, `@/types/thread`

---

## 8. 依赖关系图

### 模块层级依赖图

```
┌──────────────────────────────────────────────────────────────────────┐
│                         配置层 (Configuration)                        │
│                                                                      │
│  env.ts ──→ config/ ──→ 被 9 个 API 模块引用                         │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                        数据层 (Data Layer)                            │
│                                                                      │
│  api/           LangGraph 客户端单例                                  │
│    └→ config, @langchain/langgraph-sdk                               │
│                                                                      │
│  threads/       核心流式传输与线程管理                                 │
│    └→ api, messages, settings, tasks, uploads                        │
│                                                                      │
│  agents/        Agent CRUD                                           │
│  models/        模型列表                     ┐                       │
│  memory/        用户记忆                     ├→ config, react-query   │
│  skills/        Skill 管理                   │                       │
│  mcp/           MCP 配置                     │                       │
│  uploads/       文件上传                     ┘                       │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      上下文层 (Context & State)                       │
│                                                                      │
│  settings/      localStorage 偏好设置（无外部依赖）                    │
│  tasks/         子任务 React Context                                  │
│  todos/         Todo 类型定义（无外部依赖）                            │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      工具层 (Utilities)                               │
│                                                                      │
│  messages/      消息分组、提取、分类                                   │
│  tools/         工具调用描述生成 ──→ messages                         │
│  artifacts/     Artifact 加载与 URL ──→ config, threads              │
│  rehype/        CJK 文本动画插件                                      │
│  streamdown/    Markdown 渲染配置 ──→ rehype                         │
│  notification/  浏览器通知 ──→ settings                               │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                        组件层 (Components)                            │
│                                                                      │
│  ui/ (25 个)            基础组件 ──→ Radix UI, Tailwind              │
│  ai-elements/ (26 个)   AI 专用组件 ──→ ui/*, 外部库                  │
│  workspace/             工作区布局 ──→ ai-elements, core/*            │
│  InputBox               输入框 ──→ ui/                               │
│  ChatDemo               主入口 ──→ workspace, InputBox, core/*       │
└──────────────────────────────────────────────────────────────────────┘
```

### ChatDemo 直接依赖关系图

```
ChatDemo.tsx
│
├── [Provider] useThreadContext ← providers/ThreadProvider
│     └── data/threads, types/thread
│
├── [Provider] ArtifactsProvider ← workspace/artifacts/context
│     └── env
│
├── [Context] ThreadContext ← workspace/messages/context
│     └── types/thread
│
├── [Component] ChatBox ← workspace/chats/chat-box
│     ├── ai-elements/conversation
│     ├── ui/button, ui/resizable
│     ├── workspace/artifacts (ArtifactFileDetail, ArtifactFileList)
│     │     └── core/artifacts, core/config
│     └── workspace/messages/context (useThread)
│
├── [Component] MessageList ← workspace/messages/message-list
│     ├── ai-elements/conversation
│     ├── core/messages/utils (groupMessages, extract*, has*)
│     ├── core/rehype (useRehypeSplitWordsIntoSpans)
│     ├── core/tasks (Subtask, useUpdateSubtask)
│     ├── workspace/artifacts/artifact-file-list
│     ├── workspace/streaming-indicator
│     └── [子组件]
│           ├── message-list-item → ai-elements/message, reasoning, task
│           ├── message-group
│           ├── markdown-content → core/streamdown
│           ├── subtask-card
│           └── skeleton
│
├── [Component] InputBox ← components/InputBox
│     └── lib/utils (cn)
│
├── [Hook] useThreadStream ← core/threads/hooks
│     ├── core/api (getAPIClient)
│     │     └── core/config, @langchain/langgraph-sdk
│     ├── core/messages/utils (FileInMessage)
│     ├── core/settings (LocalSettings)
│     ├── core/tasks/context (useUpdateSubtask)
│     ├── core/uploads (uploadFiles)
│     │     └── core/config
│     └── @langchain/langgraph-sdk/react (useStream)
│
└── [Hook] useLocalSettings ← core/settings/hooks
      └── core/settings/local (localStorage)
```

---

## 9. 外部包依赖汇总

### React 生态

| 包名 | 用途 |
|------|------|
| `react` | 核心框架（hooks, context） |
| `@tanstack/react-query` | 数据请求与缓存 |
| `react-resizable-panels` | 可调整大小面板布局 |
| `use-stick-to-bottom` | 对话粘底滚动 |
| `motion/react` | Framer Motion 动画 |

### LangChain / LangGraph

| 包名 | 用途 |
|------|------|
| `@langchain/langgraph-sdk` | LangGraph 客户端与类型 |
| `@langchain/langgraph-sdk/react` | useStream 流式 Hook |
| `@langchain/langgraph-sdk/client` | ThreadsClient |

### UI & 样式

| 包名 | 用途 |
|------|------|
| `lucide-react` | 图标库 |
| `tailwind-merge` | Tailwind CSS 类名合并 |
| `clsx` | CSS 类名条件拼接 |
| `@radix-ui/*` | 无障碍基础 UI 原语 |

### Markdown & 代码

| 包名 | 用途 |
|------|------|
| `streamdown` | 流式 Markdown 渲染 |
| `shiki` | 语法高亮 |
| `remark-gfm` | GitHub Flavored Markdown |
| `remark-math` | 数学公式支持 |
| `rehype-raw` | 原始 HTML 支持 |
| `rehype-katex` | KaTeX 公式渲染 |
| `unist-util-visit` | AST 遍历 |

### 图形 & 可视化

| 包名 | 用途 |
|------|------|
| `@xyflow/react` | ReactFlow 节点/边图 |

### 其他

| 包名 | 用途 |
|------|------|
| `sonner` | Toast 通知 |
| `nanoid` | 唯一 ID 生成 |
| `tokenlens` | Token 用量统计 |
| `ai` | AI SDK 类型 |
