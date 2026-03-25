import assert from "node:assert/strict";
import test from "node:test";

const { normalizeIncomingMessages } = await import(
  new URL("./stream-state.ts", import.meta.url).href
);

void test("normalizes incoming messages by preserving order and removing duplicate ids", () => {
  const normalized = normalizeIncomingMessages([
    { id: "1", type: "human", content: "hello" },
    { id: "2", type: "ai", content: "world" },
    { id: "2", type: "ai", content: "duplicate" },
    { type: "tool", content: "kept without id" },
  ]);

  assert.deepEqual(normalized, [
    { id: "1", type: "human", content: "hello" },
    { id: "2", type: "ai", content: "world" },
    { type: "tool", content: "kept without id" },
  ]);
});
