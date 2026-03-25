# src/core 目录梳理

## 总览

`src/core` 是这个项目的核心能力层，主要承载三类职责：

- 与后端或 LangGraph 交互的通信能力，例如线程创建、流式请求、文件上传、技能安装等。
- 面向 UI 的业务抽象，例如线程流式状态管理、消息分组、artifact 内容加载、本地设置等。
- 通用基础能力，例如 Markdown 处理、时间格式化、UUID 生成、文件类型判断等。

在当前项目里，`src/core` 并不直接负责页面布局；页面展示主要放在 `src/components/*`，全局状态容器主要放在 `src/providers/*`，而 `src/types/*` 补充更通用的类型定义。可以把它理解成 UI 和数据源之间的“中间层”：

- `src/components/ChatDemo.tsx` 通过 `@/core/threads/hooks` 和 `@/core/settings/hooks` 驱动聊天主流程。
- `src/components/workspace/messages/*` 主要消费 `messages`、`rehype`、`streamdown`、`tools`、`tasks` 等目录提供的消息处理能力。
- `src/components/workspace/artifacts/*` 主要消费 `artifacts`、`skills`、`utils/files` 等目录提供的产物展示和安装能力。
- `src/App.tsx` 使用 `@/core/tasks/context` 提供全局 subtask 上下文。

## 一级目录速览

| 目录 | 职责一句话 | 核心文件 | 当前是否被直接使用 |
| --- | --- | --- | --- |
| `agents` | 封装 agent 列表、详情、增删改查接口与 hooks | `api.ts` `hooks.ts` `types.ts` | 当前仓库内未发现业务组件直接调用 |
| `api` | LangGraph 通信基础层，负责线程接口、SSE 和 client 兼容封装 | `api-client.ts` `thread-api.ts` `sse.ts` `stream-mode.ts` | 被 `threads` 目录直接依赖 |
| `artifacts` | 负责 artifact URL 解析、内容加载和读取工具调用产物 | `loader.ts` `hooks.ts` `utils.ts` | 被 `workspace/artifacts/*` 和消息列表直接使用 |
| `config` | 统一生成后端与 LangGraph 的基础 URL | `index.ts` | 被多个 `api` 模块直接依赖 |
| `mcp` | 封装 MCP 配置读取、更新与启停 hooks | `api.ts` `hooks.ts` `types.ts` | 当前仓库内未发现业务组件直接调用 |
| `memory` | 封装用户记忆信息读取接口与 hooks | `api.ts` `hooks.ts` `types.ts` | 当前仓库内未发现业务组件直接调用 |
| `messages` | 处理消息分组、内容提取、推理内容与工具调用判断 | `utils.ts` | 被消息渲染链路和 `threads/tools` 依赖 |
| `mock` | 提供开发态 mock 后端与流式响应模拟 | `server.js` `handlers/*` `streamMock.ts` | 通过 `isMock` 间接参与聊天主流程 |
| `models` | 封装模型列表读取接口与 hooks | `api.ts` `hooks.ts` `types.ts` | 当前仓库内未发现业务组件直接调用 |
| `notification` | 封装浏览器通知能力并读取本地通知开关 | `hooks.ts` | 当前仓库内未发现业务组件直接调用 |
| `rehype` | 提供 Markdown 渲染阶段的自定义 rehype 插件 | `index.ts` | 被消息渲染链路直接使用 |
| `settings` | 管理本地设置读写及 React hook | `local.ts` `hooks.ts` | 被 `ChatDemo`、`threads`、`notification` 使用 |
| `skills` | 封装技能列表、启用、安装接口与 hooks | `api.ts` `hooks.ts` `type.ts` | 被 artifact 相关组件直接使用 |
| `streamdown` | 统一组织 Markdown/数学公式渲染插件配置 | `plugins.ts` | 被消息和 artifact 渲染直接使用 |
| `tasks` | 定义 subtask 类型并提供全局上下文 | `types.ts` `context.tsx` | 被 `App.tsx`、消息列表、`threads` 使用 |
| `threads` | 聊天运行时核心，管理线程流式状态与上下文类型 | `hooks.ts` `types.ts` `stream-state.ts` `utils.ts` | 被 `ChatDemo` 和多个 core 模块直接依赖 |
| `todos` | 定义线程中的 todo 数据结构 | `types.ts` | 被 `threads` 和 todo UI 使用 |
| `tools` | 把工具调用转换成更适合 UI 展示的描述文本 | `utils.ts` | 被 subtask 消息卡片直接使用 |
| `uploads` | 封装线程文件上传、列表、删除接口与 hooks | `api.ts` `hooks.ts` | 被 `threads` 间接使用，当前未被业务组件直接消费 |
| `utils` | 提供文件、Markdown、JSON、时间、UUID 等通用工具 | `files.tsx` `markdown.ts` `json.ts` `datetime.ts` `uuid.ts` | 被消息、artifact 和聊天输入等组件直接使用 |

