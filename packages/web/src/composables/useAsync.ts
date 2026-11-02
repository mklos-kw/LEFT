import { ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: Error };

/**
 * Runs `load` whenever `key` changes; a `null` key loads nothing. A newer
 * request aborts the older one, so stale results never land.
 */
export function useAsync<T>(
  key: MaybeRefOrGetter<string | null>,
  load: (signal: AbortSignal) => Promise<T>,
): { state: Ref<AsyncState<T>>; reload: () => void } {
  const state = shallowRef<AsyncState<T>>({ status: 'idle' });
  const run = ref(0);

  watch(
    [() => toValue(key), run],
    ([current], _previous, onCleanup) => {
      if (current === null) {
        state.value = { status: 'idle' };
        return;
      }
      const controller = new AbortController();
      onCleanup(() => controller.abort());
      state.value = { status: 'loading' };
      load(controller.signal).then(
        (data) => {
          if (!controller.signal.aborted) state.value = { status: 'ready', data };
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          state.value = { status: 'error', error: toError(error) };
        },
      );
    },
    { immediate: true },
  );

  return { state, reload: () => run.value++ };
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Unwraps the data of a ready state, or returns `fallback`. */
export function dataOr<T, F>(state: AsyncState<T>, fallback: F): T | F {
  return state.status === 'ready' ? state.data : fallback;
}
