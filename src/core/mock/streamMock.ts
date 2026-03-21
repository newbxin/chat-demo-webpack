import type { Message } from "@langchain/langgraph-sdk";

const MOCK_RESPONSES = [
  "你好！我是 AI 助手。我可以帮你解答问题、编写代码、分析数据等。有什么我可以帮助你的吗？",
  "这是一个流式打字效果的演示。你可以看到文字是逐字逐句出现的，就像真实的 AI 对话一样。\n\n这种效果通过 `streamdown` 组件实现，它能够实时渲染 Markdown 内容。",
  "让我给你展示一些 Markdown 功能：\n\n**粗体文本**\n*斜体文本*\n\n- 列表项 1\n- 列表项 2\n- 列表项 3\n\n```javascript\nconst greeting = 'Hello World';\nconsole.log(greeting);\n```\n\n数学公式：$E = mc^2$",
];

export function simulateStreamingResponse(
  userMessage: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void
): () => void {
  const responseText = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  const words = responseText.split("");
  let index = 0;
  let cancelled = false;

  const interval = setInterval(() => {
    if (cancelled || index >= words.length) {
      clearInterval(interval);
      if (!cancelled) {
        onComplete();
      }
      return;
    }

    onChunk(words[index]);
    index++;
  }, 30);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

export function createMockMessage(content: string, type: "human" | "ai" = "ai"): Message {
  return {
    id: `mock-${type}-${Date.now()}`,
    type,
    content: [{ type: "text", text: content }],
    additional_kwargs: {},
  };
}
