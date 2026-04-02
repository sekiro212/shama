import type { Content } from "@google/genai";

const MAX_HISTORY = 20; // ~10 exchanges

export function appendUserMessage(history: Content[], text: string): Content[] {
  return [
    ...history,
    { role: "user", parts: [{ text }] },
  ];
}

export function appendModelMessage(history: Content[], text: string): Content[] {
  return [
    ...history,
    { role: "model", parts: [{ text }] },
  ];
}

export function appendToolCall(
  history: Content[],
  toolName: string,
  args: Record<string, unknown>
): Content[] {
  return [
    ...history,
    {
      role: "model",
      parts: [{ functionCall: { name: toolName, args } }],
    },
  ];
}

export function appendToolResult(
  history: Content[],
  toolName: string,
  result: string
): Content[] {
  return [
    ...history,
    {
      role: "user",
      parts: [{ functionResponse: { name: toolName, response: { result } } }],
    },
  ];
}

export function trimHistory(history: Content[]): Content[] {
  if (history.length > MAX_HISTORY) {
    return history.slice(-MAX_HISTORY);
  }
  return [...history];
}

export function resetHistory(): Content[] {
  return [];
}
