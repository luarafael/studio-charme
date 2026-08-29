import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: (reset: () => void) => ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Impede que um erro de renderização derrube a aplicação inteira em tela branca.
 * A mensagem mostrada é genérica: detalhes técnicos vão apenas para o console.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erro não tratado na interface:', error, info.componentStack);
  }

  private readonly reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(this.reset);
    }

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="text-brown-900 text-2xl">Algo não funcionou como esperado</h1>
        <p className="text-brown-600">
          Tivemos um problema ao carregar esta parte da página. Você pode tentar novamente.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-control bg-brown-900 text-cream hover:bg-brown-800 px-5 py-3 font-semibold transition"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
