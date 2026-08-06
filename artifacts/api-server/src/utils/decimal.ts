import Decimal from "decimal.js";

// Configure Decimal.js for financial operations
Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function parseDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

export function formatDecimal(value: Decimal | string, scale?: number): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (scale !== undefined) {
    return d.toFixed(scale);
  }
  return d.toFixed();
}

export function addDecimal(a: string | Decimal, b: string | Decimal): Decimal {
  const da = a instanceof Decimal ? a : new Decimal(a);
  const db = b instanceof Decimal ? b : new Decimal(b);
  return da.plus(db);
}

export function subtractDecimal(a: string | Decimal, b: string | Decimal): Decimal {
  const da = a instanceof Decimal ? a : new Decimal(a);
  const db = b instanceof Decimal ? b : new Decimal(b);
  return da.minus(db);
}

export function multiplyDecimal(a: string | Decimal, b: string | Decimal): Decimal {
  const da = a instanceof Decimal ? a : new Decimal(a);
  const db = b instanceof Decimal ? b : new Decimal(b);
  return da.times(db);
}

export function divideDecimal(a: string | Decimal, b: string | Decimal): Decimal {
  const da = a instanceof Decimal ? a : new Decimal(a);
  const db = b instanceof Decimal ? b : new Decimal(b);
  if (db.isZero()) {
    throw new Error("Division by zero");
  }
  return da.div(db);
}

export function validatePositive(value: string): boolean {
  try {
    return new Decimal(value).gt(0);
  } catch {
    return false;
  }
}

export function validateNonNegative(value: string): boolean {
  try {
    return new Decimal(value).gte(0);
  } catch {
    return false;
  }
}

export function isZero(value: string | Decimal): boolean {
  const d = value instanceof Decimal ? value : new Decimal(value);
  return d.isZero();
}

export function compareDecimal(a: string | Decimal, b: string | Decimal): number {
  const da = a instanceof Decimal ? a : new Decimal(a);
  const db = b instanceof Decimal ? b : new Decimal(b);
  return da.comparedTo(db);
}
