/** Parseo y formato numérico estilo Colombia: miles con punto, decimales con coma. */

export function parseColombianNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let s = String(value).trim().replace(/\s/g, "").replace(/^\$/, "");
  if (!s || s === "-" || s === "," || s === ".") return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Ej. 104.601,4 → quitar miles (.) y usar coma como decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Ej. 104601,4
    s = s.replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    const looksLikeThousands =
      parts.length > 2 ||
      (parts.length === 2 && parts[1].length === 3 && /^\d{1,3}$/.test(parts[0]));
    if (looksLikeThousands) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatColombianNumber(
  value: number,
  options?: { decimals?: number; minDecimals?: number }
): string {
  const decimals = options?.decimals ?? 2;
  const minDecimals = options?.minDecimals ?? 0;
  return value.toLocaleString("es-CO", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  });
}

/** Formatea mientras el usuario escribe (1.000.000 o 104.601,4). */
export function formatColombianInput(raw: string, maxDecimals = 2): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  const endsWithComma = trimmed.endsWith(",");
  const commaIdx = trimmed.indexOf(",");

  // Solo la coma es separador decimal; los puntos son miles (se ignoran al extraer dígitos).
  let digitsInt: string;
  let digitsDec: string;

  if (commaIdx >= 0) {
    digitsInt = trimmed.slice(0, commaIdx).replace(/\D/g, "");
    digitsDec = trimmed.slice(commaIdx + 1).replace(/\D/g, "").slice(0, maxDecimals);
  } else {
    digitsInt = trimmed.replace(/\D/g, "");
    digitsDec = "";
  }

  if (!digitsInt && !digitsDec && !endsWithComma) {
    return "";
  }

  const intNum = digitsInt ? parseInt(digitsInt, 10) : 0;
  const formattedInt = intNum.toLocaleString("es-CO", { maximumFractionDigits: 0 });

  if (commaIdx >= 0 || endsWithComma) {
    if (!digitsInt && !digitsDec && endsWithComma) return "0,";
    return digitsDec ? `${formattedInt},${digitsDec}` : `${formattedInt},`;
  }

  return formattedInt;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcValorTotal(cantidad: number, valorUnitario: number): number {
  return roundMoney(cantidad * valorUnitario);
}

export function calcValorEjecutado(cantidadEjecutada: number, valorUnitario: number): number {
  return roundMoney(cantidadEjecutada * valorUnitario);
}

export function calcAvancePct(cantidadEjecutada: number, cantidadTotal: number): number {
  if (cantidadTotal <= 0) return 0;
  return Math.round((cantidadEjecutada / cantidadTotal) * 10000) / 100;
}

export function formatAvancePct(pct: number): string {
  const rounded = Math.round(pct * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}%`;
  return `${rounded.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}
