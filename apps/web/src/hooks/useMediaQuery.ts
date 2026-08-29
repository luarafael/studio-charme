import { useCallback, useSyncExternalStore } from 'react';

/**
 * Observa uma media query.
 *
 * `useSyncExternalStore` é a forma correta de ler estado que vive fora do React:
 * o valor é lido direto do navegador na renderização, sem um efeito que
 * sincroniza depois e provoca uma segunda renderização.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};

      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Indica que a usuária pediu menos animação no sistema operacional.
 * Animações controladas por JavaScript precisam checar isto, porque o CSS
 * `prefers-reduced-motion` não alcança scroll programático nem timers.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
