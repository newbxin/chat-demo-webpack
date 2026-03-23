# MessageList 组件交互文档

## 组件层级结构

```
ChatDemo
├── ChatBox (可调整大小的双面板布局)
│   ├── 左面板 (60%) - 消息区域
│   │   ├── MessageList
│   │   │   ├── Conversation (StickToBottom 自动滚动容器)
│   │   │   │   ├── MessageListItem (单条消息: 用户/助手)
│   │   │   │   │   ├── AIElementMessage (消息容器)
│   │   │   │   │   ├── MessageContent (消息内容)
│   │   │   │   │   │   ├── RichFilesList (附件文件列表)
│   │   │   │   │   │   ├── MarkdownContent (Markdown 渲染)
│   │   │   │   │   │   ├── Reasoning (思考过程, 可折叠)
│   │   │   │   │   │   └── Task (任务指示器)
│   │   │   │   │   └── MessageToolbar (悬停显示的工具栏)
│   │   │   │   │       └── CopyButton
│   │   │   │   │
│   │   │   │   ├── MessageGroup (消息分组: 工具调用链)
│   │   │   │   │   ├── ChainOfThought (展开/收起步骤)
│   │   │   │   │   │   └── ToolCall (各类工具调用渲染)
│   │   │   │   │   │       ├── web_search 搜索结果
│   │   │   │   │   │       ├── image_search 图片搜索
│   │   │   │   │   │       ├── web_fetch 网页获取
│   │   │   │   │   │       ├── write_file 文件写入 → 触发 Artifact
│   │   │   │   │   │       ├── bash 命令执行
│   │   │   │   │   │       └── ls / read_file 文件操作
│   │   │   │   │   └── Reasoning (思考过程, 可折叠)
│   │   │   │   │
│   │   │   │   ├── MarkdownContent (clarification 消息)
│   │   │   │   │
│   │   │   │   ├── ArtifactFileList (present-files 消息)
│   │   │   │   │
│   │   │   │   └── SubtaskCard (subagent 子任务卡片)
│   │   │   │
│   │   │   └── ScrollToBottomButton (回到底部按钮)
│   │   │
│   │   └── InputBox (输入框)
│   │
│   └── 右面板 (40%) - Artifact 区域
│       ├── ArtifactFileDetail (已选中 artifact)
│       ├── ArtifactFileList (未选中但有 artifact)
│       └── 空状态提示 (无 artifact)
```

---

## 交互清单

### 1. 消息悬停 → 显示复制工具栏

| 项目 | 说明 |
|------|------|
| **触发方式** | 鼠标悬停在消息上 |
| **交互效果** | 消息底部出现半透明工具栏，包含复制按钮 |
| **动画** | opacity 0→1，delay 200ms，duration 300ms |
| **涉及组件** | `MessageListItem` → `MessageToolbar` → `CopyButton` |
| **文件路径** | `src/components/workspace/messages/message-list-item.tsx`<br>`src/components/ai-elements/message.tsx`<br>`src/components/workspace/copy-button.tsx` |

---

### 2. 点击复制按钮 → 复制消息内容

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击消息工具栏中的复制按钮 |
| **交互效果** | 消息文本复制到剪贴板，图标变为绿色 ✓，2 秒后恢复 |
| **状态变化** | `copied: false → true`，2000ms 后重置 |
| **涉及组件** | `CopyButton` |
| **文件路径** | `src/components/workspace/copy-button.tsx` |

---

### 3. 点击思考过程 → 展开/收起推理内容

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 "Thought for N seconds" 或 "Thinking..." 标题 |
| **交互效果** | 展开或收起 AI 的推理过程内容 |
| **动画** | ChevronDown 图标旋转 180°，内容滑入/滑出 |
| **自动行为** | 流式输出时自动展开；流式结束 1 秒后自动收起 |
| **涉及组件** | `Reasoning` → `ReasoningTrigger` + `ReasoningContent` |
| **文件路径** | `src/components/ai-elements/reasoning.tsx` |

---

### 4. 点击 "N more steps" → 展开/收起工具调用链

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 "N more steps" / "Less steps" 按钮 |
| **交互效果** | 展开或收起最后一个工具调用之前的所有步骤 |
| **状态变化** | `showAbove: false → true` |
| **动画** | ChevronDown 图标旋转 180° |
| **涉及组件** | `MessageGroup` → `ChainOfThought` |
| **文件路径** | `src/components/workspace/messages/message-group.tsx`<br>`src/components/ai-elements/chain-of-thought.tsx` |

---

