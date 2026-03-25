import { useThreadContext } from '@/providers/ThreadProvider';
import { MessageList } from '@/components/workspace/messages';
import { ChatBox } from '@/components/workspace/chats';
import { ThreadContext } from '@/components/workspace/messages/context';
import { ArtifactsProvider } from '@/components/workspace/artifacts/context';
import { InputBox } from '@/components/InputBox';
import { useThreadStream } from '@/core/threads/hooks';
import { useLocalSettings } from '@/core/settings/hooks';

export function ChatDemo() {
  const { currentThread, currentThreadId, setCurrentThreadId } = useThreadContext();
  const [settings] = useLocalSettings();
  const [thread, sendMessage] = useThreadStream({
    threadId: currentThreadId,
    initialState: currentThread,
    context: settings.context,
    isMock: true,
    onStart: setCurrentThreadId,
  });

  const activeThread = thread ?? currentThread;
  if (!activeThread) return <div>Loading...</div>;

  const handleSubmit = async (text: string) => {
    await sendMessage(currentThreadId, { text, files: [] });
  };


  return (
    <div className="flex h-screen">
      <main className="flex-1 relative">
        <ThreadContext.Provider value={{ thread: activeThread, isMock: true }}>
          <ArtifactsProvider>
            <ChatBox threadId={currentThreadId}>
              <MessageList
                threadId={currentThreadId}
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
