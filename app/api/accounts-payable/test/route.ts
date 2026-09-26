import { googleSheetsErrorResponse, readGoogleSheetsRows, SHEETS_RESPONSE_HEADERS } from "@/lib/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await readGoogleSheetsRows();
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
      { headers: SHEETS_RESPONSE_HEADERS },
    );
  } catch (error) {
    return googleSheetsErrorResponse(error);
  }
}
