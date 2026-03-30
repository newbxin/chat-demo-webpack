import type { AIMessage, Message } from "@langchain/langgraph-sdk";
import type { ThreadsClient } from "@langchain/langgraph-sdk/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { SessionType, useSessionContext } from "@/providers/SessionProvider";
import type { ThreadState } from "@/types/thread";

import {
  createThread,
  streamThreadRun,
  type StreamRunRequest,
  type ThreadStateResponse,
} from "../api";
import { getAPIClient } from "../api";
import type { FileInMessage } from "../messages/utils";
import type { LocalSettings } from "../settings";
import { useUpdateSubtask } from "../tasks/context";
import type { UploadedFileInfo } from "../uploads";
import { uploadFiles } from "../uploads";

import {
  normalizeIncomingMessages,
  type ThreadStreamState,
} from "./stream-state";
import { createErrorAIMessage } from "./error-event";
import type { AgentThread, AgentThreadState } from "./types";

export type ToolEndEvent = {
  name: string;
  data: unknown;
};

export type ThreadStreamOptions = {
  threadId?: string | null | undefined;
  initialState?: ThreadState | null;
  sessionType?: SessionType;
  context: LocalSettings["context"];
  isMock?: boolean;
  onStart?: (threadId: string) => void;
  onFinish?: (state: AgentThreadState) => void;
  onToolEnd?: (event: ToolEndEvent) => void;
};

const DEFAULT_THREAD_METADATA = {
  userInfo: "",
  source: "Center",
};

const THREAD_FILE_BASE_URL = "https://assistgateway.paas.cmbchina.cn/api/threads/";

function normalizeMessageFiles(message: Message, threadId: string): Message {
  const files = message.additional_kwargs?.files;

  if (!Array.isArray(files) || files.length === 0) {
    return message;
  }

  let hasChanges = false;
  const nextFiles = files.map((file) => {
    if (!file || typeof file !== "object") {
      return file;
    }

    const typedFile = file as FileInMessage;
    if (!typedFile.path) {
      return file;
    }

    const nextUrl = `${THREAD_FILE_BASE_URL}${threadId}${typedFile.path}`;
    if (typedFile.url === nextUrl) {
      return file;
    }

    hasChanges = true;
    return {
      ...typedFile,
      url: nextUrl,
    };
  });

  if (!hasChanges) {
    return message;
  }

  return {
    ...message,
    additional_kwargs: {
      ...message.additional_kwargs,
      files: nextFiles,
    },
  };
}

function normalizeThreadSnapshotValues(
  values: ThreadStateResponse["values"],
  threadId: string,
): ThreadStateResponse["values"] {
  if (!Array.isArray(values.messages) || values.messages.length === 0) {
    return values;
  }

  let hasChanges = false;
  const nextMessages = values.messages.map((message) => {
    const nextMessage = normalizeMessageFiles(message, threadId);
    if (nextMessage !== message) {
      hasChanges = true;
    }
    return nextMessage;
  });

  if (!hasChanges) {
    return values;
  }

  return {
    ...values,
    messages: nextMessages,
  };
}

function toAgentThreadState(state: ThreadStreamState): AgentThreadState {
  // 对外暴露的线程状态需要补齐默认值，避免消费方再处理空字段分支。
  return {
    title: state.values.title ?? "",
    messages: state.messages,
    artifacts: state.values.artifacts ?? [],
    todos: state.values.todos as AgentThreadState["todos"],
  };
}

function applyThreadSnapshot(
  prev: ThreadStreamState,
  values: ThreadStateResponse["values"],
): ThreadStreamState {
  // 服务端 values 是整份状态快照，这里统一做一次消息去重和默认值兜底。
  const nextMessages = Array.isArray(values.messages)
    ? normalizeIncomingMessages(values.messages)
    : prev.messages;

  return {
    ...prev,
    messages: nextMessages,
    values: {
      ...prev.values,
      ...values,
      messages: nextMessages,
      artifacts: values.artifacts ?? prev.values.artifacts ?? [],
      todos: values.todos ?? prev.values.todos ?? [],
    },
    error: undefined,
  };
}

