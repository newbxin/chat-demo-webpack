"use client";

import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function InputBox({
  className,
  isStreaming = false,
  onStop,
  onSubmit,
}: {
  className?: string;
  isStreaming?: boolean;
  onStop?: () => void;
  onSubmit?: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit?.(value);
    setValue("");
  };

  return (
    <form
      className={cn(
        "bg-background/85 flex items-end gap-2 rounded-2xl border p-2 backdrop-blur-sm",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (isStreaming) {
          onStop?.();
          return;
        }
        handleSubmit();
      }}
    >
      <textarea
        className="min-h-24 max-h-60 w-full resize-y bg-transparent px-2 py-1 text-sm outline-none"
        placeholder="输入消息..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (isStreaming && e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onStop?.();
            return;
          }

          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isStreaming ? false : !value.trim()}
        onClick={(e) => {
          if (!isStreaming) {
            return;
          }

          e.preventDefault();
          onStop?.();
        }}
        type={isStreaming ? "button" : "submit"}
      >
        {isStreaming ? (
          <SquareIcon className="size-4 fill-current" />
        ) : (
          <ArrowUpIcon className="size-4" />
        )}
      </button>
    </form>
  );
}
