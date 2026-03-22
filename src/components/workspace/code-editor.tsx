interface CodeEditorProps {
  value: string;
  language?: string;
  className?: string;
  readOnly?: boolean;
  readonly?: boolean;
  onChange?: (value: string) => void;
}

export function CodeEditor({ value, className }: CodeEditorProps) {
  return (
    <pre className={className ?? "bg-muted overflow-auto rounded-md p-4 text-sm"}>
      <code>{value}</code>
    </pre>
  );
}
