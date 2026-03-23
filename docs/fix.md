我先做了只读诊断，重点看了构建配置、线程/消息主链路、环境配置和当前验证结果。结论是：项目现在“能打包演示”，但离“可稳定开发、可持续迭代”还有一段距离。

**主要问题**
1. 构建链路和项目说明已经明显漂移。
[package.json](D:/Code/chat-demo-webpack/package.json#L7) 实际用的是 Webpack，而 [README.md](D:/Code/chat-demo-webpack/README.md#L3) 还写着 `Vite + React + TypeScript`，并且提到了不存在的 `vite.config.ts`。同时 README 和输入框文案还出现了乱码，[README.md](D:/Code/chat-demo-webpack/README.md#L3)、[InputBox.tsx](D:/Code/chat-demo-webpack/src/components/InputBox.tsx#L33)，这会直接影响新人接手和日常维护。

2. TypeScript 配置和现有依赖不匹配，类型系统已经失效。
[tsconfig.json](D:/Code/chat-demo-webpack/tsconfig.json#L3) 仍是 `target: es5`、`moduleResolution: node`，导致 `@langchain/langgraph-sdk` 的模块解析失败、`top-level await` 报错、`import.meta.env` 也没有完整声明。`npm run typecheck` 当前是失败的，而且不是零散报错，是配置层和业务层同时失效。

3. 环境变量设计不一致，代码里有“Vite 命名”和“Next 命名”混用。
[env.ts](D:/Code/chat-demo-webpack/src/env.ts#L1) 只定义了 `VITE_STATIC_WEBSITE_ONLY` 映射出来的布尔值，但 [src/core/config/index.ts](D:/Code/chat-demo-webpack/src/core/config/index.ts#L3) 又读取 `NEXT_PUBLIC_BACKEND_BASE_URL` 和 `NEXT_PUBLIC_LANGGRAPH_BASE_URL`。这也是 typecheck 失败的直接原因之一，也会让运行时行为变得不可预测。

4. 线程数据存在两套来源，状态模型是分裂的。
一边 [ThreadProvider.tsx](D:/Code/chat-demo-webpack/src/providers/ThreadProvider.tsx#L14) 直接从本地静态线程数据生成当前线程；另一边 [ChatDemo.tsx](D:/Code/chat-demo-webpack/src/components/ChatDemo.tsx#L13) 又通过 `useThreadStream` 走流式接口，而且还写死了 `isMock: true`。再加上 [src/data/threads/index.ts](D:/Code/chat-demo-webpack/src/data/threads/index.ts#L1) 把 13 个 `thread.json` 全量静态导入，导致“本地 demo 数据”和“API/流式状态”并存，很难保证后续行为一致。

5. API Client 有隐含状态问题。
[getAPIClient](D:/Code/chat-demo-webpack/src/core/api/api-client.ts#L33) 用单例缓存客户端，第一次传入的 `isMock` 会决定后续所有请求走哪个 base URL。也就是说，一旦先创建了 mock client，后面即使想切到真实后端，单例也不会切，这种问题很隐蔽。

6. 包体积过大，演示数据被直接打进前端包。
我跑了 `npm run build`，入口总大小是 `12.1 MiB`，其中 `vendors` `10.6 MiB`、`main` `1.48 MiB`，Webpack 已经给出性能警告。同时 `src/data/threads` 目录文件总量约 `13.16 MB`，而它们现在是被 [src/data/threads/index.ts](D:/Code/chat-demo-webpack/src/data/threads/index.ts#L1) 静态 import 的，这基本可以确认是包体积膨胀的重要来源。

7. 仓库里有未收敛的“备份代码/缺失组件/半成品类型”。
`typecheck` 报错里有一大批来自 `src/backup/*`，但 [tsconfig.json](D:/Code/chat-demo-webpack/tsconfig.json#L23) 把整个 `src` 都纳入检查；同时业务组件在引用不存在的 UI 包装层，比如 [src/components/ai-elements/context.tsx](D:/Code/chat-demo-webpack/src/components/ai-elements/context.tsx#L9) 引用 `@/components/ui/progress`、`scroll-area`，但 `src/components/ui` 目录里没有这些文件。另一个明显信号是 [src/types/thread.ts](D:/Code/chat-demo-webpack/src/types/thread.ts#L8) 里仍有 `todos?: any[]`，和仓库约定也不一致。

**改进方案**
1. 先做“地基修复”，目标是恢复可开发状态。
统一构建口径，明确项目到底是 Webpack 还是回到 Vite；修正 README 和环境变量命名；补全 `ImportMetaEnv` 类型；把 `tsconfig` 升到适配当前依赖的配置，比如更现代的 `target` 和 `moduleResolution`；让 `npm run typecheck` 先恢复通过。

2. 再做“代码收口”，目标是减少分裂和噪音。
把 `src/backup` 从主编译范围移出，或者迁到仓库外的归档目录；补齐缺失的 `ui` 组件包装层，或者删除无效引用；清理未使用变量和明显错误比较；把 `ThreadProvider` 与 `useThreadStream` 收敛成一套线程来源，不要再同时依赖静态 JSON 和流式接口。

3. 最后做“性能和结构优化”，目标是让项目适合持续迭代。
把 `src/data/threads` 改成按需加载，或挪到 mock server/public 侧，避免全部进入首包；对 artifacts、markdown preview、复杂 ai-elements 做路由级或组件级懒加载；顺手梳理依赖，去掉暂时没用上的大包。这个阶段完成后，再补一轮 `build` 体积基线和核心页面性能检查。

**建议的执行顺序**
1. 修 `tsconfig`、`env`、README，让 `typecheck` 先过。
2. 清理 `src/backup` 和缺失组件引用。
3. 重构线程数据来源，统一 mock/real API 模式。
4. 处理静态线程数据和大包体积问题。

验证结果方面，当前 `npm run build` 能通过，但有明显体积警告；`npm run typecheck` 失败，说明现在还不适合作为稳定开发基线。仓库里也有你现有的未提交改动，我这次没有动它们。

如果你愿意，我下一步可以直接按这个顺序帮你落第一阶段，把“类型检查恢复通过 + 文档/配置统一”先做掉。