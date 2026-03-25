import { useThreadContext } from '@/providers/ThreadProvider';
import { SessionType, useSession } from '@/providers/SessionProvider';
import { MessageList } from '@/components/workspace/messages';
import { ChatBox } from '@/components/workspace/chats';
import { ThreadContext } from '@/components/workspace/messages/context';
import { ArtifactsProvider } from '@/components/workspace/artifacts/context';
import { InputBox } from '@/components/InputBox';
import { useThreadStream } from '@/core/threads/hooks';
import { useLocalSettings } from '@/core/settings/hooks';
import { useEffect } from 'react';

export function ChatDemo() {
  const { currentThread, currentThreadId, setCurrentThreadId } = useThreadContext();
  const { thread, threadId, hydrateSession } = useSession(SessionType.main);
  const [settings] = useLocalSettings();
  const sendMessage = useThreadStream(SessionType.main, {
    context: settings.context,
    isMock: true,
    onStart: setCurrentThreadId,
  });

  useEffect(() => {
    hydrateSession({
      threadId: currentThreadId,
      initialState: currentThread,
    });
  }, [currentThreadId, hydrateSession]);

  const handleSubmit = async (text: string) => {
    await sendMessage({ text, files: [] });
  };

  const activeThreadId = threadId ?? currentThreadId;

  if (!activeThreadId) return <div>Loading...</div>;

  return (
    <div className="flex h-screen">
      <main className="flex-1 relative">
        <ThreadContext.Provider value={{ thread, isMock: true }}>
          <ArtifactsProvider>
            <ChatBox threadId={activeThreadId}>
              <MessageList
                threadId={activeThreadId}
                thread={thread}
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