## 分目录详解

### `agents`

- 作用：封装 agent 相关的 REST API 和 React Query hooks，包括列表、详情、创建、更新、删除、名称校验。
- 核心文件：`src/core/agents/api.ts`、`src/core/agents/hooks.ts`、`src/core/agents/types.ts`、`src/core/agents/index.ts`
- 哪里用到了：当前仓库内只检索到 `src/components/workspace/agent-welcome.tsx` 引用了 `Agent` 类型；未发现页面直接调用 `useAgents`、`useAgent`、`useCreateAgent` 等 hook。
- 补充说明：这是一个已经具备完整接口封装的目录，但当前主聊天界面还没有接入 agent 管理能力。

### `api`

- 作用：作为 LangGraph 通信基础层，负责统一 client 创建、线程相关 HTTP 请求、SSE 事件解析，以及 stream mode 兼容处理。
- 核心文件：
  - `src/core/api/api-client.ts`：创建兼容版 LangGraph client，并在 `runs.stream` / `runs.joinStream` 上做 stream mode 过滤。
  - `src/core/api/thread-api.ts`：封装创建线程、读取线程状态、流式运行线程的请求。
  - `src/core/api/sse.ts`：解析 `text/event-stream` 数据流，产出结构化事件。
  - `src/core/api/stream-mode.ts`：过滤 LangGraph SDK 当前不支持的 stream mode。
  - `src/core/api/index.ts`：对外导出 `api-client`、`sse`、`thread-api`。
- 哪里用到了：
  - `src/core/threads/hooks.ts` 直接调用 `createThread`、`streamThreadRun`、`getAPIClient`，是当前最核心的使用方。
  - `src/core/api/stream-mode.test.ts`、`src/core/api/sse.test.ts` 对部分基础能力做了测试覆盖。
- 补充说明：这个目录本身几乎不直接被页面组件引用，而是作为 `threads` 的底层通信支撑存在。

### `artifacts`

- 作用：负责把线程中的 artifact 路径转换为可访问 URL，加载 artifact 内容，并支持从工具调用参数里恢复“写文件”结果。
- 核心文件：`src/core/artifacts/utils.ts`、`src/core/artifacts/loader.ts`、`src/core/artifacts/hooks.ts`、`src/core/artifacts/index.ts`
- 哪里用到了：
  - `src/components/workspace/messages/message-list-item.tsx` 使用 `resolveArtifactURL`。
  - `src/components/workspace/artifacts/artifact-file-list.tsx` 使用 `urlOfArtifact`。
  - `src/components/workspace/artifacts/artifact-file-detail.tsx` 使用 `useArtifactContent` 和 `urlOfArtifact`。
  - `src/components/workspace/messages/message-group.tsx` 通过 artifacts context 间接消费线程内 artifact 列表。
