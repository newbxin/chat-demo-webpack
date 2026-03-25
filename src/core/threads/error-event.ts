import type { Message } from "@langchain/langgraph-sdk";

const DEFAULT_STREAM_ERROR_MESSAGE = "Failed to stream thread.";

function getObjectProperty(
  value: unknown,
  key: string,
): unknown {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
}

function extractContentFromStructuredString(message: string): string | null {
  const contentMatch = message.match(
    /content\s*:\s*(['"])([\s\S]*?)\1/,
  );

  return contentMatch?.[2]?.trim() || null;
}

export function extractErrorEventContent(eventData: unknown): string {
  const rawMessage = getObjectProperty(eventData, "message");

  if (typeof rawMessage === "object" && rawMessage !== null) {
    const messageContent = getObjectProperty(rawMessage, "content");
    if (typeof messageContent === "string" && messageContent.trim()) {
      return messageContent.trim();
    }
  }

  if (typeof rawMessage === "string") {
    const normalizedMessage = rawMessage.trim();
    if (!normalizedMessage) {
      return DEFAULT_STREAM_ERROR_MESSAGE;
    }

    const structuredContent = extractContentFromStructuredString(normalizedMessage);
    if (structuredContent) {
      return structuredContent;
    }

    return normalizedMessage;
  }

  const rawCode = getObjectProperty(eventData, "code");
  if (typeof rawCode === "string" && rawCode.trim()) {
    return rawCode.trim();
  }

  return DEFAULT_STREAM_ERROR_MESSAGE;
}

export function createErrorAIMessage(
  eventData: unknown,
  requestId: number,
): Message {
  return {
    type: "ai",
    id: `stream-error-${requestId}-${Date.now()}`,
    content: extractErrorEventContent(eventData),
  };
}
