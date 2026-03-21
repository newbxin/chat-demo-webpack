import type { ToolCall } from "@langchain/core/messages";
import type { AIMessage } from "@langchain/langgraph-sdk";

import { hasToolCalls } from "../messages/utils";

export function explainLastToolCall(message: AIMessage) {
  if (hasToolCalls(message)) {
    const lastToolCall = message.tool_calls![message.tool_calls!.length - 1]!;
    return explainToolCall(lastToolCall);
  }
  return "Thinking";
}

export function explainToolCall(toolCall: ToolCall) {
  if (toolCall.name === "web_search" || toolCall.name === "image_search") {
    if (typeof toolCall.args.query === "string") {
      return `Search for "${toolCall.args.query}"`;
    }
    return "Search";
  } else if (toolCall.name === "web_fetch") {
    return "View web page";
  } else if (toolCall.name === "present_files") {
    return "Present files";
  } else if (toolCall.name === "write_todos") {
    return "Update to-do list";
  } else if (toolCall.args.description) {
    return toolCall.args.description;
  } else {
    return `Use "${toolCall.name}" tool`;
  }
}