function appendThreadMessage(
  prev: ThreadStreamState,
  message: Message,
): ThreadStreamState {
  const nextMessages = [...prev.messages, message];

  return {
    ...prev,
    messages: nextMessages,
    values: {
      ...prev.values,
      messages: nextMessages,
      artifacts: prev.values.artifacts ?? [],
      todos: prev.values.todos ?? [],
    },
    isLoading: false,
    error: undefined,
  };
}

export function useThreadStream({
  threadId,
  initialState,
  sessionType = SessionType.main,
  context,
  isMock,
  onStart,
  onFinish,
  onToolEnd,
}: ThreadStreamOptions) {
  const [sessionContext, sessionDispatch] = useSessionContext(sessionType);

  const listeners = useRef({
    onStart,
    onFinish,
    onToolEnd,
  });
  const threadStateRef = useRef(sessionContext.threadState);
  const activeThreadIdRef = useRef<string | null>(
    threadId ?? sessionContext.threadId ?? null,
  );
  const streamRequestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listeners.current = { onStart, onFinish, onToolEnd };
  }, [onStart, onFinish, onToolEnd]);

  useEffect(() => {
    threadStateRef.current = sessionContext.threadState;
  }, [sessionContext.threadState]);

  useEffect(() => {
    const normalizedThreadId = threadId ?? null;
    activeThreadIdRef.current = normalizedThreadId;
    sessionDispatch.resetThreadState({
      threadId: normalizedThreadId,
      initialState,
    });
  }, [initialState, sessionDispatch, threadId]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const queryClient = useQueryClient();
  const updateSubtask = useUpdateSubtask();

  const syncThreadTitle = useCallback(
    (nextThreadId: string, title: string) => {
      // 标题通常会在首轮流式返回后生成，直接同步列表缓存可以避免侧栏标题闪烁或滞后。
      void queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) => {
          return oldData?.map((thread) => {
            if (thread.thread_id !== nextThreadId) {
              return thread;
            }

            return {
              ...thread,
              values: {
                ...thread.values,
                title,
              },
            };
          });
        },
      );
    },
    [queryClient],
  );

  const sendMessage = useCallback(
    async (
      maybeThreadId: string | null | undefined,
      message: PromptInputMessage,
      extraContext?: Record<string, unknown>,
    ) => {
      const text = message.text.trim();

      // 新请求开始前取消旧流，保证界面只消费“最后一次发送”的结果。
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 用单调递增的 requestId 兜住竞态：即使旧请求晚返回，也不会覆盖当前状态。
      const requestId = ++streamRequestIdRef.current;

      const optimisticFiles: FileInMessage[] = (message.files ?? []).map((file) => ({
        filename: file.filename ?? "",
        size: 0,
        status: "uploading",
      }));

      const optimisticHumanMessage: Message = {
        type: "human",
        id: `opt-human-${Date.now()}`,
        content: text ? [{ type: "text", text }] : "",
        additional_kwargs:
          optimisticFiles.length > 0 ? { files: optimisticFiles } : {},
      };

      const nextOptimisticMessages: Message[] = [optimisticHumanMessage];
      if (optimisticFiles.length > 0) {
        nextOptimisticMessages.push({
          type: "ai",
          id: `opt-ai-${Date.now()}`,
          content: "Uploading files, please wait...",
          additional_kwargs: { element: "task" },
        });
      }
      // 在真正拿到服务端快照前，先把用户输入和上传态文件渲染出来，降低发送等待感。
      sessionDispatch.setOptimisticMessages(nextOptimisticMessages);

      let resolvedThreadId =
        maybeThreadId ?? activeThreadIdRef.current ?? threadStateRef.current.threadId;

      try {
        if (!resolvedThreadId) {
          const createdThread = await createThread(
            {
              metadata: DEFAULT_THREAD_METADATA,
            },
            isMock,
          );
          resolvedThreadId = createdThread.thread_id;
          activeThreadIdRef.current = resolvedThreadId;
          sessionDispatch.setThreadState((prev) => ({
            ...prev,
            threadId: resolvedThreadId,
          }));
        }

        const streamingThreadId = resolvedThreadId;
        listeners.current.onStart?.(streamingThreadId);

        let uploadedFileInfo: UploadedFileInfo[] = [];
        if (message.files && message.files.length > 0) {
          // 组件侧拿到的是可访问 URL，这里先还原成 File 对象，再复用现有上传接口。
          const filePromises = message.files.map(async (fileUIPart) => {
            if (fileUIPart.url && fileUIPart.filename) {
              try {
                const response = await fetch(fileUIPart.url);
                const blob = await response.blob();

                return new File([blob], fileUIPart.filename, {
                  type: fileUIPart.mediaType || blob.type,
                });
              } catch (error) {
                console.error(
                  `Failed to fetch file ${fileUIPart.filename}:`,
                  error,
                );
                return null;
              }
            }

            return null;
          });

          const conversionResults = await Promise.all(filePromises);
          const files = conversionResults.filter(
            (file): file is File => file !== null,
          );
          const failedConversions = conversionResults.length - files.length;

          if (failedConversions > 0) {
            throw new Error(
              `Failed to prepare ${failedConversions} attachment(s) for upload. Please retry.`,
            );
          }

          if (files.length > 0) {
            const uploadResponse = await uploadFiles(streamingThreadId, files);
            uploadedFileInfo = uploadResponse.files;

            const uploadedFiles: FileInMessage[] = uploadedFileInfo.map((info) => ({
              filename: info.filename,
              size: info.size,
              path: info.virtual_path,
              status: "uploaded",
            }));

            sessionDispatch.setOptimisticMessages((prev) => {
              if (prev.length === 0 || !prev[0]) {
                return prev;
              }

              // 上传完成后把占位文件状态替换成真实服务端返回，后续提交和展示保持一致。
              return [
                {
                  ...prev[0],
                  additional_kwargs: { files: uploadedFiles },
                },
                ...prev.slice(1),
              ];
            });
          }
        }

        sessionDispatch.setThreadState((prev) => ({
          ...prev,
          threadId: streamingThreadId,
          isLoading: true,
          error: undefined,
        }));

        const filesForSubmit: FileInMessage[] = uploadedFileInfo.map((info) => ({
          filename: info.filename,
          size: info.size,
          path: info.virtual_path,
          status: "uploaded",
        }));

        const requestBody: StreamRunRequest = {
          assistant_id: "lead_agent",
          input: {
            messages: [
              {
                type: "human",
                content: text ? [{ type: "text", text }] : "",
                additional_kwargs:
                  filesForSubmit.length > 0 ? { files: filesForSubmit } : {},
              },
            ],
          },
          config: {
            recursion_limit: 1000,
          },
          stream_mode: ["values"],
          stream_subgraphs: true,
          context: {
            ...extraContext,
            ...context,
            thinking_enabled: context.mode !== "flash",
            is_plan_mode: context.mode === "pro" || context.mode === "ultra",
            subagent_enabled: context.mode === "ultra",
            thread_id: streamingThreadId,
          },
          metadata: DEFAULT_THREAD_METADATA,
        };

        await streamThreadRun({
          threadId: streamingThreadId,
          body: requestBody,
          signal: abortController.signal,
          isMock,
          onEvent: (event) => {
            if (
              requestId !== streamRequestIdRef.current ||
              activeThreadIdRef.current !== streamingThreadId
            ) {
              // 忽略失效请求的回调，避免切线程或重复发送后旧事件污染当前界面。
              return;
            }

            if (event.event === "metadata") {
              sessionDispatch.setThreadState((prev) => ({
                ...prev,
                runId:
                  typeof event.data.run_id === "string"
                    ? event.data.run_id
                    : prev.runId,
              }));
              return;
            }

            if (event.event === "values") {
              const normalizedValues = normalizeThreadSnapshotValues(
                event.data,
                streamingThreadId,
              );
              sessionDispatch.setOptimisticMessages([]);
              sessionDispatch.setThreadState((prev) =>
                applyThreadSnapshot(prev, normalizedValues),
              );

              if (
                typeof normalizedValues.title === "string" &&
                normalizedValues.title
              ) {
                syncThreadTitle(streamingThreadId, normalizedValues.title);
              }
              return;
            }

            if (event.event === "error" && event.data) {
              const errorMessage = createErrorAIMessage(event.data, requestId);
              sessionDispatch.setOptimisticMessages([]);
              sessionDispatch.setThreadState((prev) =>
                appendThreadMessage(prev, errorMessage),
              );
              abortController.abort();
              return;
            }

            if (event.event === "custom" && event.data) {
              if (
                typeof event.data === "object" &&
                event.data !== null &&
                "type" in event.data &&
                event.data.type === "task_running"
              ) {
                const taskEvent = event.data as {
                  type: "task_running";
                  task_id: string;
                  message: AIMessage;
                };
                updateSubtask({
                  id: taskEvent.task_id,
                  latestMessage: taskEvent.message,
                });
              }

              if (
                typeof event.data === "object" &&
                event.data !== null &&
                "type" in event.data &&
                event.data.type === "tool_end" &&
                "name" in event.data
              ) {
                listeners.current.onToolEnd?.({
                  name: String(event.data.name),
                  data: "data" in event.data ? event.data.data : event.data,
                });
              }
            }
          },
        });

        if (requestId !== streamRequestIdRef.current) {
          return;
        }

        let nextState: ThreadStreamState | undefined;
        sessionDispatch.setThreadState((prev) => {
          nextState = {
            ...prev,
            isLoading: false,
          };
          return nextState;
        });
        if (nextState) {
          listeners.current.onFinish?.(toAgentThreadState(nextState));
        }
        void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
      } catch (error) {
        if (requestId !== streamRequestIdRef.current) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          sessionDispatch.setThreadState((prev) => ({
            ...prev,
            isLoading: false,
          }));
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Failed to stream thread.";
        sessionDispatch.setOptimisticMessages([]);
        sessionDispatch.setThreadState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
        throw error;
      } finally {
        if (requestId === streamRequestIdRef.current) {
          abortControllerRef.current = null;
        }
      }
    },
    [context, isMock, queryClient, sessionDispatch, syncThreadTitle, updateSubtask],
  );

  return sendMessage;
}

