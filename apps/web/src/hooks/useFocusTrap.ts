import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element.getClientRects().length > 0,
  );
}

/**
 * Prende o foco dentro do container enquanto estiver ativo e devolve o foco ao
 * elemento que abriu o overlay ao fechar.
 *
 * Sem isso, quem navega por teclado sai do modal com Tab e passa a interagir com
 * um conteúdo que visualmente está atrás de uma sobreposição.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Foca o primeiro elemento interativo; se não houver, foca o próprio
    // container para que leitores de tela anunciem o conteúdo do diálogo.
    const focusables = getFocusableElements(container);
    const initialTarget = focusables[0] ?? container;
    if (initialTarget === container && !container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }
    initialTarget.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && onEscape) {
        event.stopPropagation();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const current = getFocusableElements(container);
      if (current.length === 0) {
        event.preventDefault();
        return;
      }

      const first = current[0]!;
      const last = current[current.length - 1]!;
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [containerRef, active, onEscape]);
}
