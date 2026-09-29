import * as React from "react";

interface Props {
  children: React.ReactNode;
  /** Si se indica, el fallo se contiene y no se muestra el aviso a pantalla completa. */
  silent?: boolean;
}

interface State {
  error: Error | null;
}

/**
 * Evita la pantalla en blanco: si un componente falla (por ejemplo, una API no
 * soportada en el navegador del móvil), se muestra un aviso con opción de recargar
 * en lugar de desmontar toda la aplicación.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary", error, info);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    if (this.props.silent) return null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-xl font-bold text-foreground">Algo no se ha cargado bien</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ha ocurrido un problema al mostrar esta pantalla. Vuelve a intentarlo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-12 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground"
        >
          Recargar
        </button>
      </div>
    );
  }
}
