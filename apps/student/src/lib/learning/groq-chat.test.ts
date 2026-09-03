import { describe, expect, it } from "vitest";
import { extractGroqMessageText, extractJsonObject } from "./groq-chat";

describe("groq message extraction", () => {
  it("reads content and falls back to reasoning", () => {
    expect(extractGroqMessageText({ content: "  hello  " })).toBe("hello");
    expect(extractGroqMessageText({ content: "", reasoning: "{\"a\":1}" })).toBe("{\"a\":1}");
  });

  it("extracts JSON wrapped in prose and curly quotes", () => {
    const raw = "Sure:\n```json\n{\n  \"title\": “Производная”\n}\n```";
    expect(extractJsonObject<{ title: string }>(raw)?.title).toBe("Производная");
  });
});
