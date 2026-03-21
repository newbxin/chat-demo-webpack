import type { Message } from '@langchain/langgraph-sdk';

export interface ThreadData {
  values: {
    messages: Message[];
    title?: string;
    artifacts?: string[];
    todos?: any[];
  };
}

export interface ThreadState extends ThreadData {
  isLoading: boolean;
  isThreadLoading: boolean;
  messages: Message[];
}
