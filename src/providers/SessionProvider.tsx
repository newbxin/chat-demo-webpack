import type { FileInMessage } from "@/core/messages/utils";
import type { Message } from "@langchain/langgraph-sdk";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import {
  createThreadStreamState,
  type ThreadStreamState,
} from "@/core/threads/stream-state";
import type { AgentThreadContext } from "@/core/threads/types";
import type { ThreadState } from "@/types/thread";

export enum SessionType {
  main = "main",
  agent = "agent",
}

type ThreadStateUpdater =
  | ThreadStreamState
  | ((prev: ThreadStreamState) => ThreadStreamState);

type ThreadContextUpdater =
  | AgentThreadContext
  | ((prev: AgentThreadContext) => AgentThreadContext);

type SessionStoreState = {
  threadState: ThreadStreamState;
  threadContext: AgentThreadContext;
  optimisticMessages: Message[];
};

type SessionAction =
  | {
      type: "setThreadState";
      payload: ThreadStateUpdater;
    }
  | {
      type: "setThreadId";
      payload: string | null;
    }
  | {
      type: "setThreadContext";
      payload: ThreadContextUpdater;
    }
  | {
      type: "setIsLoading";
      payload: boolean;
    }
  | {
      type: "setIsThreadLoading";
      payload: boolean;
    }
  | {
      type: "setMessages";
      payload: Message[];
    }
  | {
      type: "setThreadField";
      payload: {
        key: keyof ThreadStreamState;
        value: ThreadStreamState[keyof ThreadStreamState];
      };
    }
  | {
      type: "setThreadContextField";
      payload: {
        key: keyof AgentThreadContext;
        value: AgentThreadContext[keyof AgentThreadContext];
      };
    }
  | {
      type: "setOptimisticMessages";
      payload: Message[] | ((prev: Message[]) => Message[]);
    }
  | {
      type: "reset";
      payload: {
        threadId?: string | null;
        initialState?: ThreadState | null;
        initialThreadContext?: AgentThreadContext | null;
      };
    }
  | {
      type: "resetThreadContext";
      payload?: AgentThreadContext | null;
    }
  | {
      type: "setThreadFiles";
      payload: FileInMessage[];
    };

type SessionActionType = SessionAction["type"];

type SessionContextValue = {
  threadState: ThreadStreamState;
  threadContext: AgentThreadContext;
  thread: ThreadState;
  threadId: string | null;
  runId?: string;
  isLoading: boolean;
  isThreadLoading: boolean;
  messages: Message[];
  values: ThreadStreamState["values"];
  error?: string;
  optimisticMessages: Message[];
};

type SessionDispatch = {
  setThreadState: (updater: ThreadStateUpdater) => void;
  setThreadId: (threadId: string | null) => void;
  setThreadContext: (updater: ThreadContextUpdater) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsThreadLoading: (isThreadLoading: boolean) => void;
  setMessages: (messages: Message[]) => void;
  setThreadField: <K extends keyof ThreadStreamState>(
    key: K,
    value: ThreadStreamState[K],
  ) => void;
  setThreadContextField: <K extends keyof AgentThreadContext>(
    key: K,
    value: AgentThreadContext[K],
  ) => void;
  setOptimisticMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  resetThreadState: (payload: {
    threadId?: string | null;
    initialState?: ThreadState | null;
    initialThreadContext?: AgentThreadContext | null;
  }) => void;
  resetThreadContext: (threadContext?: AgentThreadContext | null) => void;
  setThreadFiles: (files: FileInMessage[]) => void;
};

const MainAction = {
  setThreadState: "setThreadState",
  setThreadId: "setThreadId",
  setThreadContext: "setThreadContext",
  setIsLoading: "setIsLoading",
  setIsThreadLoading: "setIsThreadLoading",
  setMessages: "setMessages",
  setThreadField: "setThreadField",
  setThreadContextField: "setThreadContextField",
  setOptimisticMessages: "setOptimisticMessages",
  reset: "reset",
  resetThreadContext: "resetThreadContext",
  setThreadFiles: "setThreadFiles",
} as const satisfies Record<string, SessionActionType>;

