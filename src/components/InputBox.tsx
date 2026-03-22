"use client";

import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function InputBox({
  className,
  onSubmit,
}: {
  className?: string;
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
        handleSubmit();
      }}
    >
      <textarea
        className="min-h-24 max-h-60 w-full resize-y bg-transparent px-2 py-1 text-sm outline-none"
        placeholder="输入消息..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!value.trim()}
        type="submit"
      >
        <ArrowUpIcon className="size-4" />
      </button>
    </form>
  );
}
