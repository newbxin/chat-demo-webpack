"use client";

import { Tooltip } from "./tooltip";

export type AgentMode = "flash" | "thinking" | "pro" | "ultra";

const MODE_LABELS: Record<AgentMode, { label: string; description: string }> = {
  flash: {
    label: "Flash",
    description: "Fast and efficient, but may not be accurate",
  },
  thinking: {
    label: "Reasoning",
    description:
      "Reasoning before action, balance between time and accuracy",
  },
  pro: {
    label: "Pro",
    description:
      "Reasoning, planning and executing, get more accurate results, may take more time",
  },
  ultra: {
    label: "Ultra",
    description:
      "Pro mode with subagents to divide work; best for complex multi-step tasks",
  },
};

export function ModeHoverGuide({
  mode,
  children,
  showTitle = true,
}: {
  mode: AgentMode;
  children: React.ReactNode;
  /** When true, tooltip shows "ModeName: Description". When false, only description. */
  showTitle?: boolean;
}) {
  const { label, description } = MODE_LABELS[mode];
  const content = showTitle ? `${label}: ${description}` : description;

  return <Tooltip content={content}>{children}</Tooltip>;
}
