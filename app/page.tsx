"use client";

import { useState, type FormEvent } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setError("");
    setAnswer("");

    if (!question.trim()) {
      setError("Escribí una pregunta antes de consultar.");
      return;
    }

    if (question.length > 1000) {
      setError("La pregunta no puede superar los 1000 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/test-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: AbortSignal.timeout(35_000),
      });
      const data: unknown = await response.json();

      if (!data || typeof data !== "object") {
        setError("No recibimos una respuesta válida. Volvé a intentarlo.");
        return;
      }

      if (!response.ok) {
        setError(
          "error" in data && typeof data.error === "string"
            ? data.error
            : "No pudimos completar la consulta. Volvé a intentarlo.",
        );
        return;
      }

      if (!("result" in data) || typeof data.result !== "string" || !data.result.trim()) {
        setError("No recibimos una respuesta válida. Volvé a intentarlo.");
        return;
      }

      setAnswer(data.result);
    } catch (error) {
      setError(
        error instanceof Error && error.name === "TimeoutError"
          ? "La consulta tardó demasiado. Volvé a intentarlo."
          : "No pudimos conectar con el asistente. Volvé a intentarlo.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-stone-50 px-5 py-12 font-sans text-slate-900 sm:px-8 sm:py-20">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10">
          <span className="mb-5 inline-flex rounded-full border border-teal-900/15 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900">
            Prueba inicial
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Finance AI</h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            Asistente de Administración y Finanzas
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Consulta al asistente">
          <form onSubmit={handleSubmit} aria-busy={isLoading}>
            <label htmlFor="question" className="block text-sm font-semibold">
              Tu pregunta
            </label>
            <textarea
              id="question"
              name="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Por ejemplo: ¿cuál es la diferencia entre ingresos y ganancias?"
              maxLength={1000}
              rows={5}
              required
              disabled={isLoading}
              aria-describedby="question-help question-count"
              className="mt-3 block w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-base leading-relaxed placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <div className="mt-3 flex items-start justify-between gap-4 text-xs text-slate-500">
              <p id="question-help">Hacé una consulta general, sin datos sensibles.</p>
              <span id="question-count" className="shrink-0 tabular-nums">
                {question.length}/1000
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
            >
              {isLoading && (
                <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
              )}
              {isLoading ? "Consultando…" : "Consultar"}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
              {error}
            </p>
          )}

          <section aria-labelledby="answer-heading" aria-live="polite" aria-busy={isLoading} className="mt-8 border-t border-slate-100 pt-6">
            <h2 id="answer-heading" className="text-sm font-semibold">Respuesta</h2>
            {isLoading ? (
              <p role="status" className="mt-3 text-sm text-slate-500">Preparando tu respuesta…</p>
            ) : answer ? (
              <p className="mt-3 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">{answer}</p>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                La respuesta a tu consulta aparecerá acá.
              </p>
            )}
          </section>
        </section>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          Versión de prueba · Sin conexión a datos financieros reales.
          <br />
          Cada consulta es independiente de las anteriores.
        </p>
      </div>
    </main>
  );
}