const AgentAction = {
  setThreadState: "setThreadState",
  setThreadId: "setThreadId",
  setThreadContext: "setThreadContext",
  setIsLoading: "setIsLoading",
  setIsThreadLoading: "setIsThreadLoading",
  setMessages: "setMessages",
  setThreadField: "setThreadField",
  setThreadContextField: "setThreadContextField",
  setOptimisticMessages: "setOptimisticMessages",
  reset: "reset",
  resetThreadContext: "resetThreadContext",
  setThreadFiles: "setThreadFiles",
} as const satisfies Record<string, SessionActionType>;

type MainAction = typeof MainAction;
type AgentAction = typeof AgentAction;

function createEmptyThreadContext(): AgentThreadContext {
  return {
    thread_id: "",
    model_name: undefined,
    thinking_enabled: false,
    is_plan_mode: false,
    subagent_enabled: false,
    reasoning_effort: undefined,
    agent_name: undefined,
  };
}

const initMainContext: SessionStoreState = {
  threadState: createThreadStreamState(null, null),
  threadContext: createEmptyThreadContext(),
  optimisticMessages: [],
};

const initAgentContext: SessionStoreState = {
  threadState: createThreadStreamState(null, null),
  threadContext: createEmptyThreadContext(),
  optimisticMessages: [],
};

const MainSessionContext = createContext<SessionContextValue | null>(null);
const MainSessionDispatchContext = createContext<SessionDispatch | null>(null);
const AgentSessionContext = createContext<SessionContextValue | null>(null);
const AgentSessionDispatchContext = createContext<SessionDispatch | null>(null);

function syncThreadMessages(
  threadState: ThreadStreamState,
  messages: Message[],
): ThreadStreamState {
  return {
    ...threadState,
    messages,
    values: {
      ...threadState.values,
      messages,
    },
  };
}

function sessionReducer(
  state: SessionStoreState,
  action: SessionAction,
): SessionStoreState {
  switch (action.type) {
    case "setThreadState": {
      const nextThreadState =
        typeof action.payload === "function"
          ? action.payload(state.threadState)
          : action.payload;
      return {
        ...state,
        threadState: nextThreadState,
      };
    }
    case "setThreadId": {
      return {
        ...state,
        threadState: {
          ...state.threadState,
          threadId: action.payload,
        },
      };
    }
    case "setThreadContext": {
      const nextThreadContext =
        typeof action.payload === "function"
          ? action.payload(state.threadContext)
          : action.payload;
      return {
        ...state,
        threadContext: nextThreadContext,
      };
    }
    case "setIsLoading": {
      return {
        ...state,
        threadState: {
          ...state.threadState,
          isLoading: action.payload,
        },
      };
    }
    case "setIsThreadLoading": {
      return {
        ...state,
        threadState: {
          ...state.threadState,
          isThreadLoading: action.payload,
        },
      };
    }
    case "setMessages": {
      return {
        ...state,
        threadState: syncThreadMessages(state.threadState, action.payload),
      };
    }
    case "setThreadField": {
      const { key, value } = action.payload;
      return {
        ...state,
        threadState:
          key === "messages"
            ? syncThreadMessages(state.threadState, value as Message[])
            : {
                ...state.threadState,
                [key]: value,
            },
      };
    }
    case "setThreadContextField": {
      const { key, value } = action.payload;
      return {
        ...state,
        threadContext: {
          ...state.threadContext,
          [key]: value,
        },
      };
    }
    case "setOptimisticMessages": {
      const nextOptimisticMessages =
        typeof action.payload === "function"
          ? action.payload(state.optimisticMessages)
          : action.payload;
      return {
        ...state,
        optimisticMessages: nextOptimisticMessages,
      };
    }
    case "reset": {
      const { threadId, initialState, initialThreadContext } = action.payload;
      return {
        threadState: createThreadStreamState(threadId ?? null, initialState),
        threadContext: initialThreadContext ?? createEmptyThreadContext(),
        optimisticMessages: [],
      };
    }
    case "resetThreadContext": {
      return {
        ...state,
        threadContext: action.payload ?? createEmptyThreadContext(),
      };
    }
    case "setThreadFiles": {
      const files = action.payload;
      const messages = [...state.threadState.messages];
      // Find the last human message and set its files
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === "human") {
          messages[i] = {
            ...messages[i],
            additional_kwargs: {
              ...messages[i].additional_kwargs,
              files,
            },
          };
          break;
        }
      }
      return {
        ...state,
        threadState: syncThreadMessages(state.threadState, messages),
      };
    }
    default:
      return state;
  }
}

