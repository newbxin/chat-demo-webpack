import type { Message } from "@langchain/langgraph-sdk";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  createThreadStreamState,
  type ThreadStreamState,
} from "@/core/threads/stream-state";
import type { ThreadState } from "@/types/thread";

// 应用支持的会话类型。
// - main: 主聊天窗口
// - agent: agent 内页聊天窗口
// 两类会话状态完全隔离，避免消息和加载态串线。
export enum SessionType {
  main = "main",
  agent = "agent",
}

// 以 SessionType 分桶的状态存储结构。
type SessionStateMap = Record<SessionType, ThreadStreamState>;
type SessionMessagesMap = Record<SessionType, Message[]>;

// 与 React setState 语义保持一致：
// 既支持直接传值，也支持函数式更新。
type StateUpdater<T> = T | ((prev: T) => T);

// 历史回填/切换线程时使用的参数。
type HydrateSessionPayload = {
  threadId?: string | null;
  initialState?: ThreadState | null;
};

// Context 暴露的底层能力都显式接收 sessionType。
// useSession(sessionType) 会在此基础上返回绑定当前会话的便捷 API。
type SessionContextValue = {
  getThreadState: (sessionType: SessionType) => ThreadStreamState;
  getOptimisticMessages: (sessionType: SessionType) => Message[];
  setThreadState: (
    sessionType: SessionType,
    updater: StateUpdater<ThreadStreamState>,
  ) => void;
  setThreadStateField: <K extends keyof ThreadStreamState>(
    sessionType: SessionType,
    key: K,
    valueOrUpdater: StateUpdater<ThreadStreamState[K]>,
  ) => void;
  setOptimisticMessages: (
    sessionType: SessionType,
    updater: StateUpdater<Message[]>,
  ) => void;
  hydrateSession: (
    sessionType: SessionType,
    payload?: HydrateSessionPayload,
  ) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSION_TYPES: SessionType[] = [SessionType.main, SessionType.agent];

function resolveUpdater<T>(previous: T, updater: StateUpdater<T>): T {
  if (typeof updater === "function") {
    return (updater as (prev: T) => T)(previous);
  }
  return updater;
}

function createInitialSessionStates(): SessionStateMap {
  return {
    [SessionType.main]: createThreadStreamState(),
    [SessionType.agent]: createThreadStreamState(),
  };
}

function createInitialOptimisticMessages(): SessionMessagesMap {
  return {
    [SessionType.main]: [],
    [SessionType.agent]: [],
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // 每个会话对应一份“权威流式状态”（来自服务端事件）。
  const [sessions, setSessions] = useState<SessionStateMap>(
    createInitialSessionStates,
  );

  // 每个会话对应一份“乐观消息队列”，用于提升发送时的即时反馈。
  const [optimisticMessagesMap, setOptimisticMessagesMap] =
    useState<SessionMessagesMap>(createInitialOptimisticMessages);

  const getThreadState = useCallback(
    (sessionType: SessionType) => sessions[sessionType],
    [sessions],
  );

  const getOptimisticMessages = useCallback(
    (sessionType: SessionType) => optimisticMessagesMap[sessionType],
    [optimisticMessagesMap],
  );

  // 整体更新某个会话的 ThreadStreamState。
  const setThreadState = useCallback(
    (sessionType: SessionType, updater: StateUpdater<ThreadStreamState>) => {
      setSessions((prev) => ({
        ...prev,
        [sessionType]: resolveUpdater(prev[sessionType], updater),
      }));
    },
    [],
  );

  // 单字段更新某个会话的 ThreadStreamState。
  // 常用于 threadId/runId/isLoading/error 这类局部变更。
  const setThreadStateField = useCallback(
    <K extends keyof ThreadStreamState>(
      sessionType: SessionType,
      key: K,
      valueOrUpdater: StateUpdater<ThreadStreamState[K]>,
    ) => {
      setSessions((prev) => {
        const nextValue = resolveUpdater(prev[sessionType][key], valueOrUpdater);
        return {
          ...prev,
          [sessionType]: {
            ...prev[sessionType],
            [key]: nextValue,
          },
        };
      });
    },
    [],
  );

  const setOptimisticMessages = useCallback(
    (sessionType: SessionType, updater: StateUpdater<Message[]>) => {
      setOptimisticMessagesMap((prev) => ({
        ...prev,
        [sessionType]: resolveUpdater(prev[sessionType], updater),
      }));
    },
    [],
  );

  // 会话回填：切换线程或恢复历史时重建状态。
  // 同时清空乐观消息，避免旧占位消息污染新会话。
  const hydrateSession = useCallback(
    (sessionType: SessionType, payload?: HydrateSessionPayload) => {
      const nextThreadId = payload?.threadId ?? null;
      const nextInitialState = payload?.initialState ?? null;

      setSessions((prev) => ({
        ...prev,
        [sessionType]: createThreadStreamState(nextThreadId, nextInitialState),
      }));

      setOptimisticMessagesMap((prev) => ({
        ...prev,
        [sessionType]: [],
      }));
    },
    [],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      getThreadState,
      getOptimisticMessages,
      setThreadState,
      setThreadStateField,
      setOptimisticMessages,
      hydrateSession,
    }),
    [
      getOptimisticMessages,
      getThreadState,
      hydrateSession,
      setOptimisticMessages,
      setThreadState,
      setThreadStateField,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// 会话绑定的消费 Hook。
// 业务层只需传一次 sessionType，后续直接使用扁平字段和 setter。
export function useSession(sessionType: SessionType) {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  const threadState = context.getThreadState(sessionType);
  const optimisticMessages = context.getOptimisticMessages(sessionType);

  // 提供给 UI 的合并态：
  // 将真实消息与乐观消息合并，并确保 messages 与 values.messages 始终一致。
  const thread = useMemo<ThreadState>(() => {
    if (optimisticMessages.length > 0) {
      return {
        isLoading: threadState.isLoading,
        isThreadLoading: threadState.isThreadLoading,
        messages: [...threadState.messages, ...optimisticMessages],
        values: {
          ...threadState.values,
          messages: [...threadState.messages, ...optimisticMessages],
        },
      };
    }

    return {
      isLoading: threadState.isLoading,
      isThreadLoading: threadState.isThreadLoading,
      messages: threadState.messages,
      values: {
        ...threadState.values,
        messages: threadState.messages,
      },
    };
  }, [optimisticMessages, threadState]);

  const boundSetThreadState = useCallback(
    (updater: StateUpdater<ThreadStreamState>) => {
      context.setThreadState(sessionType, updater);
    },
    [context, sessionType],
  );

  const boundSetThreadStateField = useCallback(
    <K extends keyof ThreadStreamState>(
      key: K,
      valueOrUpdater: StateUpdater<ThreadStreamState[K]>,
    ) => {
      context.setThreadStateField(sessionType, key, valueOrUpdater);
    },
    [context, sessionType],
  );

  const boundSetOptimisticMessages = useCallback(
    (updater: StateUpdater<Message[]>) => {
      context.setOptimisticMessages(sessionType, updater);
    },
    [context, sessionType],
  );

  const boundHydrateSession = useCallback(
    (payload?: HydrateSessionPayload) => {
      context.hydrateSession(sessionType, payload);
    },
    [context, sessionType],
  );

  return {
    threadState,
    threadId: threadState.threadId,
    runId: threadState.runId,
    isLoading: threadState.isLoading,
    isThreadLoading: threadState.isThreadLoading,
    messages: threadState.messages,
    values: threadState.values,
    error: threadState.error,
    thread,
    setThreadState: boundSetThreadState,
    setThreadStateField: boundSetThreadStateField,
    setOptimisticMessages: boundSetOptimisticMessages,
    hydrateSession: boundHydrateSession,
    hydrateSessionByType: context.hydrateSession,
  };
}

// 跨会话管理 Hook（偏底层）。
// 普通业务组件优先使用 useSession(sessionType)。
export function useSessionManager() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionManager must be used within SessionProvider");
  }

  return {
    sessionTypes: SESSION_TYPES,
    getThreadState: context.getThreadState,
    getOptimisticMessages: context.getOptimisticMessages,
    setThreadState: context.setThreadState,
    setThreadStateField: context.setThreadStateField,
    setOptimisticMessages: context.setOptimisticMessages,
    hydrateSession: context.hydrateSession,
  };
}
