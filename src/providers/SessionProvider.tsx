import type { Message } from "@langchain/langgraph-sdk";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { ThreadState } from "@/types/thread";
import {
  createThreadStreamState,
  type ThreadStreamState,
} from "@/core/threads/stream-state";

export enum SessionType {
  main = "main",
  agent = "agent",
}

type SessionStateMap = Record<SessionType, ThreadStreamState>;
type SessionMessagesMap = Record<SessionType, Message[]>;

type StateUpdater<T> = T | ((prev: T) => T);

type HydrateSessionPayload = {
  threadId?: string | null;
  initialState?: ThreadState | null;
};

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
  const [sessions, setSessions] = useState<SessionStateMap>(
    createInitialSessionStates,
  );
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

  const setThreadState = useCallback(
    (sessionType: SessionType, updater: StateUpdater<ThreadStreamState>) => {
      setSessions((prev) => ({
        ...prev,
        [sessionType]: resolveUpdater(prev[sessionType], updater),
      }));
    },
    [],
  );

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

export function useSession(sessionType: SessionType) {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  const threadState = context.getThreadState(sessionType);
  const optimisticMessages = context.getOptimisticMessages(sessionType);

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