function buildContextValue(state: SessionStoreState): SessionContextValue {
  const mergedMessages =
    state.optimisticMessages.length > 0
      ? [...state.threadState.messages, ...state.optimisticMessages]
      : state.threadState.messages;
  const thread: ThreadState = {
    isLoading: state.threadState.isLoading,
    isThreadLoading: state.threadState.isThreadLoading,
    messages: mergedMessages,
    values: {
      ...state.threadState.values,
      messages: mergedMessages,
    },
  };

  return {
    threadState: state.threadState,
    threadContext: state.threadContext,
    thread,
    threadId: state.threadState.threadId,
    runId: state.threadState.runId,
    isLoading: state.threadState.isLoading,
    isThreadLoading: state.threadState.isThreadLoading,
    messages: state.threadState.messages,
    values: state.threadState.values,
    error: state.threadState.error,
    optimisticMessages: state.optimisticMessages,
  };
}

function useSessionDispatchValue(dispatch: Dispatch<SessionAction>): SessionDispatch {
  const setThreadState = useCallback(
    (updater: ThreadStateUpdater) => {
      dispatch({
        type: "setThreadState",
        payload: updater,
      });
    },
    [dispatch],
  );

  const setThreadContext = useCallback(
    (updater: ThreadContextUpdater) => {
      dispatch({
        type: "setThreadContext",
        payload: updater,
      });
    },
    [dispatch],
  );

  const setThreadId = useCallback(
    (threadId: string | null) => {
      dispatch({
        type: "setThreadId",
        payload: threadId,
      });
    },
    [dispatch],
  );

  const setIsLoading = useCallback(
    (isLoading: boolean) => {
      dispatch({
        type: "setIsLoading",
        payload: isLoading,
      });
    },
    [dispatch],
  );

  const setIsThreadLoading = useCallback(
    (isThreadLoading: boolean) => {
      dispatch({
        type: "setIsThreadLoading",
        payload: isThreadLoading,
      });
    },
    [dispatch],
  );

  const setMessages = useCallback(
    (messages: Message[]) => {
      dispatch({
        type: "setMessages",
        payload: messages,
      });
    },
    [dispatch],
  );

  const setThreadField = useCallback(
    <K extends keyof ThreadStreamState>(key: K, value: ThreadStreamState[K]) => {
      dispatch({
        type: "setThreadField",
        payload: {
          key,
          value: value as ThreadStreamState[keyof ThreadStreamState],
        },
      });
    },
    [dispatch],
  );

  const setThreadContextField = useCallback(
    <K extends keyof AgentThreadContext>(key: K, value: AgentThreadContext[K]) => {
      dispatch({
        type: "setThreadContextField",
        payload: {
          key,
          value: value as AgentThreadContext[keyof AgentThreadContext],
        },
      });
    },
    [dispatch],
  );

  const setOptimisticMessages = useCallback(
    (messages: Message[] | ((prev: Message[]) => Message[])) => {
      dispatch({
        type: "setOptimisticMessages",
        payload: messages,
      });
    },
    [dispatch],
  );

  const resetThreadState = useCallback(
    (payload: {
      threadId?: string | null;
      initialState?: ThreadState | null;
      initialThreadContext?: AgentThreadContext | null;
    }) => {
      dispatch({
        type: "reset",
        payload,
      });
    },
    [dispatch],
  );

  const resetThreadContext = useCallback(
    (threadContext?: AgentThreadContext | null) => {
      dispatch({
        type: "resetThreadContext",
        payload: threadContext,
      });
    },
    [dispatch],
  );

  const setThreadFiles = useCallback(
    (files: FileInMessage[]) => {
      dispatch({
        type: "setThreadFiles",
        payload: files,
      });
    },
    [dispatch],
  );

  return useMemo(
    () => ({
      setThreadState,
      setThreadId,
      setThreadContext,
      setIsLoading,
      setIsThreadLoading,
      setMessages,
      setThreadField,
      setThreadContextField,
      setOptimisticMessages,
      resetThreadState,
      resetThreadContext,
      setThreadFiles,
    }),
    [
      resetThreadContext,
      resetThreadState,
      setIsLoading,
      setIsThreadLoading,
      setMessages,
      setOptimisticMessages,
      setThreadContext,
      setThreadContextField,
      setThreadField,
      setThreadId,
      setThreadState,
      setThreadFiles,
    ],
  );
}

