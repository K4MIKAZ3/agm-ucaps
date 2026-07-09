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

/** Formatea mientras el usuario escribe (6.000 o 104.601,4). */
export function formatColombianInput(raw: string, maxDecimals = 2): string {
  if (!raw) return "";

  const endsWithSep = /[,.]$/.test(raw);
  const normalized = raw.replace(/\./g, ",");
  const commaIdx = normalized.indexOf(",");

  let intStr: string;
  let decStr: string;

  if (commaIdx >= 0) {
    intStr = normalized.slice(0, commaIdx).replace(/\D/g, "");
    decStr = normalized.slice(commaIdx + 1).replace(/\D/g, "").slice(0, maxDecimals);
  } else {
    intStr = normalized.replace(/\D/g, "");
    decStr = "";
  }

  if (!intStr && !decStr) {
    return endsWithSep ? "0," : "";
  }

  const intNum = intStr ? parseInt(intStr, 10) : 0;
  const formattedInt = intNum.toLocaleString("es-CO", { maximumFractionDigits: 0 });

  if (commaIdx >= 0 || endsWithSep) {
    return decStr ? `${formattedInt},${decStr}` : `${formattedInt},`;
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
