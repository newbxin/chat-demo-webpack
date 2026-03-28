import { useEffect, useMemo } from "react";

import { InputBox } from "@/components/InputBox";
import { MessageList } from "@/components/workspace/messages";
import { ThreadContext } from "@/components/workspace/messages/context";
import { ArtifactsProvider } from "@/components/workspace/artifacts/context";
import { ChatBox } from "@/components/workspace/chats";
import { createShowTimeMessage } from "@/core/messages/show-time";
import { useLocalSettings } from "@/core/settings/hooks";
import { createThreadStreamState } from "@/core/threads/stream-state";
import { useThreadStream } from "@/core/threads/hooks";
import { threads } from "@/data/threads";
import { SessionType, useSessionContext } from "@/providers/SessionProvider";
import type { ThreadState } from "@/types/thread";
import type { Message } from "@langchain/langgraph-sdk";

export function ChatDemo() {
  const currentThreadId = threads[0]?.id || "";
  const threadData = useMemo(
    () => threads.find((t) => t.id === currentThreadId),
    [currentThreadId],
  );
  const currentThread = useMemo<ThreadState | null>(() => {
    if (!threadData) {
      return null;
    }

    return {
      ...threadData.data,
      isLoading: false,
      isThreadLoading: false,
      messages: threadData.data.values.messages as Message[],
    };
  }, [threadData]);

  const [settings] = useLocalSettings();
  const [session, sessionDispatch] = useSessionContext(SessionType.main);

  const nextThreadState = useMemo(
    () => createThreadStreamState(currentThreadId, currentThread),
    [currentThread, currentThreadId],
  );

  useEffect(() => {
    sessionDispatch.setThreadState(nextThreadState);
  }, [nextThreadState, sessionDispatch]);

  const sendMessage = useThreadStream({
    sessionType: SessionType.main,
    threadId: currentThreadId,
    context: settings.context,
    isMock: true,
    onStart: sessionDispatch.setThreadId,
  });

  const activeThread = session.thread;
  const activeThreadId = session.threadId ?? currentThreadId;

  if (!activeThread) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (text: string) => {
    await sendMessage(activeThreadId, { text, files: [] });
  };

  const handleShowTime = () => {
    const showTimeMessage = createShowTimeMessage();
    sessionDispatch.setThreadState((prev) => {
      const nextMessages = [...prev.messages, showTimeMessage];
      return {
        ...prev,
        messages: nextMessages,
        values: {
          ...prev.values,
          messages: nextMessages,
        },
      };
    });
  };

  return (
    <div className="flex h-screen">
      <main className="relative flex-1">
        <ThreadContext.Provider value={{ thread: activeThread, isMock: true }}>
          <ArtifactsProvider>
            <ChatBox threadId={activeThreadId}>
              <MessageList threadId={activeThreadId} thread={activeThread} />
            </ChatBox>
          </ArtifactsProvider>
        </ThreadContext.Provider>

        <div className="absolute right-0 bottom-0 left-0 p-4">
          <InputBox
            className="mx-auto max-w-3xl"
            onSubmit={handleSubmit}
            onShowTime={handleShowTime}
          />
        </div>
      </main>
    </div>
  );
}

// export function ChatDemo() {
//   const { currentThread, currentThreadId } = useThreadContext();
//
//   return (
//     <MainProvider initialThreadId={currentThreadId} initialState={currentThread}>
//       <ChatDemoContent />
//     </MainProvider>
//   );
// }
