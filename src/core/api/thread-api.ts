import type { Message } from "@langchain/langgraph-sdk";

import { getLangGraphBaseURL } from "../config";

import { parseSSEStream, type ParsedSSEEvent } from "./sse";

export type CreateThreadRequest = {
  thread_id?: string;
  metadata?: {
    userInfo: string;
    source: string;
  };
};

export type CreateThreadResponse = {
  thread_id: string;
  metadata?: Record<string, unknown>;
  values?: {
    title?: string;
    messages?: Message[];
    artifacts?: string[];
    todos?: unknown[];
  };
};

export type StreamRunRequest = {
  assistant_id: "lead_agent";
  input: {
    messages: Message[];
  };
  config?: Record<string, unknown>;
  stream_mode: Array<"values" | "messages-tuple" | "custom">;
  stream_subgraphs?: boolean;
  context: {
    thread_id: string;
    user_id?: string;
    thinking_enabled?: boolean;
    is_plan_mode?: boolean;
    subagent_enabled?: boolean;
    [key: string]: unknown;
  };
  metadata: {
    userInfo: string;
    source: string;
  };
};

export type ThreadStateResponse = {
  values: {
    title?: string;
    messages?: Message[];
    artifacts?: string[];
    todos?: unknown[];
  };
};

type StreamThreadRunParams = {
  threadId: string;
  body: StreamRunRequest;
  signal?: AbortSignal;
  isMock?: boolean;
  onEvent: (event: ParsedSSEEvent) => void;
};

export type CancelThreadRunParams = {
  threadId: string;
  runId: string;
  isMock?: boolean;
};

export function buildRequestHeaders(
  init?: HeadersInit,
): Headers {
  const headers = new Headers(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

async function parseJSONResponse<T>(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: fallbackMessage }));
    throw new Error(error.detail ?? fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export async function createThread(
  payload: CreateThreadRequest,
  isMock?: boolean,
): Promise<CreateThreadResponse> {
  const response = await fetch(`${getLangGraphBaseURL(isMock)}/threads`, {
    method: "POST",
    headers: buildRequestHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJSONResponse<CreateThreadResponse>(
    response,
    "Failed to create thread",
  );
}

export async function getThreadState(
  threadId: string,
  isMock?: boolean,
): Promise<ThreadStateResponse> {
  const response = await fetch(
    `${getLangGraphBaseURL(isMock)}/threads/${threadId}/state`,
    {
      method: "POST",
      headers: buildRequestHeaders(),
      body: JSON.stringify({ thread_id: threadId }),
    },
  );

  return parseJSONResponse<ThreadStateResponse>(
    response,
    "Failed to fetch thread state",
  );
}

export async function streamThreadRun({
  threadId,
  body,
  signal,
  isMock,
  onEvent,
}: StreamThreadRunParams): Promise<void> {
  const response = await fetch(
    `${getLangGraphBaseURL(isMock)}/threads/${threadId}/runs/stream`,
    {
      method: "POST",
      headers: buildRequestHeaders({
        Accept: "text/event-stream",
      }),
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to stream thread run" }));
    throw new Error(error.detail ?? "Failed to stream thread run");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    throw new Error("Streaming endpoint did not return text/event-stream");
  }

  if (!response.body) {
    throw new Error("Streaming endpoint returned an empty body");
  }

  await parseSSEStream(response.body, onEvent);
}

export async function cancelThreadRun({
  threadId,
  runId,
  isMock,
}: CancelThreadRunParams): Promise<unknown> {
  const response = await fetch(
    `${getLangGraphBaseURL(isMock)}/threads/${threadId}/runs/${runId}/cancel?wait=0&action=interrupt`,
    {
      method: "POST",
      headers: buildRequestHeaders(),
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to cancel thread run" }));
    throw new Error(error.detail ?? "Failed to cancel thread run");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  return response.json() as Promise<unknown>;
}
