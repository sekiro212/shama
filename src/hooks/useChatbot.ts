import { useState, useCallback, useEffect } from "react";
import { chatWithAIStream } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/services/trackingService";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function useChatbot() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("chatbot.welcome"),
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages(prev => prev.map(m =>
      m.id === "welcome" ? { ...m, content: t("chatbot.welcome") } : m
    ));
  }, [language, t]);

  const sendMessage = useCallback(async (userText: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    trackEvent("chatbot_query", { query: userText });

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Build conversation history for context (exclude the welcome message)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: (m.role === "user" ? "user" : "model") as "user" | "model",
          text: m.content,
        }));

      const stream = chatWithAIStream(userText, history);

      for await (const chunk of stream) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: t("chatbot.error"),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: t("chatbot.welcome"),
        timestamp: new Date(),
      },
    ]);
  }, [t]);

  return { messages, isLoading, sendMessage, clearChat };
}
