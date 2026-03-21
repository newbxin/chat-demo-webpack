import { useThreadContext } from '@/providers/ThreadProvider';
import { MessageList } from '@/components/workspace/messages';
import { ChatBox } from '@/components/workspace/chats';
import { ThreadContext } from '@/components/workspace/messages/context';
import { ArtifactsProvider } from '@/components/workspace/artifacts/context';
import { InputBox } from '@/components/InputBox';
import { useThreadStream } from '@/core/threads/hooks';
import { useLocalSettings } from '@/core/settings/hooks';

export function ChatDemo() {
  const { threads, currentThread, currentThreadId, setCurrentThreadId } = useThreadContext();
  const [settings] = useLocalSettings();
  const [, sendMessage] = useThreadStream({
    threadId: currentThreadId,
    context: settings.context,
    isMock: true,
  });

  if (!currentThread) return <div>Loading...</div>;

  const handleSubmit = async (text: string) => {
    await sendMessage(currentThreadId, { text, files: [] });
  };


  return (
    <div className="flex h-screen">
      <main className="flex-1 relative">
        <ThreadContext.Provider value={{ thread: currentThread, isMock: true }}>
          <ArtifactsProvider>
            <ChatBox threadId={currentThreadId}>
              <MessageList
                threadId={currentThreadId}
                thread={currentThread}
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
