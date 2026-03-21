import { createContext, useContext, useState, ReactNode } from 'react';
import { threads } from '@/data/threads';
import type { ThreadState } from '@/types/thread';

interface ThreadContextType {
  threads: typeof threads;
  currentThread: ThreadState | null;
  currentThreadId: string;
  setCurrentThreadId: (id: string) => void;
}

const ThreadContext = createContext<ThreadContextType | null>(null);

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [currentThreadId, setCurrentThreadId] = useState(threads[0]?.id || '');

  const threadData = threads.find(t => t.id === currentThreadId);
  const currentThread: ThreadState | null = threadData ? {
    ...threadData.data,
    isLoading: false,
    isThreadLoading: false,
    messages: threadData.data.values.messages,
  } : null;

  return (
    <ThreadContext.Provider value={{
      threads,
      currentThread,
      currentThreadId,
      setCurrentThreadId
    }}>
      {children}
    </ThreadContext.Provider>
  );
}

export const useThreadContext = () => {
  const context = useContext(ThreadContext);
  if (!context) throw new Error('useThreadContext must be used within ThreadProvider');
  return context;
};
