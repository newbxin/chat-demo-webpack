import type { ThreadState } from "@/types/thread";
import { createContext, useContext } from "react";

export interface ThreadContextType {
  thread: ThreadState;
  threadId?: string;
  isMock?: boolean;
}

export const ThreadContext = createContext<ThreadContextType | undefined>(
  undefined,
);

export function useThread() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThread must be used within a ThreadContext");
  }
  return context;
}
