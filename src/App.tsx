import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubtasksProvider } from '@/core/tasks/context';
import { ChatDemo } from '@/components/ChatDemo';
import { MainProvider } from '@/providers/SessionProvider';
import { threads } from '@/data/threads';
import type { Message } from '@langchain/langgraph-sdk';
import type { ThreadState } from '@/types/thread';

const queryClient = new QueryClient();
const currentThreadId = threads[0]?.id || '';
const threadData = threads.find((thread) => thread.id === currentThreadId);
const initialThreadState: ThreadState | null = threadData
  ? {
      ...threadData.data,
      isLoading: false,
      isThreadLoading: false,
      messages: threadData.data.values.messages as Message[],
    }
  : null;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SubtasksProvider>
        <MainProvider
          initialThreadId={currentThreadId}
          initialState={initialThreadState}
        >
          <ChatDemo />
        </MainProvider>
      </SubtasksProvider>
    </QueryClientProvider>
  );
}
