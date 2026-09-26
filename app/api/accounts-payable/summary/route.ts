import { summarizeAccountsPayable, SummaryValidationError } from "@/lib/accounts-payable-summary";
import { googleSheetsErrorResponse, readGoogleSheetsRows, SHEETS_RESPONSE_HEADERS } from "@/lib/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Google entrega números, independientemente del formato visual de la hoja.
    const rows = await readGoogleSheetsRows("UNFORMATTED_VALUE");
    return Response.json(
      { success: true, ...summarizeAccountsPayable(rows) },
      { headers: SHEETS_RESPONSE_HEADERS },
    );
  } catch (error) {
    if (error instanceof SummaryValidationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: 422, headers: SHEETS_RESPONSE_HEADERS },
      );
    }
    return googleSheetsErrorResponse(error);
  }
}
