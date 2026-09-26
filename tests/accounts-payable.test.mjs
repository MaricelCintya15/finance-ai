import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeAccountsPayable, SummaryValidationError } from "../lib/accounts-payable-summary.ts";

const headers = ["Estado", "Monto Total", "Moneda", "F. Pago", "Proveedor"];

test("separa estados y monedas sin atribuir el importe original a un pago parcial", () => {
  const result = summarizeAccountsPayable([
    headers,
    ["NO PAGADO", 1200.25, "ARS", "OCTUBRE", "Proveedor ficticio"],
    ["NO PAGADO", 100.1, "ARS"],
    ["NO PAGADO", 50, "USD"],
    ["PAGADO", 9000, "ARS", "01/09/2026"],
    ["PAGADO PARCIAL", 7000, "ARS"],
    ["NO PAGAR", 8000, "ARS"],
  ]);
  assert.deepEqual(result, {
    dataRowCount: 6,
    unpaid: { count: 3, totalsByCurrency: [{ currency: "ARS", amount: 1300.35 }, { currency: "USD", amount: 50 }] },
    paid: { count: 1 },
    partiallyPaid: { count: 1, pendingBalance: null },
    doNotPay: { count: 1 },
    pendingBalanceComplete: false,
  });
  assert.equal(JSON.stringify(result).includes("Proveedor ficticio"), false);
});

test("ubica columnas por encabezado, normaliza espacios y no convierte monedas", () => {
  const result = summarizeAccountsPayable([
    [" moneda ", " monto   total ", " estado "],
    [" ars ", 10, " no   pagado "],
    ["ARS", 20, "NO PAGADO"],
    ["PESOS", 30, "NO PAGADO"],
    ["usd", 40, "no pagado"],
  ]);
  assert.deepEqual(result.unpaid.totalsByCurrency, [
    { currency: "ARS", amount: 30 }, { currency: "PESOS", amount: 30 }, { currency: "USD", amount: 40 },
  ]);
  assert.equal(result.pendingBalanceComplete, true);
});

test("ignora filas vacías, admite encabezados sin datos y cuenta importes cero", () => {
  const empty = summarizeAccountsPayable([headers, [], ["", null, "  "]]);
  assert.equal(empty.dataRowCount, 0);
  assert.deepEqual(empty.unpaid.totalsByCurrency, []);
  const zero = summarizeAccountsPayable([headers, ["NO PAGADO", 0, "ARS"]]);
  assert.equal(zero.unpaid.count, 1);
  assert.deepEqual(zero.unpaid.totalsByCurrency, [{ currency: "ARS", amount: 0 }]);
});

test("F. Pago no determina si algo está pendiente ni vencido", () => {
  const result = summarizeAccountsPayable([
    headers, ["PAGADO", 100, "ARS", "ENERO"],
    ["NO PAGADO", 200, "ARS", "01/01/2020"],
    ["NO PAGADO", 300, "ARS", "DICIEMBRE"],
  ]);
  assert.equal(result.paid.count, 1);
  assert.equal(result.unpaid.count, 2);
  assert.deepEqual(result.unpaid.totalsByCurrency, [{ currency: "ARS", amount: 500 }]);
  assert.equal("overdue" in result, false);
});

test("suma en centavos, redondea por comprobante y respeta el signo de la hoja", () => {
  const result = summarizeAccountsPayable([
    headers,
    ["NO PAGADO", 0.1, "ARS"], ["NO PAGADO", 0.2, "ARS"],
    ["NO PAGADO", 1.005, "USD"], ["NO PAGADO", 10.075, "USD"],
    ["NO PAGADO", -0.005, "USD"], ["NO PAGADO", -1, "USD"],
    ["NO PAGADO", 1e-7, "EUR"],
  ]);
  assert.deepEqual(result.unpaid.totalsByCurrency, [
    { currency: "ARS", amount: 0.3 }, { currency: "EUR", amount: 0 }, { currency: "USD", amount: 10.08 },
  ]);
});

test("rechaza encabezados ausentes o duplicados en lugar de devolver un total engañoso", () => {
  for (const rows of [[], [["Estado", "Moneda"]], [[...headers, " MONTO TOTAL "]]]) {
    assert.throws(() => summarizeAccountsPayable(rows), SummaryValidationError);
  }
});

test("rechaza estados desconocidos o vacíos y no divulga el valor rechazado", () => {
  for (const status of ["", "PENDIENTE", null, 123, "dato privado ficticio"]) {
    assert.throws(() => summarizeAccountsPayable([headers, [status, 10, "ARS"]]), (error) => {
      assert.ok(error instanceof SummaryValidationError);
      assert.equal(error.message.includes("dato privado ficticio"), false);
      return true;
    });
  }
});

test("rechaza importes de texto, vacíos, booleanos, no finitos o sin moneda", () => {
  for (const value of ["100", "1.234,56", "", null, true, NaN, Infinity, undefined]) {
    assert.throws(() => summarizeAccountsPayable([headers, ["NO PAGADO", value, "ARS"]]), SummaryValidationError);
  }
  for (const currency of ["", "  ", null, true, 123]) {
    assert.throws(() => summarizeAccountsPayable([headers, ["NO PAGADO", 100, currency]]), SummaryValidationError);
  }
});

test("no intenta calcular saldos parciales ni sumar importes de estados excluidos", () => {
  const result = summarizeAccountsPayable([
    headers, ["PAGADO PARCIAL"], ["PAGADO"], ["NO PAGAR"],
  ]);
  assert.equal(result.dataRowCount, 3);
  assert.deepEqual(result.unpaid, { count: 0, totalsByCurrency: [] });
  assert.deepEqual(result.partiallyPaid, { count: 1, pendingBalance: null });
  assert.equal(result.pendingBalanceComplete, false);
});

test("rechaza importes y acumulaciones fuera de la precisión numérica segura", () => {
  assert.throws(() => summarizeAccountsPayable([headers, ["NO PAGADO", 1e20, "ARS"]]), SummaryValidationError);
  assert.throws(() => summarizeAccountsPayable([
    headers, ["NO PAGADO", 5e13, "ARS"], ["NO PAGADO", 5e13, "ARS"],
  ]), SummaryValidationError);
});
