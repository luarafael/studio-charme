import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * Informa se a página já passou de um deslocamento vertical.
 *
 * A posição da rolagem é estado do navegador, então é lida com
 * `useSyncExternalStore`. A notificação passa por `requestAnimationFrame` para
 * não recalcular a cada evento de scroll, o que travaria a rolagem no celular.
 */
export function useScrolledPast(threshold: number): boolean {
  const frameRef = useRef(0);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleScroll = (): void => {
      if (frameRef.current !== 0) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0;
        onStoreChange();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current !== 0) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, []);

  const getSnapshot = useCallback(() => window.scrollY > threshold, [threshold]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
