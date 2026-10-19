/* eslint-disable react-refresh/only-export-components -- class component +
 * a private fallback component live together in this file on purpose: the
 * fallback is an implementation detail of the boundary and does not warrant
 * its own module. Fast-refresh is unaffected because class components do not
 * participate in Vite HMR regardless of this rule. */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "@/lib/logError";

interface Props {
  children: ReactNode;
  /** Logical area, e.g. "admin-shell" or "route:/admin/leads". Shown in error_logs. */
  scope?: string;
  /** Optional custom fallback. Receives the error + a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError({
      error,
      componentStack: info.componentStack ?? null,
      scope: this.props.scope ?? "error-boundary",
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback error={error} reset={this.reset} />;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  const isDev = import.meta.env.DEV;
  return (
    <div
      role="alert"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "32rem",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          padding: "1.5rem 1.5rem 1.25rem",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#111827" }}>
          Something went wrong on this page
        </h1>
        <p style={{ marginTop: "0.5rem", color: "#4b5563", fontSize: "0.925rem", lineHeight: 1.5 }}>
          The team has been notified. You can try again, or head back to the dashboard.
        </p>
        {isDev && (
          <details style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "#6b7280" }}>
            <summary style={{ cursor: "pointer", color: "#374151" }}>Error details (dev only)</summary>
            <pre
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                background: "#f9fafb",
                borderRadius: "0.5rem",
                overflow: "auto",
                maxHeight: "16rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {error.name}: {error.message}
              {error.stack ? "\n\n" + error.stack : ""}
            </pre>
          </details>
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 0.875rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              background: "#fff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#111827",
            }}
          >
            Try again
          </button>
          <a
            href="/admin"
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: "0.5rem",
              background: "#111827",
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
