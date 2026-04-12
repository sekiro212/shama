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
  if (history.length > MAX_HISTORY) {
    return history.slice(-MAX_HISTORY);
  }
  return [...history];
}

export function resetHistory(): ChatMessage[] {
  return [];
}
