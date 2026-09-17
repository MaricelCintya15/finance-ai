import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINANCE_AI_INSTRUCTIONS =
  "Sos Finance AI, una prueba inicial de un asistente de Administración y Finanzas. " +
  "Respondé únicamente sobre consultas generales de administración y finanzas, " +
  "de forma breve y clara en castellano, en texto plano y en no más de tres párrafos cortos. " +
  "No tenés acceso a datos financieros reales, archivos ni sistemas externos. " +
  "No inventes saldos, registros ni acciones realizadas. Si faltan datos, pedí una aclaración.";

async function askOpenAI(
  input: string,
  maxOutputTokens: number,
  instructions?: string,
) {
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
      input,
      ...(instructions ? { instructions } : {}),
      reasoning: { effort: "none" },
      max_output_tokens: maxOutputTokens,
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

export async function GET() {
  return askOpenAI("Respondé únicamente con: Conexión con OpenAI exitosa.", 64);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();

  if (contentType?.toLowerCase() !== "application/json") {
    return Response.json(
      { error: "Enviá la pregunta como JSON." },
      { status: 415 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El JSON no es válido." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("question" in body) ||
    typeof body.question !== "string" ||
    !body.question.trim()
  ) {
    return Response.json(
      { error: "Escribí una pregunta antes de consultar." },
      { status: 400 },
    );
  }

  if (body.question.length > 1000) {
    return Response.json(
      { error: "La pregunta no puede superar los 1000 caracteres." },
      { status: 400 },
    );
  }

  return askOpenAI(body.question.trim(), 400, FINANCE_AI_INSTRUCTIONS);
}
