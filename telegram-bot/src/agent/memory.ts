import type { ChatMessage } from "../types";

const MAX_HISTORY = 20; // ~10 exchanges

export function appendUserMessage(history: ChatMessage[], text: string): ChatMessage[] {
  return [
    ...history,
    { role: "user", content: text },
  ];
}

export function appendModelMessage(history: ChatMessage[], text: string): ChatMessage[] {
  return [
    ...history,
    { role: "assistant", content: text },
  ];
}

export function appendToolCall(
  history: ChatMessage[],
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>
): ChatMessage[] {
  return [
    ...history,
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: toolCallId,
          type: "function" as const,
          function: { name: toolName, arguments: JSON.stringify(args) },
        },
      ],
    },
  ];
}

export function appendToolResult(
  history: ChatMessage[],
  toolCallId: string,
  _toolName: string,
  result: string
): ChatMessage[] {
  return [
    ...history,
    {
      role: "tool",
      content: result,
      tool_call_id: toolCallId,
    },
  ];
}

export function trimHistory(history: ChatMessage[]): ChatMessage[] {
  if (history.length <= MAX_HISTORY) {
    return [...history];
  }

  let trimmed = history.slice(-MAX_HISTORY);

  // OpenAI requires every "tool" message to have a matching "assistant"
  // message with tool_calls preceding it. If trimming cut off the assistant
  // message, drop orphaned tool messages from the front.
  while (
    trimmed.length > 0 &&
    (trimmed[0].role === "tool" ||
      (trimmed[0].role === "assistant" && trimmed[0].tool_calls && !trimmed[0].content))
  ) {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}

export function resetHistory(): ChatMessage[] {
  return [];
}
