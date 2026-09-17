import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      { error: "Falta configurar OPENAI_API_KEY en el servidor." },
      { status: 500 },
    );
  }

  try {
    const openai = new OpenAI({
      apiKey,
      maxRetries: 0,
      timeout: 30_000,
      logLevel: "off",
    });

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: "Respondé únicamente con: Conexión con OpenAI exitosa.",
      reasoning: { effort: "none" },
      max_output_tokens: 64,
      store: false,
    });

    if (response.status !== "completed" || !response.output_text?.trim()) {
      return Response.json(
        { error: "OpenAI no devolvió una respuesta de texto completa." },
        { status: 502 },
      );
    }

    return Response.json(
      { result: response.output_text },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // No registrar ni devolver errores del SDK: pueden incluir datos sensibles.
    return Response.json(
      { error: "No se pudo completar la prueba de conexión con OpenAI." },
      { status: 502 },
    );
  }
}
