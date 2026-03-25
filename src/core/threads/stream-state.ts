import type { Message } from "@langchain/langgraph-sdk";

import type { ThreadState } from "@/types/thread";

export type ThreadStreamValues = ThreadState["values"];

export type ThreadStreamState = {
  threadId: string | null;
  runId?: string;
  isLoading: boolean;
  isThreadLoading: boolean;
  messages: Message[];
  values: ThreadStreamValues;
  error?: string;
};

export function createEmptyThreadState(threadId?: string | null): ThreadStreamState {
  return {
    threadId: threadId ?? null,
    isLoading: false,
    isThreadLoading: false,
    messages: [],
    values: {
      messages: [],
      artifacts: [],
      todos: [],
    },
  };
}

export function createThreadStreamState(
  threadId?: string | null,
  initialState?: ThreadState | null,
): ThreadStreamState {
  if (!initialState) {
    return createEmptyThreadState(threadId);
  }

  return {
    threadId: threadId ?? null,
    isLoading: initialState.isLoading,
    isThreadLoading: initialState.isThreadLoading,
    messages: initialState.messages,
    values: {
      ...initialState.values,
      messages: initialState.messages,
      artifacts: initialState.values.artifacts ?? [],
      todos: initialState.values.todos ?? [],
    },
  };
}

export function normalizeIncomingMessages(messages: Message[]): Message[] {
  const seenIds = new Set<string>();
  const normalized: Message[] = [];

  for (const message of messages) {
    if (!message || typeof message !== "object") {
      continue;
    }

    if (message.id && seenIds.has(message.id)) {
      continue;
    }

    if (message.id) {
      seenIds.add(message.id);
    }

    normalized.push(message);
  }

  return normalized;
}
