/**
 * Placeholder exibido enquanto o bundle de uma rota é carregado.
 * Usa `aria-busy` e texto para leitores de tela, em vez de depender apenas do
 * efeito visual de carregamento.
 */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-6"
      role="status"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="border-brown-200 border-t-gold-600 size-10 animate-spin rounded-full border-2 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p className="text-brown-600 text-sm">Carregando…</p>
      </div>
    </div>
  );
}
