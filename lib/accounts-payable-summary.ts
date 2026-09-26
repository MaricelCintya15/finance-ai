import type { SheetCell } from "./google-sheets";

export class SummaryValidationError extends Error {}

function normalizedText(value: SheetCell | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").toUpperCase() : "";
}

function amountInCents(value: SheetCell | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SummaryValidationError(
      "Hay comprobantes NO PAGADO sin un Monto Total numérico válido. Revisá las celdas de la hoja; no se calculó el resumen.",
    );
  }

  // Redondeo decimal por comprobante a dos decimales, con mitades alejadas de cero.
  // Desplazar el exponente evita errores como Math.round(1.005 * 100) === 100.
  const [coefficient, exponent = "0"] = Math.abs(value).toString().split("e");
  const cents = Math.sign(value) * Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  if (!Number.isSafeInteger(cents)) {
    throw new SummaryValidationError("Un importe excede el límite de cálculo seguro.");
  }
  return cents;
}

export function summarizeAccountsPayable(rows: SheetCell[][]) {
  const headers = (rows[0] ?? []).map(normalizedText);
  const requiredHeaders = ["ESTADO", "MONTO TOTAL", "MONEDA"];
  if (requiredHeaders.some((header) => headers.filter((value) => value === header).length !== 1)) {
    throw new SummaryValidationError(
      "La primera fila del rango debe contener una sola columna Estado, Monto Total y Moneda.",
    );
  }

  const statusIndex = headers.indexOf("ESTADO");
  const amountIndex = headers.indexOf("MONTO TOTAL");
  const currencyIndex = headers.indexOf("MONEDA");
  const counts = { unpaid: 0, paid: 0, partiallyPaid: 0, doNotPay: 0 };
  const totalsInCents = new Map<string, number>();

  for (const row of rows.slice(1)) {
    if (row.every((cell) => cell === null || String(cell).trim() === "")) continue;

    switch (normalizedText(row[statusIndex])) {
      case "NO PAGADO": {
        const currency = normalizedText(row[currencyIndex]);
        if (!currency) {
          throw new SummaryValidationError(
            "Hay comprobantes NO PAGADO sin una Moneda válida. No se calculó el resumen.",
          );
        }
        const total = (totalsInCents.get(currency) ?? 0) + amountInCents(row[amountIndex]);
        if (!Number.isSafeInteger(total)) {
          throw new SummaryValidationError("Un total excede el límite de cálculo seguro.");
        }
        totalsInCents.set(currency, total);
        counts.unpaid++;
        break;
      }
      case "PAGADO":
        counts.paid++;
        break;
      case "PAGADO PARCIAL":
        counts.partiallyPaid++;
        break;
      case "NO PAGAR":
        counts.doNotPay++;
        break;
      default:
        throw new SummaryValidationError(
          "Hay filas con Estado vacío o desconocido. Usá NO PAGADO, PAGADO, PAGADO PARCIAL o NO PAGAR; no se calculó el resumen.",
        );
    }
  }

  return {
    dataRowCount: counts.unpaid + counts.paid + counts.partiallyPaid + counts.doNotPay,
    unpaid: {
      count: counts.unpaid,
      totalsByCurrency: Array.from(totalsInCents)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([currency, cents]) => ({ currency, amount: cents / 100 })),
    },
    paid: { count: counts.paid },
    partiallyPaid: { count: counts.partiallyPaid, pendingBalance: null },
    doNotPay: { count: counts.doNotPay },
    // Los totales NO PAGADO no incluyen saldos parciales desconocidos.
    pendingBalanceComplete: counts.partiallyPaid === 0,
  };
}
