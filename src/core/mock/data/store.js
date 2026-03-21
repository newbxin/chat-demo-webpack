const threads = new Map();

function createDefaultThread() {
  const threadId = "demo-thread-001";
  threads.set(threadId, {
    thread_id: threadId,
    values: {
      title: "Demo Chat",
      messages: [],
      artifacts: [],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

createDefaultThread();

function getThread(threadId) {
  return threads.get(threadId);
}

function createThread(values = {}) {
  const threadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const thread = {
    thread_id: threadId,
    values: {
      title: values.title || "New Chat",
      messages: values.messages || [],
      artifacts: values.artifacts || [],
    },
    created_at: now,
    updated_at: now,
  };
  threads.set(threadId, thread);
  return thread;
}

function updateThread(threadId, values) {
  const thread = threads.get(threadId);
  if (!thread) return undefined;
  thread.values = { ...thread.values, ...values };
  thread.updated_at = new Date().toISOString();
  return thread;
}

function getThreadHistory(threadId, limit = 10) {
  const thread = threads.get(threadId);
  if (!thread) return [];
  const messages = thread.values.messages || [];
  return messages.slice(-limit);
}

function searchThreads(params = {}) {
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  const threadList = Array.from(threads.values());
  threadList.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  return threadList.slice(offset, offset + limit);
}

function deleteThread(threadId) {
  return threads.delete(threadId);
}

module.exports = {
  getThread,
  createThread,
  updateThread,
  getThreadHistory,
  searchThreads,
  deleteThread,
};
