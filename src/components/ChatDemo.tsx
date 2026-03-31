import { useEffect, useMemo } from 'react';
import type { Message } from '@langchain/langgraph-sdk';
import { SessionType, useSessionContext } from '@/providers/SessionProvider';
import { MessageList } from '@/components/workspace/messages';
import { ChatBox } from '@/components/workspace/chats';
import { ThreadContext } from '@/components/workspace/messages/context';
import { ArtifactsProvider } from '@/components/workspace/artifacts/context';
import { InputBox } from '@/components/InputBox';
import { useThreadStream } from '@/core/threads/hooks';
import { useLocalSettings } from '@/core/settings/hooks';
import demoThread from '@/data/demo-thread.json';
import type { ThreadState } from '@/types/thread';

const demoMessages = demoThread.values.messages as Message[];
const initialDemoThreadState = {
  threadId: null,
  isLoading: false,
  isThreadLoading: false,
  messages: demoMessages,
  values: {
    ...demoThread.values,
    messages: demoMessages,
    artifacts: demoThread.values.artifacts ?? [],
    todos: demoThread.values.todos ?? [],
  },
};

export function ChatDemo() {
  const [settings] = useLocalSettings();
  const [session, sessionDispatch] = useSessionContext(SessionType.main);
  const threadId = session.threadId ?? 'demo-thread';

  const sendMessage = useThreadStream({
    sessionType: SessionType.main,
    context: settings.context,
    isMock: true,
    onStart: sessionDispatch.setThreadId,
  });

  useEffect(() => {
    sessionDispatch.setThreadState((prev) => {
      if (prev.messages.length > 0) {
        return prev;
      }
      return {
        ...initialDemoThreadState,
        threadId: prev.threadId,
        runId: prev.runId,
        error: prev.error,
      };
    });
  }, [sessionDispatch]);

  const thread = useMemo<ThreadState>(
    () => ({
      isLoading: session.threadState.isLoading,
      isThreadLoading: session.threadState.isThreadLoading,
      messages: session.threadState.messages,
      values: {
        ...session.threadState.values,
        messages: session.threadState.messages,
        artifacts: session.threadState.values.artifacts ?? [],
        todos: session.threadState.values.todos ?? [],
      },
    }),
    [session.threadState],
  );

  const handleSubmit = async (text: string) => {
    await sendMessage(session.threadId, { text, files: [] });
  };

  return (
    <div className="flex h-screen">
      <main className="flex-1 relative">
        <ThreadContext.Provider value={{ thread, threadId, isMock: true }}>
          <ArtifactsProvider>
            <ChatBox threadId={threadId}>
              <MessageList threadId={threadId} thread={thread} />
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
