import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubtasksProvider } from '@/core/tasks/context';
import { ChatDemo } from '@/components/ChatDemo';
import { MainProvider } from '@/providers/SessionProvider';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SubtasksProvider>
        <MainProvider>
          <ChatDemo />
        </MainProvider>
      </SubtasksProvider>
    </QueryClientProvider>
  );
}
