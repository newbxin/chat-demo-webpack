import type { Message } from "@langchain/langgraph-sdk";

import { uuid } from "@/core/utils/uuid";

export type ShowTimeMessage = Message & {
  type: "ai";
  content: "";
  response_metadata: {
    finish_reason: "stop";
    model_name: "ui-event";
    model_provider: "client";
  };
  additional_kwargs: {
    element: "show_time";
    event_type: "ui.show_time.click";
    triggered_by: "input_time_button";
    display_mode: "live";
    version: 1;
  };
};

export function createShowTimeMessage(): ShowTimeMessage {
  return {
    id: uuid(),
    type: "ai",
    content: "",
    name: undefined,
    tool_calls: [],
    additional_kwargs: {
      element: "show_time",
      event_type: "ui.show_time.click",
      triggered_by: "input_time_button",
      display_mode: "live",
      version: 1,
    },
    response_metadata: {
      finish_reason: "stop",
      model_name: "ui-event",
      model_provider: "client",
    },
  };
}