### 5. 点击 write_file 工具调用 → 在 Artifact 面板展示文件⚠️

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 write_file/str_replace 类型的工具调用步骤 |
| **交互效果** | 右侧 Artifact 面板打开，显示对应文件内容 |
| **状态变化** | `selectedArtifact` 设为 `write-file:{path}?message_id=...&tool_call_id=...`<br>`open: true` |
| **自动行为** | 流式输出时若 `autoOpen && autoSelect` 为 true，自动打开 |
| **涉及组件** | `MessageGroup`(ToolCall) → `ArtifactsProvider` → `ChatBox` → `ArtifactFileDetail` |
| **文件路径** | `src/components/workspace/messages/message-group.tsx`<br>`src/components/workspace/artifacts/context.tsx`<br>`src/components/workspace/chats/chat-box.tsx`<br>`src/components/workspace/artifacts/artifact-file-detail.tsx` |

---

### 6. 点击 Artifact 文件列表项 → 打开 Artifact 详情⚠️

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 ArtifactFileList 中的文件卡片 |
| **交互效果** | 右侧面板切换为 ArtifactFileDetail，显示文件内容 |
| **状态变化** | `selectedArtifact` 设为文件路径，`open: true` |
| **面板布局** | 从 chat:100/artifacts:0 切换到 chat:60/artifacts:40 |
| **涉及组件** | `ArtifactFileList` → `ArtifactsProvider` → `ChatBox` → `ArtifactFileDetail` |
| **文件路径** | `src/components/workspace/artifacts/artifact-file-list.tsx`<br>`src/components/workspace/artifacts/context.tsx`<br>`src/components/workspace/chats/chat-box.tsx`<br>`src/components/workspace/artifacts/artifact-file-detail.tsx` |

---

### 7. Artifact 详情面板交互

| 交互 | 说明 | 涉及组件 |
|------|------|----------|
| **代码/预览切换** | 点击 ToggleGroup 切换代码编辑器和预览模式（支持 HTML、Markdown） | `ArtifactFileDetail` |
| **复制代码** | 点击复制按钮，将代码内容复制到剪贴板 | `ArtifactFileDetail` → `CopyButton` |
| **下载文件** | 点击下载链接，下载 artifact 文件 | `ArtifactFileDetail` |
| **新窗口打开** | 点击链接，在新标签页打开 artifact | `ArtifactFileDetail` |
| **安装 Skill** | 对 .skill 文件，点击安装按钮调用 `installSkill()` API | `ArtifactFileDetail` |
| **切换文件** | 通过下拉选择器切换不同 artifact | `ArtifactFileDetail` |
| **关闭面板** | 点击关闭按钮，`open: false`，面板收起 | `ArtifactFileDetail` → `ArtifactsProvider` |

**文件路径**: `src/components/workspace/artifacts/artifact-file-detail.tsx`

---

### 8. 点击搜索结果 → 打开外部链接

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 web_search 工具返回的搜索结果徽章 |
| **交互效果** | 在新标签页打开对应 URL |
| **涉及组件** | `MessageGroup`(ToolCall - web_search) |
| **文件路径** | `src/components/workspace/messages/message-group.tsx` |

---

### 9. 图片搜索结果交互

| 项目 | 说明 |
|------|------|
| **触发方式** | 悬停显示 tooltip；点击打开源链接 |
| **交互效果** | 悬停时显示图片详情 tooltip，点击在新标签页打开图片来源 |
| **涉及组件** | `MessageGroup`(ToolCall - image_search) |
| **文件路径** | `src/components/workspace/messages/message-group.tsx` |

---

### 10. 点击 web_fetch 步骤 → 打开网页

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 web_fetch 类型的工具调用步骤标题 |
| **交互效果** | 在新标签页打开对应 URL |
| **涉及组件** | `MessageGroup`(ToolCall - web_fetch) |
| **文件路径** | `src/components/workspace/messages/message-group.tsx` |

---

### 11. 消息中的附件文件交互⚠️

| 项目 | 说明 |
|------|------|
| **触发方式** | 查看/点击消息中的附件文件 |
| **交互效果** | 图片文件：悬停时 scale 放大 (hover:scale-105)，点击在新标签页打开<br>普通文件：显示文件图标、文件名、类型徽章和大小 |
| **上传状态** | 上传中显示 spinner + "Uploading..." 文字，降低透明度 |
| **涉及组件** | `MessageListItem` → `RichFilesList` → `RichFileCard` |
| **文件路径** | `src/components/workspace/messages/message-list-item.tsx` |

---

### 12. 代码块复制

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击代码块右上角的复制按钮 |
| **交互效果** | 代码内容复制到剪贴板，图标变为绿色 ✓，2 秒后恢复 |
| **涉及组件** | `CodeBlock` → `CopyButton` |
| **文件路径** | `src/components/ai-elements/code-block.tsx` |

