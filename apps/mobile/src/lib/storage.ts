import AsyncStorage from "@react-native-async-storage/async-storage";

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

export async function hydrateMemoryStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length === 0) return;
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (key && value != null) memory.set(key, value);
  }
}

export function memoryGet(key: string): string | null {
  return memory.get(key) ?? null;
}

export function memorySet(key: string, value: string): void {
  memory.set(key, value);
  void AsyncStorage.setItem(key, value);
  emitStorage();
}

export function memoryRemove(key: string): void {
  memory.delete(key);
  void AsyncStorage.removeItem(key);
  emitStorage();
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = memoryGet(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  memorySet(key, JSON.stringify(value));
}

export function subscribeStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitStorage(): void {
  listeners.forEach((listener) => listener());
}

export function emitStorageChange(): void {
  emitStorage();
}
