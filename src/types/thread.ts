import type { Message } from '@langchain/langgraph-sdk';

export interface ThreadData {
  values: {
    messages: unknown[];
    title?: string;
    artifacts?: string[];
    todos?: unknown[];
  };
}

export interface ThreadState extends ThreadData {
  isLoading: boolean;
  isThreadLoading: boolean;
  messages: Message[];
}
