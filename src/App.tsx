import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubtasksProvider } from '@/core/tasks/context';
import { ThreadProvider } from '@/providers/ThreadProvider';
import { SessionProvider } from '@/providers/SessionProvider';
import { ChatDemo } from '@/components/ChatDemo';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SubtasksProvider>
        <ThreadProvider>
          <SessionProvider>
            <ChatDemo />
          </SessionProvider>
        </ThreadProvider>
      </SubtasksProvider>
    </QueryClientProvider>
  );
}
