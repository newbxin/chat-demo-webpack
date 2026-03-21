import type { BaseStream } from "@langchain/langgraph-sdk";
import { useEffect } from "react";

import type { AgentThreadState } from "@/core/threads";

import { useThreadChat } from "./chats";
import { FlipDisplay } from "./flip-display";

export function ThreadTitle({
  threadId,
  thread,
}: {
  className?: string;
  threadId: string;
  thread: BaseStream<AgentThreadState>;
}) {
  const { isNewThread } = useThreadChat();
  useEffect(() => {
    let _title = "Untitled";

    if (thread.values?.title) {
      _title = thread.values.title;
    } else if (isNewThread) {
      _title = "New chat";
    }
    if (thread.isThreadLoading) {
      document.title = `Loading... - DeerFlow`;
    } else {
      document.title = `${_title} - DeerFlow`;
    }
  }, [
    isNewThread,
    thread.isThreadLoading,
    thread.values,
  ]);

  if (!thread.values?.title) {
    return null;
  }
  return (
    <FlipDisplay uniqueKey={threadId}>
      {thread.values.title ?? "Untitled"}
    </FlipDisplay>
  );
}
