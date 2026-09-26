import "server-only";

import { JWT } from "google-auth-library";

const READ_ONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
export const SHEETS_RESPONSE_HEADERS = { "Cache-Control": "no-store" };

export type SheetCell = string | number | boolean | null;
type SheetValues = { values?: SheetCell[][] };

export class GoogleSheetsError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function readGoogleSheetsRows(
  valueRenderOption: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" = "FORMATTED_VALUE",
): Promise<SheetCell[][]> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const range = process.env.GOOGLE_SHEETS_RANGE?.trim();

  if (!email || !privateKey || !spreadsheetId || !range) {
    throw new GoogleSheetsError(
      "Falta configurar la conexión con Google Sheets en el servidor.",
      500,
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
      params: { majorDimension: "ROWS", valueRenderOption, fields: "values" },
    });

    return response.data.values ?? [];
  } catch {
    // No conservar ni mostrar errores originales que puedan incluir datos o claves.
    throw new GoogleSheetsError(
      "No se pudo leer el rango de Google Sheets. Verificá la configuración y los permisos de la cuenta de servicio.",
      502,
    );
  }
}

export function googleSheetsErrorResponse(error: unknown) {
  return Response.json(
    {
      success: false,
      error: error instanceof GoogleSheetsError
        ? error.message
        : "No se pudo procesar la información de Google Sheets.",
    },
    {
      status: error instanceof GoogleSheetsError ? error.status : 500,
      headers: SHEETS_RESPONSE_HEADERS,
    },
  );
}