- 补充说明：`loadArtifactContent` 对 `.skill` 文件做了特殊处理，会自动补成 `/SKILL.md` 再读取内容，方便技能类 artifact 展示。

### `config`

- 作用：统一生成后端 API 和 LangGraph API 的基础 URL，避免每个模块自己拼接地址。
- 核心文件：`src/core/config/index.ts`
- 哪里用到了：
  - `src/core/api/api-client.ts`、`src/core/api/thread-api.ts`
  - `src/core/agents/api.ts`
  - `src/core/mcp/api.ts`
  - `src/core/memory/api.ts`
  - `src/core/models/api.ts`
  - `src/core/skills/api.ts`
  - `src/core/uploads/api.ts`
  - `src/core/artifacts/utils.ts`
- 补充说明：`getLangGraphBaseURL(isMock)` 是当前 mock 模式接入的关键点；当 `isMock` 为 `true` 时，会把 LangGraph 请求转到 `/mock/api`。

### `mcp`

- 作用：封装 MCP 配置的读取、更新，以及按 server 维度启停的 hook。
- 核心文件：`src/core/mcp/api.ts`、`src/core/mcp/hooks.ts`、`src/core/mcp/types.ts`、`src/core/mcp/index.ts`
- 哪里用到了：当前仓库内未发现业务组件直接调用 `useMCPConfig` 或 `useEnableMCPServer`。
- 补充说明：目录能力已经完整，但现阶段更像是为后续配置页面预留的数据访问层。

### `memory`

- 作用：封装用户 memory 数据结构和读取 hook。
- 核心文件：`src/core/memory/api.ts`、`src/core/memory/hooks.ts`、`src/core/memory/types.ts`、`src/core/memory/index.ts`
- 哪里用到了：当前仓库内未发现业务组件直接调用 `useMemory`。
- 补充说明：`types.ts` 中定义了较完整的记忆结构，包括 work context、personal context、history 和 facts，适合未来记忆面板直接复用。

### `messages`

- 作用：提供消息处理工具，包括消息分组、文本与富内容提取、推理内容提取、工具调用判断、文件消息识别等，是消息 UI 渲染前的数据整理层。
- 核心文件：`src/core/messages/utils.ts`
- 哪里用到了：
  - `src/components/workspace/messages/message-list.tsx`
  - `src/components/workspace/messages/message-list-item.tsx`
  - `src/components/workspace/messages/message-group.tsx`
  - `src/components/workspace/messages/subtask-card.tsx`
  - `src/core/tools/utils.ts`
  - `src/core/threads/hooks.ts`
- 补充说明：这个目录是消息渲染链路的上游，决定了消息会被归类成普通 assistant、处理中状态、clarification、subagent、present files 等不同展示形态。

### `mock`

- 作用：提供本地开发态 mock 后端，模拟线程接口和流式运行接口，方便前端在没有真实后端时联调。
- 核心文件：
  - `src/core/mock/server.js`：注册 `/mock/api/threads*` 和 `/mock/api/threads/:threadId/runs/stream` 路由。
  - `src/core/mock/handlers/threads.js`：处理线程搜索、创建、读取、删除、history、state。
  - `src/core/mock/handlers/runs.js`：模拟 SSE 流式响应。
  - `src/core/mock/streamMock.ts`：提供前端侧的简单字符流模拟工具。
- 哪里用到了：
  - `src/components/ChatDemo.tsx` 在调用 `useThreadStream` 时传入 `isMock: true`。
  - `src/core/config/index.ts` 的 `getLangGraphBaseURL(isMock)` 在 mock 模式下返回 `/mock/api`。
  - `src/core/api/thread-api.ts` 和 `src/core/api/api-client.ts` 会基于这个配置走 mock 接口。
- 补充说明：这条链路把 `ChatDemo` 的 mock 开关、`config` 的 URL 解析、`api` 的请求实现和 `mock` 目录下的路由处理完整串了起来，是当前本地演示可运行的重要支撑。

### `models`

