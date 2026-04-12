import { vi } from "vitest";

// Shared config mock — every test file imports modules that ultimately read
// from src/config.ts (which calls requireEnv at import time). Mock it once
// here via setupFiles so individual test files don't repeat the block.
vi.mock("../config", () => ({
  config: {
    telegramToken: "test-token",
    openRouterApiKey: "test-openrouter-key",
    groqApiKey: "test-groq-key",
    supabaseUrl: "http://localhost",
    supabaseServiceKey: "test-key",
    adminChatIds: [1],
  },
}));
