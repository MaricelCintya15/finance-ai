import { JWT } from "google-auth-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ_ONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const RESPONSE_HEADERS = { "Cache-Control": "no-store" };

type SheetCell = string | number | boolean | null;
type SheetValues = { values?: SheetCell[][] };

export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const range = process.env.GOOGLE_SHEETS_RANGE?.trim();

  if (!email || !privateKey || !spreadsheetId || !range) {
    return Response.json(
      {
        success: false,
        error: "Falta configurar la conexión con Google Sheets en el servidor.",
      },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }

  try {
    const auth = new JWT({
      email,
      key: privateKey,
      scopes: [READ_ONLY_SCOPE],
      // Desactiva los interceptores de logs del SDK; la autenticación sigue activa.
      useAuthRequestParameters: false,
      transporterOptions: { timeout: 30_000, retry: false },
    });

    const url =
      "https://sheets.googleapis.com/v4/spreadsheets/" +
      `${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
    const response = await auth.request<SheetValues>({
      url,
      method: "GET",
      params: {
        majorDimension: "ROWS",
        valueRenderOption: "FORMATTED_VALUE",
        fields: "values",
      },
    });

    const rows = response.data.values ?? [];
    const columnCount = rows.reduce((width, row) => Math.max(width, row.length), 0);
    const headers = Array.from({ length: columnCount }, (_, index) =>
      String(rows[0]?.[index] ?? "").trim(),
    );
    const dataRowCount = rows.slice(1).filter((row) =>
      row.some((cell) => String(cell ?? "").trim() !== ""),
    ).length;

    // Sólo se devuelve estructura: los valores financieros quedan en el servidor.
    return Response.json(
      { success: true, dataRowCount, columnCount, headers },
      { headers: RESPONSE_HEADERS },
    );
  } catch {
    // Los errores de Google pueden contener credenciales o datos de la hoja.
    return Response.json(
      {
        success: false,
        error:
          "No se pudo leer el rango de Google Sheets. Verificá la configuración y los permisos de la cuenta de servicio.",
      },
      { status: 502, headers: RESPONSE_HEADERS },
    );
  }
}