export function useThreads(
  params: Parameters<ThreadsClient["search"]>[0] = {
    limit: 50,
    sortBy: "updated_at",
    sortOrder: "desc",
    select: ["thread_id", "updated_at", "values"],
  },
) {
  const apiClient = getAPIClient();
  return useQuery<AgentThread[]>({
    queryKey: ["threads", "search", params],
    queryFn: async () => {
      const maxResults = params.limit;
      const initialOffset = params.offset ?? 0;
      const defaultPageSize = 50;

      if (maxResults !== undefined && maxResults <= 0) {
        const response = await apiClient.threads.search<AgentThreadState>(params);
        return response as AgentThread[];
      }

      const pageSize =
        typeof maxResults === "number" && maxResults > 0
          ? Math.min(defaultPageSize, maxResults)
          : defaultPageSize;

      const threads: AgentThread[] = [];
      let offset = initialOffset;

      // SDK search 是分页接口，这里主动拉满，保证调用方拿到的是完整结果集。
      while (true) {
        if (typeof maxResults === "number" && threads.length >= maxResults) {
          break;
        }

        const currentLimit =
          typeof maxResults === "number"
            ? Math.min(pageSize, maxResults - threads.length)
            : pageSize;

        if (typeof maxResults === "number" && currentLimit <= 0) {
          break;
        }

        const response = (await apiClient.threads.search<AgentThreadState>({
          ...params,
          limit: currentLimit,
          offset,
        })) as AgentThread[];

        threads.push(...response);

        if (response.length < currentLimit) {
          break;
        }

        offset += response.length;
      }

      return threads;
    },
    refetchOnWindowFocus: false,
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  const apiClient = getAPIClient();
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string }) => {
      await apiClient.threads.delete(threadId);
    },
    onSuccess(_, { threadId }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread>) => {
          return oldData.filter((thread) => thread.thread_id !== threadId);
        },
      );
    },
  });
}

export function useRenameThread() {
  const queryClient = useQueryClient();
  const apiClient = getAPIClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      title,
    }: {
      threadId: string;
      title: string;
    }) => {
      await apiClient.threads.updateState(threadId, {
        values: { title },
      });
    },
    onSuccess(_, { threadId, title }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread>) => {
          return oldData.map((thread) => {
            if (thread.thread_id === threadId) {
              return {
                ...thread,
                values: {
                  ...thread.values,
                  title,
                },
              };
            }
            return thread;
          });
        },
      );
    },
  });
}