type SessionProviderProps = {
  children: ReactNode;
  initialThreadId?: string | null;
  initialState?: ThreadState | null;
  initialThreadContext?: AgentThreadContext | null;
};

export function MainProvider({
  children,
  initialThreadId,
  initialState,
  initialThreadContext,
}: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, initMainContext);
  const dispatchValue = useSessionDispatchValue(dispatch);
  const contextValue = useMemo(() => buildContextValue(state), [state]);

  useEffect(() => {
    dispatch({
      type: "reset",
      payload: {
        threadId: initialThreadId ?? null,
        initialState,
        initialThreadContext,
      },
    });
  }, [initialState, initialThreadContext, initialThreadId]);

  return (
    <MainSessionDispatchContext.Provider value={dispatchValue}>
      <MainSessionContext.Provider value={contextValue}>
        {children}
      </MainSessionContext.Provider>
    </MainSessionDispatchContext.Provider>
  );
}

export function AgentProvider({
  children,
  initialThreadId,
  initialState,
  initialThreadContext,
}: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, initAgentContext);
  const dispatchValue = useSessionDispatchValue(dispatch);
  const contextValue = useMemo(() => buildContextValue(state), [state]);

  useEffect(() => {
    dispatch({
      type: "reset",
      payload: {
        threadId: initialThreadId ?? null,
        initialState,
        initialThreadContext,
      },
    });
  }, [initialState, initialThreadContext, initialThreadId]);

  return (
    <AgentSessionDispatchContext.Provider value={dispatchValue}>
      <AgentSessionContext.Provider value={contextValue}>
        {children}
      </AgentSessionContext.Provider>
    </AgentSessionDispatchContext.Provider>
  );
}

export function useSessionContext(
  sessionType: SessionType.main,
): [SessionContextValue, SessionDispatch, MainAction];
export function useSessionContext(
  sessionType: SessionType.agent,
): [SessionContextValue, SessionDispatch, AgentAction];
export function useSessionContext(
  sessionType: SessionType,
): [SessionContextValue, SessionDispatch, MainAction | AgentAction];

export function useSessionContext(sessionType: SessionType) {
  const mainContext = useContext(MainSessionContext);
  const mainDispatch = useContext(MainSessionDispatchContext);
  const agentContext = useContext(AgentSessionContext);
  const agentDispatch = useContext(AgentSessionDispatchContext);

  if (sessionType === SessionType.main) {
    if (!mainContext || !mainDispatch) {
      throw new Error("Main session context is not available.");
    }
    return [mainContext, mainDispatch, MainAction];
  }

  if (!agentContext || !agentDispatch) {
    throw new Error("Agent session context is not available.");
  }
  return [agentContext, agentDispatch, AgentAction];
}

export { AgentAction, MainAction, initAgentContext, initMainContext, sessionReducer };
