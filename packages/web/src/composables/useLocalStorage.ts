import { ref, watch, type Ref } from 'vue';

/** A ref persisted in localStorage under `key` (JSON). */
export function useLocalStorage<T>(key: string, initial: T): Ref<T> {
  const value = ref(read(key, initial)) as Ref<T>;
  watch(value, (current) => localStorage.setItem(key, JSON.stringify(current)), { deep: true });
  return value;
}

function read<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}
