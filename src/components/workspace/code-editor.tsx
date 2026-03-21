interface CodeEditorProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export function CodeEditor({ value }: CodeEditorProps) {
  return (
    <pre className="p-4 bg-muted rounded-md overflow-auto text-sm">
      <code>{value}</code>
    </pre>
  );
}
