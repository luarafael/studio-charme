import { useEffect } from 'react';

let lockCount = 0;

/**
 * Bloqueia a rolagem do fundo enquanto um modal ou drawer está aberto.
 *
 * A contagem permite overlays empilhados: a rolagem só volta quando o último
 * fecha. O padding compensa a largura da barra de rolagem para o conteúdo não
 * dar um salto lateral ao abrir.
 */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const { body } = document;

    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.dataset.scrollLocked = 'true';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        delete body.dataset.scrollLocked;
        body.style.removeProperty('padding-right');
      }
    };
  }, [active]);
}
