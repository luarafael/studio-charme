import { useEffect, useRef, type RefObject } from 'react';

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

function getInitialFocusTarget(container: HTMLElement): HTMLElement {
  const field = container.querySelector<HTMLElement>(
    'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [data-autofocus]',
  );
  if (field) return field;

  const focusables = getFocusableElements(container);
  return focusables[0] ?? container;
}

/**
 * Prende o foco dentro do container enquanto estiver ativo e devolve o foco ao
 * elemento que abriu o overlay ao fechar.
 *
 * Sem isso, quem navega por teclado sai do modal com Tab e passa a interagir com
 * um conteúdo que visualmente está atrás de uma sobreposição.
 *
 * `onEscape` fica em ref de propósito: se entrar nas dependências do efeito, cada
 * re-render do formulário (a cada tecla) reinicia a armadilha e o foco pula para
 * o botão Fechar.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    if (!container.contains(document.activeElement)) {
      const initialTarget = getInitialFocusTarget(container);
      if (initialTarget === container && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
      }
      initialTarget.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && onEscapeRef.current) {
        event.stopPropagation();
        onEscapeRef.current();
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
  }, [containerRef, active]);
}