---

### 13. 子任务卡片展开/收起❓

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 SubtaskCard 卡片头部 |
| **交互效果** | 展开或收起任务详情（prompt、当前工具调用、结果/错误） |
| **状态指示** | `in_progress`: 旋转 spinner + 发光边框 + 闪烁文字<br>`completed`: 绿色 ✓ 图标<br>`failed`: 红色 ✗ 图标 |
| **动画** | ChevronDown 旋转 180° |
| **涉及组件** | `SubtaskCard` |
| **文件路径** | `src/components/workspace/messages/subtask-card.tsx` |

---

### 14. 对话区域自动滚动 & 回到底部

| 项目 | 说明 |
|------|------|
| **触发方式** | 新消息到达时自动滚动；手动上滑后出现回到底部按钮 |
| **交互效果** | 点击 ArrowDown 按钮，滚动回最新消息 |
| **涉及组件** | `Conversation` (use-stick-to-bottom 库) → `ScrollToBottomButton` |
| **文件路径** | `src/components/ai-elements/conversation.tsx` |

---

### 15. Markdown 内容中的链接交互

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击 Markdown 内容中的链接 |
| **交互效果** | `citation:` 前缀链接：使用 `CitationLink` 组件处理<br>普通链接：`target="_blank"` 在新标签页打开 |
| **涉及组件** | `MarkdownContent` → `CitationLink` |
| **文件路径** | `src/components/workspace/messages/markdown-content.tsx` |

---

### 16. 建议卡片点击❓

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击建议按钮 |
| **交互效果** | 触发 `onClick` 回调，通常将建议文本填入输入框 |
| **动画** | 各建议卡片交错渐入（staggered fade-in） |
| **涉及组件** | `Suggestion` |
| **文件路径** | `src/components/ai-elements/suggestion.tsx` |

---

### 17. 消息分支切换❓

| 项目 | 说明 |
|------|------|
| **触发方式** | 点击消息分支的上一条/下一条按钮 |
| **交互效果** | 切换到不同的消息分支版本，显示 "2 of 3" 样式的指示器 |
| **可见条件** | 仅当 `totalBranches > 1` 时显示 |
| **涉及组件** | `MessageBranch` |
| **文件路径** | `src/components/ai-elements/message.tsx` |

---

## 状态管理概览

### ArtifactsProvider 状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `artifacts` | `string[]` | artifact 文件路径列表 |
| `selectedArtifact` | `string \| null` | 当前选中的 artifact |
| `open` | `boolean` | artifact 面板是否可见 |
| `autoSelect` | `boolean` | 是否自动选中新 artifact |
| `autoOpen` | `boolean` | 是否自动打开面板 |

### 关键方法

| 方法 | 说明 |
|------|------|
| `select(filepath, autoSelect?)` | 选中 artifact 并可选地控制自动选择 |
| `deselect()` | 清除选中、重置自动模式、关闭面板 |
| `setOpen(isOpen)` | 切换面板可见性 |

### 面板布局状态

| 模式 | chat 占比 | artifacts 占比 | 触发条件 |
|------|-----------|----------------|----------|
| CLOSED | 100% | 0% | 无 artifact 或手动关闭 |
| OPEN | 60% | 40% | 选中 artifact 或手动打开 |

---

## 交互模式总结

### 展开/收起模式
多个组件复用同一模式：`isOpen` 状态 + ChevronDown 旋转 180° + Collapsible 滑入/滑出动画。
- Reasoning（思考过程）
- ChainOfThought（工具调用链）
- SubtaskCard（子任务卡片）
- Task（任务组件）

### 复制到剪贴板模式
统一模式：点击 → `navigator.clipboard.writeText()` → 图标切换为 CheckIcon（绿色）→ 2000ms 后恢复。
- 消息复制（MessageToolbar）
- 代码块复制（CodeBlock）
- Artifact 代码复制（ArtifactFileDetail）

### 工具调用图标映射

| 工具类型 | 图标 | 交互 |
|----------|------|------|
| `web_search` | SearchIcon | 点击结果徽章打开链接 |
| `image_search` | SearchIcon | 悬停查看 tooltip，点击打开源链接 |
| `web_fetch` | GlobeIcon | 点击标题打开网页 |
| `write_file` | NotebookPenIcon | 点击在 Artifact 面板展示 |
| `bash` | SquareTerminalIcon | 显示代码块 |
| `read_file` | BookOpenTextIcon | 显示文件路径 |
| `ls` | FolderOpenIcon | 显示目录内容 |
| 其他工具 | WrenchIcon | 默认显示 |