- 作用：封装模型列表读取接口与 `useModels` hook。
- 核心文件：`src/core/models/api.ts`、`src/core/models/hooks.ts`、`src/core/models/types.ts`、`src/core/models/index.ts`
- 哪里用到了：当前仓库内未发现业务组件直接调用 `useModels`。
- 补充说明：`Model` 类型里已经包含 `supports_thinking`、`supports_reasoning_effort` 等字段，明显是为模型切换 UI 准备的。

### `notification`

- 作用：封装浏览器 Notification API，并结合本地设置控制是否允许弹通知。
- 核心文件：`src/core/notification/hooks.ts`
- 哪里用到了：
  - 直接依赖 `src/core/settings/hooks.ts` 中的本地通知开关。
  - 当前仓库内未发现业务组件直接调用 `useNotification`。
- 补充说明：这个目录属于“已实现但未接入主界面”的典型例子，通知节流、权限申请、点击回焦等逻辑已经具备。

### `rehype`

- 作用：提供自定义 rehype 插件，把中文分词后的词片段包成 `<span>`，用于逐词动画展示。
- 核心文件：`src/core/rehype/index.ts`
- 哪里用到了：
  - `src/core/streamdown/plugins.ts` 通过 `rehypeSplitWordsIntoSpans` 组合出带动画的 Markdown 渲染插件。
  - `src/components/workspace/messages/message-list.tsx`
  - `src/components/workspace/messages/message-list-item.tsx`
  - `src/components/workspace/messages/message-group.tsx`
  - `src/components/workspace/messages/subtask-card.tsx`
- 补充说明：它本身不处理消息数据，只在 Markdown 转 AST 再到 HTML 的渲染阶段介入，是纯展示层增强。

### `settings`

- 作用：管理本地设置的默认值、读取、存储和 React hook，对外暴露当前用户在前端保存的 context、layout、notification 配置。
- 核心文件：`src/core/settings/local.ts`、`src/core/settings/hooks.ts`、`src/core/settings/index.ts`
- 哪里用到了：
  - `src/components/ChatDemo.tsx` 使用 `useLocalSettings` 获取聊天上下文配置，并传给 `useThreadStream`。
  - `src/core/threads/hooks.ts` 依赖 `LocalSettings["context"]` 类型，把设置转成线程请求上下文。
  - `src/core/notification/hooks.ts` 使用本地通知开关。
- 补充说明：`local.ts` 的 `context` 类型基于 `threads/types.ts` 中的 `AgentThreadContext` 派生而来，去掉了线程运行时才会生成的字段，只保留前端可配置部分。

### `skills`

- 作用：封装技能列表、启用开关、安装技能等接口与 hooks。
- 核心文件：`src/core/skills/api.ts`、`src/core/skills/hooks.ts`、`src/core/skills/type.ts`、`src/core/skills/index.ts`
- 哪里用到了：
  - `src/components/workspace/artifacts/artifact-file-list.tsx` 使用 `installSkill`。
  - `src/components/workspace/artifacts/artifact-file-detail.tsx` 使用 `installSkill`。
  - 当前未发现业务组件直接使用 `useSkills` 或 `useEnableSkill`。
- 补充说明：当前 UI 接入的是“从 artifact 安装 skill”的能力，技能列表管理和启停开关还没有挂到页面上。

### `streamdown`

- 作用：统一配置 Streamdown 的 `remark` / `rehype` 插件组合，用于消息和 artifact 的 Markdown 渲染。
- 核心文件：`src/core/streamdown/plugins.ts`、`src/core/streamdown/index.ts`
- 哪里用到了：
  - `src/components/workspace/messages/markdown-content.tsx` 使用 `streamdownPlugins`
  - `src/components/workspace/messages/message-list-item.tsx` 使用 `humanMessagePlugins`
  - `src/components/workspace/messages/subtask-card.tsx` 使用 `streamdownPluginsWithWordAnimation`
  - `src/components/workspace/artifacts/artifact-file-detail.tsx` 使用 `streamdownPlugins`
