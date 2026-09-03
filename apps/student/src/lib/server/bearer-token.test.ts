import { describe, expect, it } from "vitest";
import { readBearerToken } from "./bearer-token";

describe("readBearerToken", () => {
  it("extracts a Bearer access token from Expo / mobile Authorization headers", () => {
    expect(readBearerToken("Bearer eyJhbGciOiJIUzI1NiJ9.aaa.bbb")).toBe(
      "eyJhbGciOiJIUzI1NiJ9.aaa.bbb",
    );
  });

  it("accepts lowercase bearer and trims space", () => {
    expect(readBearerToken("  bearer   tok-123  ")).toBe("tok-123");
  });

  it("returns empty when the header is missing or not Bearer", () => {
    expect(readBearerToken(null)).toBe("");
    expect(readBearerToken(undefined)).toBe("");
    expect(readBearerToken("Basic abc")).toBe("");
    expect(readBearerToken("Bearer")).toBe("");
  });
});
