import type { Message } from "@langchain/langgraph-sdk";

export type ParsedSSEEvent =
  | {
      event: "metadata";
      data: { run_id?: string; thread_id?: string; [key: string]: unknown };
      id?: string;
    }
  | {
      event: "values";
      data: {
        messages?: Message[];
        title?: string;
        artifacts?: string[];
        todos?: unknown[];
        [key: string]: unknown;
      };
      id?: string;
    }
  | { event: "messages-tuple"; data: unknown; id?: string }
  | { event: "custom"; data: unknown; id?: string }
  | { event: "error"; data: unknown; id?: string }
  | { event: "end"; data: { status?: string; [key: string]: unknown }; id?: string };

type SSEFieldMap = {
  event?: string;
  data: string[];
  id?: string;
};

function parseSSEBlock(block: string): ParsedSSEEvent | null {
  const parsed: SSEFieldMap = {
    data: [],
  };

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const value =
      separatorIndex === -1 ? "" : line.slice(separatorIndex + 1).replace(/^ /, "");

    switch (field) {
      case "event":
        parsed.event = value;
        break;
      case "data":
        parsed.data.push(value);
        break;
      case "id":
        parsed.id = value;
        break;
      default:
        break;
    }
  }

  if (!parsed.event || parsed.data.length === 0) {
    return null;
  }

  try {
    return {
      event: parsed.event,
      data: JSON.parse(parsed.data.join("\n")),
      id: parsed.id,
    } as ParsedSSEEvent;
  } catch (error) {
    console.warn("[sse] Failed to parse SSE event payload", error);
    return null;
  }
}

export async function parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: ParsedSSEEvent) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const separatorIndex = buffer.search(/\r?\n\r?\n/);
        if (separatorIndex === -1) {
          break;
        }

        const rawEvent = buffer.slice(0, separatorIndex);
        const separator = buffer.slice(separatorIndex).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
        buffer = buffer.slice(separatorIndex + separator.length);

        const event = parseSSEBlock(rawEvent);
        if (event) {
          onEvent(event);
        }
      }
    }

    buffer += decoder.decode();
    const trailingEvent = parseSSEBlock(buffer.trim());
    if (trailingEvent) {
      onEvent(trailingEvent);
    }
  } finally {
    reader.releaseLock();
  }
}