- 补充说明：这里把 GFM、数学公式和自定义动画插件收敛在一起，避免各个组件分别拼装 Markdown 渲染配置。

### `tasks`

- 作用：定义 subtask 数据结构，并通过 React context 在全局维护 subtask 状态。
- 核心文件：`src/core/tasks/types.ts`、`src/core/tasks/context.tsx`、`src/core/tasks/index.ts`
- 哪里用到了：
  - `src/App.tsx` 使用 `SubtasksProvider` 提供全局上下文。
  - `src/components/workspace/messages/message-list.tsx` 使用 `useUpdateSubtask` 和 `Subtask` 类型。
  - `src/components/workspace/messages/subtask-card.tsx` 使用 `useSubtask`。
  - `src/core/threads/hooks.ts` 在流式处理过程中调用 `useUpdateSubtask` 同步子任务状态。
- 补充说明：这是当前全局上下文链路里最靠近聊天运行时的一层，专门解决 subagent/subtask 状态跨组件共享的问题。

### `threads`

- 作用：这是当前聊天运行时的核心目录，负责线程类型定义、线程流式状态管理、消息归一化、线程辅助函数，以及最关键的 `useThreadStream` hook。
- 核心文件：
  - `src/core/threads/hooks.ts`：聊天主流程入口。
  - `src/core/threads/stream-state.ts`：创建与维护线程流式状态，提供消息去重归一化。
  - `src/core/threads/types.ts`：定义 `AgentThreadState`、`AgentThreadContext` 等核心类型。
  - `src/core/threads/utils.ts`：提供线程标题、路径、消息文本提取等辅助方法。
  - `src/core/threads/index.ts`：对外导出线程类型。
- 哪里用到了：
  - `src/components/ChatDemo.tsx` 直接调用 `useThreadStream`，这是当前主聊天流程的核心入口。
  - `src/components/workspace/thread-title.tsx` 使用 `AgentThreadState` 类型。
  - `src/core/settings/local.ts` 复用 `AgentThreadContext` 类型定义本地 context 设置。
  - `src/core/artifacts/utils.ts` 依赖 `AgentThread` 类型提取 artifact。
- 补充说明：
  - `useThreadStream` 会把多个能力串起来：读取 `settings` 里的上下文配置、必要时通过 `api/thread-api` 创建线程、通过 `uploads` 上传文件、通过 `api` 发起流式运行、解析返回的消息与 values 事件、同步 `tasks/context` 中的 subtask、最终组装成 UI 可以直接消费的线程状态。
  - 这也是当前 `ChatDemo -> threads -> api/uploads/messages/tasks` 主链路的中枢。
  - `stream-state.ts` 内的 `normalizeIncomingMessages` 会对流式回来的消息按 `id` 去重，避免重复渲染。

### `todos`

- 作用：定义线程 todo 项的数据结构。
- 核心文件：`src/core/todos/types.ts`、`src/core/todos/index.ts`
- 哪里用到了：
  - `src/components/workspace/todo-list.tsx` 使用 `Todo` 类型。
  - `src/core/threads/types.ts` 在 `AgentThreadState` 中复用 `Todo[]`。
- 补充说明：目录很小，但承担了线程状态和 todo UI 之间的类型桥梁作用。

### `tools`

- 作用：把模型返回的工具调用转换成更适合 UI 展示的自然语言说明。
- 核心文件：`src/core/tools/utils.ts`
- 哪里用到了：
  - `src/components/workspace/messages/subtask-card.tsx` 使用 `explainLastToolCall` 展示子任务当前动作。
  - 内部依赖 `src/core/messages/utils.ts` 的 `hasToolCalls`。
- 补充说明：这个目录目前只有一个小工具文件，但它补上了“工具调用如何对用户解释”的最后一层体验。

### `uploads`

