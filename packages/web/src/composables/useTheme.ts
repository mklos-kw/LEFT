import { watchEffect, type Ref } from 'vue';
import { useLocalStorage } from './useLocalStorage';

export type Theme = 'system' | 'light' | 'dark';

/**
 * The colour theme, saved in the browser. `system` follows the OS setting;
 * `light`/`dark` set `data-theme` on <html>, which the stylesheet prefers.
 */
export function useTheme(): Ref<Theme> {
  const theme = useLocalStorage<Theme>('theme', 'system');
  watchEffect(() => {
    const root = document.documentElement;
    if (theme.value === 'light' || theme.value === 'dark') root.dataset.theme = theme.value;
    else delete root.dataset.theme;
  });
  return theme;
}
