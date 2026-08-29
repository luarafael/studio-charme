import { useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TabItem<T extends string> = {
  value: T;
  label: string;
  /** Contador opcional exibido ao lado do rótulo. */
  count?: number;
};

export type TabsProps<T extends string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Abas conforme o padrão ARIA: apenas a aba ativa é focável e as setas do
 * teclado movem a seleção, como a usuária espera de um conjunto de abas.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  children,
}: TabsProps<T>) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const activeIndex = items.findIndex((item) => item.value === value);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const lastIndex = items.length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = activeIndex >= lastIndex ? 0 : activeIndex + 1;
        break;
      case 'ArrowLeft':
        nextIndex = activeIndex <= 0 ? lastIndex : activeIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextItem = items[nextIndex];
    if (!nextItem) return;

    onChange(nextItem.value);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab-value="${nextItem.value}"]`)
      ?.focus();
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        // A lista não recebe foco: ele fica na aba ativa, com tabindex móvel.
        tabIndex={-1}
        className="border-brown-100 flex gap-1 overflow-x-auto border-b"
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              data-tab-value={item.value}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold',
                'ease-brand transition-colors duration-200',
                selected
                  ? 'border-gold-600 text-brown-900'
                  : 'text-brown-500 hover:border-brown-200 hover:text-brown-800 border-transparent',
              )}
            >
              {item.label}
              {typeof item.count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs',
                    selected ? 'bg-gold-100 text-gold-800' : 'bg-brown-100 text-brown-600',
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {children && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${value}`}
          aria-labelledby={`${baseId}-tab-${value}`}
          tabIndex={0}
          className="pt-5"
        >
          {children}
        </div>
      )}
    </div>
  );
}
