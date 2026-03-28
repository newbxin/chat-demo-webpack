import { useEffect, useMemo, useState } from 'react';
import { SessionType, useSessionContext } from '@/providers/SessionProvider';
import { MessageList } from '@/components/workspace/messages';
import { ChatBox } from '@/components/workspace/chats';
import { ThreadContext } from '@/components/workspace/messages/context';
import { ArtifactsProvider } from '@/components/workspace/artifacts/context';
import { InputBox } from '@/components/InputBox';
import { createThreadStreamState } from '@/core/threads/stream-state';
import { useThreadStream } from '@/core/threads/hooks';
import { useLocalSettings } from '@/core/settings/hooks';
import { threads } from '@/data/threads';
import type { Message } from "@langchain/langgraph-sdk";
import type { ThreadState } from '@/types/thread';


export function ChatDemo() {
  const currentThreadId = threads[0]?.id || '';
  const threadData = threads.find(t => t.id === currentThreadId);
  const currentThread: ThreadState | null = threadData ? {
    ...threadData.data,
    isLoading: false,
    isThreadLoading: false,
    messages: threadData.data.values.messages as Message[],
  } : null;
  const [settings] = useLocalSettings();
  const [session, sessionDispatch] = useSessionContext(SessionType.main);

  const nextThreadState = useMemo(
    () => createThreadStreamState(currentThreadId, currentThread),
    [currentThread, currentThreadId],
  );

  useEffect(() => {
    // console.log('nextThreadState:', nextThreadState);
    // 设置消息列表数据
    sessionDispatch.setThreadState(nextThreadState);
  }, [nextThreadState]);


  const sendMessage = useThreadStream({
    sessionType: SessionType.main,
    threadId: currentThreadId,
    // initialState: currentThread, // 设置初始值
    context: settings.context,
    isMock: true,
    onStart: sessionDispatch.setThreadId,
  });

  const activeThread = session.thread;
  const activeThreadId = session.threadId ?? currentThreadId;
  if (!activeThread) return <div>Loading...</div>;

  const handleSubmit = async (text: string) => {
    await sendMessage(activeThreadId, { text, files: [] });
  };


  return (
    <div className="flex h-screen">
      <main className="flex-1 relative">
        <ThreadContext.Provider value={{ thread: activeThread, threadId: activeThreadId, isMock: true }}>
          <ArtifactsProvider>
            <ChatBox threadId={activeThreadId}>
              <MessageList
                threadId={activeThreadId}
                thread={activeThread}
              />
            </ChatBox>
          </ArtifactsProvider>
        </ThreadContext.Provider>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <InputBox className="mx-auto max-w-3xl" onSubmit={handleSubmit} />
        </div>
      </main>
    </div>
  );
}



// export function ChatDemo() {
//   const { currentThread, currentThreadId } = useThreadContext();

//   return (
//     <MainProvider initialThreadId={currentThreadId} initialState={currentThread}>
//       <ChatDemoContent />
//     </MainProvider>
//   );
// }
