import assert from "node:assert/strict";
import test from "node:test";

import type { ParsedSSEEvent } from "./sse";

const { parseSSEStream } = await import(new URL("./sse.ts", import.meta.url).href);

function createStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

void test("parses a single SSE event", async () => {
  const events: unknown[] = [];

  await parseSSEStream(
    createStream(['event: values\ndata: {"messages":[]}\n\n']),
    (event: ParsedSSEEvent) => {
      events.push(event);
    },
  );

  assert.deepEqual(events, [
    {
      event: "values",
      data: {
        messages: [],
      },
      id: undefined,
    },
  ]);
});

void test("parses events split across chunks", async () => {
  const events: unknown[] = [];

  await parseSSEStream(
    createStream([
      'event: metadata\nid: 1\ndata: {"run_id":"run-1"',
      ',"thread_id":"thread-1"}\n\n',
    ]),
    (event: ParsedSSEEvent) => {
      events.push(event);
    },
  );

  assert.deepEqual(events, [
    {
      event: "metadata",
      id: "1",
      data: {
        run_id: "run-1",
        thread_id: "thread-1",
      },
    },
  ]);
});

void test("joins multi-line data fields", async () => {
  const events: unknown[] = [];

  await parseSSEStream(
    createStream([
      'event: custom\ndata: {"message":"hello"\n',
      'data: ,"count":2}\n\n',
    ]),
    (event: ParsedSSEEvent) => {
      events.push(event);
    },
  );

  assert.deepEqual(events, [
    {
      event: "custom",
      id: undefined,
      data: {
        message: "hello",
        count: 2,
      },
    },
  ]);
});

void test("ignores invalid JSON payloads without failing the stream", async () => {
  const events: unknown[] = [];

  await parseSSEStream(
    createStream([
      "event: values\ndata: {not-json}\n\n",
      'event: end\ndata: {"status":"complete"}\n\n',
    ]),
    (event: ParsedSSEEvent) => {
      events.push(event);
    },
  );

  assert.deepEqual(events, [
    {
      event: "end",
      id: undefined,
      data: {
        status: "complete",
      },
    },
  ]);
});
