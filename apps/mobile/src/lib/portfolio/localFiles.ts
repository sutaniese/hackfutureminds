import { File } from "expo-file-system";
import { memoryGet, memorySet, readJson, writeJson } from "../storage";

export const PORTFOLIO_NOTES_KEY = "ten-portfolio-notes";
export const PORTFOLIO_FILES_KEY = "ten-portfolio-files";

export const MAX_FILES = 6;
export const MAX_BYTES = 1_200_000;
export const MAX_DATA_CHARS = 4_500_000;

export type StoredFileItem = {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  addedAt: number;
};

export function byteLabel(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function loadPortfolioNotes(): string {
  return memoryGet(PORTFOLIO_NOTES_KEY) ?? "";
}

export function savePortfolioNotes(value: string): void {
  memorySet(PORTFOLIO_NOTES_KEY, value);
}

export function loadPortfolioFiles(): StoredFileItem[] {
  const list = readJson<StoredFileItem[]>(PORTFOLIO_FILES_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter(
    (item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.dataUrl === "string",
  );
}

export function savePortfolioFiles(list: StoredFileItem[]): void {
  writeJson(PORTFOLIO_FILES_KEY, list);
}

export function randomFileId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function totalDataChars(list: StoredFileItem[], extra = 0): number {
  return list.reduce((sum, item) => sum + item.dataUrl.length, 0) + extra;
}

export async function uriToDataUrl(uri: string, mime: string): Promise<string> {
  const mimeType = mime || "application/octet-stream";
  try {
    const file = new File(uri);
    const base64 = await file.base64();
    if (!base64) throw new Error("empty");
    return `data:${mimeType};base64,${base64}`;
  } catch {
    const legacy = await import("expo-file-system/legacy");
    const base64 = await legacy.readAsStringAsync(uri, { encoding: legacy.EncodingType.Base64 });
    if (!base64) throw new Error("empty");
    return `data:${mimeType};base64,${base64}`;
  }
}
