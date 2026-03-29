import { SessionType, useSessionContext } from '@/providers/SessionProvider';
import { MessageList } from '@/components/workspace/messages';
import { ChatBox } from '@/components/workspace/chats';
import { ThreadContext } from '@/components/workspace/messages/context';
import { ArtifactsProvider } from '@/components/workspace/artifacts/context';
import { InputBox } from '@/components/InputBox';
import { useThreadStream } from '@/core/threads/hooks';
import { useLocalSettings } from '@/core/settings/hooks';
import { threads } from '@/data/threads';


export function ChatDemo() {
  const currentThreadId = threads[0]?.id || '';
  const [settings] = useLocalSettings();
  const [session, sessionDispatch] = useSessionContext(SessionType.main);


  const sendMessage = useThreadStream({
    sessionType: SessionType.main,
    threadId: currentThreadId,
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
