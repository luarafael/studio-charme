import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TableColumn<T> = {
  /** Chave estável usada como identificador da coluna. */
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Oculta a coluna na versão em cartões do celular. */
  hideOnMobile?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
};

export type TableProps<T> = {
  caption: string;
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  /** Conteúdo exibido quando não há linhas. */
  empty?: ReactNode;
  /** Ações por linha, renderizadas no rodapé do cartão no celular. */
  renderRowActions?: (row: T) => ReactNode;
  className?: string;
};

const alignClasses = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/**
 * Tabela que vira lista de cartões no celular.
 *
 * A mesma definição de colunas alimenta os dois formatos: no desktop sai uma
 * `table` semântica com `caption`, e abaixo de `md` cada linha se torna um
 * cartão com os rótulos ao lado dos valores, porque tabela larga com rolagem
 * horizontal é difícil de usar no celular.
 */
export function Table<T>({
  caption,
  columns,
  rows,
  getRowId,
  empty,
  renderRowActions,
  className,
}: TableProps<T>) {
  if (rows.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  const mobileColumns = columns.filter((column) => !column.hideOnMobile);

  return (
    <div className={className}>
      <div className="rounded-card border-brown-100 hidden overflow-hidden border md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-surface-muted">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'border-brown-100 text-brown-700 border-b px-4 py-3 font-semibold',
                    alignClasses[column.align ?? 'left'],
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {renderRowActions && (
                <th scope="col" className="border-brown-100 border-b px-4 py-3 text-right">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowId(row)} className="hover:bg-gold-50/50 transition-colors">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-brown-50 text-brown-800 border-b px-4 py-3',
                      alignClasses[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {renderRowActions && (
                  <td className="border-brown-50 border-b px-4 py-3 text-right">
                    {renderRowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={getRowId(row)}
            className="rounded-card border-brown-100 shadow-card border bg-white p-4"
          >
            <dl className="flex flex-col gap-2">
              {mobileColumns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-4 text-sm">
                  <dt className="text-brown-600 shrink-0 font-semibold">{column.header}</dt>
                  <dd className="text-brown-900 min-w-0 text-right">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
            {renderRowActions && (
              <div className="border-brown-50 mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                {renderRowActions(row)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