- 作用：封装线程上传文件、查询已上传文件、删除文件等接口，以及对应的 React Query hooks。
- 核心文件：`src/core/uploads/api.ts`、`src/core/uploads/hooks.ts`、`src/core/uploads/index.ts`
- 哪里用到了：
  - `src/core/threads/hooks.ts` 直接调用 `uploadFiles`，把用户输入中的文件先上传，再把上传结果拼回消息上下文。
  - 当前仓库内未发现页面组件直接调用 `useUploadFiles`、`useUploadedFiles`、`useDeleteUploadedFile`、`useUploadFilesOnSubmit`。
- 补充说明：这也是“已实现但未接入主界面”的目录之一。当前主流程只用到了最底层上传 API，文件列表和删除能力还没有挂到独立文件管理 UI。

### `utils`

- 作用：提供多个跨目录复用的基础工具函数。
- 核心文件：`src/core/utils/files.tsx`、`src/core/utils/markdown.ts`、`src/core/utils/json.ts`、`src/core/utils/datetime.ts`、`src/core/utils/uuid.ts`
- 哪里用到了：
  - `src/components/workspace/chats/use-thread-chat.ts` 使用 `uuid`
  - `src/components/workspace/messages/message-group.tsx` 使用 `extractTitleFromMarkdown`
  - `src/components/workspace/artifacts/artifact-file-list.tsx`、`src/components/workspace/artifacts/artifact-file-detail.tsx` 使用文件相关工具
  - `src/core/artifacts/loader.ts` 依赖本目录同层的 artifact 工具，但不直接依赖 `utils`
- 补充说明：
  - 文件能力：`files.tsx` 负责文件名、扩展名、是否代码文件、展示文案、图标判断。
  - Markdown 能力：`markdown.ts` 负责提取一级标题。
  - JSON 能力：`json.ts` 负责容错解析不完整 JSON。
  - 时间能力：`datetime.ts` 负责格式化相对时间。
  - 标识能力：`uuid.ts` 统一导出 UUID 生成函数。

## 依赖关系总结

当前 `src/core` 最重要的几条链路如下：

1. 聊天主链路  
   `settings -> threads -> api/uploads/messages/tasks -> ChatDemo/MessageList`

   `src/components/ChatDemo.tsx` 先通过 `useLocalSettings` 读取本地上下文，再把这些设置传给 `useThreadStream`。`useThreadStream` 在内部负责线程创建、文件上传、SSE 流式消费、消息归一化和 subtask 同步，最终把可展示的线程状态交给消息组件。

2. 消息渲染链路  
   `messages -> rehype -> streamdown -> tools -> workspace/messages/*`

   `messages` 目录先把原始消息按类型分组，再由 `streamdown` 统一配置 Markdown 渲染插件，`rehype` 提供逐词动画增强，`tools` 则把工具调用转成人类可读描述，最终由 `src/components/workspace/messages/*` 完成展示。

3. artifact 链路  
   `artifacts -> skills -> utils(files) -> workspace/artifacts/*`

   `artifacts` 负责拿到可读内容和访问地址，artifact 组件用 `utils/files` 判断展示方式；当 artifact 是 skill 时，再调用 `skills` 目录提供的安装接口。

4. 全局上下文链路  
   `tasks/context -> App.tsx`  
   `threads/types -> settings/local`

   `SubtasksProvider` 在 `src/App.tsx` 顶层注入，供消息列表和线程流式逻辑共享 subtask 状态。`settings/local.ts` 又基于 `threads/types.ts` 的上下文类型定义本地可配置的聊天参数，保证设置层和线程运行时的字段含义一致。

除此之外，当前还有几类“能力已实现，但主界面尚未真正接入”的目录：`agents`、`models`、`memory`、`mcp`、`notification`，以及 `uploads` 中除上传本身之外的列表/删除 hooks。这些目录已经具备较完整的类型、接口和 hook 封装，更像是未来扩展功能的预留层。
