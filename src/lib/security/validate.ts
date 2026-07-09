/**
 * Leichtgewichtige, dependency-freie Eingabe-Validierung für Route Handler
 * und Server Actions. Kein Zod (bewusst keine zusätzliche Dependency), aber
 * gleiche Grundidee: serverseitig, deny-by-default, typsichere Ergebnisse.
 *
 * Nutzung:
 *   const parsed = parseJson(await req.json(), {
 *     title:  str({ min: 1, max: 200 }),
 *     count:  int({ min: 0, max: 100 }),
 *     kind:   oneOf(["a", "b"] as const),
 *     note:   optional(str({ max: 500 })),
 *   });
 *   if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
 *   parsed.value.title // string, garantiert 1..200 Zeichen
 */

export type Validator<T> = (value: unknown, field: string) => T;

class ValidationError extends Error {}

export function str(opts: { min?: number; max?: number; trim?: boolean } = {}): Validator<string> {
  return (value, field) => {
    if (typeof value !== "string") throw new ValidationError(`${field}: muss ein String sein`);
    const v = opts.trim === false ? value : value.trim();
    if (opts.min != null && v.length < opts.min) throw new ValidationError(`${field}: zu kurz (min ${opts.min})`);
    if (opts.max != null && v.length > opts.max) throw new ValidationError(`${field}: zu lang (max ${opts.max})`);
    return v;
  };
}

export function int(opts: { min?: number; max?: number } = {}): Validator<number> {
  return (value, field) => {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n)) throw new ValidationError(`${field}: muss eine Ganzzahl sein`);
    if (opts.min != null && n < opts.min) throw new ValidationError(`${field}: zu klein (min ${opts.min})`);
    if (opts.max != null && n > opts.max) throw new ValidationError(`${field}: zu groß (max ${opts.max})`);
    return n;
  };
}

export function bool(): Validator<boolean> {
  return (value, field) => {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "on") return true;
    if (value === "false") return false;
    throw new ValidationError(`${field}: muss ein Boolean sein`);
  };
}

export function oneOf<const T extends readonly string[]>(allowed: T): Validator<T[number]> {
  return (value, field) => {
    if (typeof value !== "string" || !allowed.includes(value)) {
      throw new ValidationError(`${field}: ungültiger Wert`);
    }
    return value as T[number];
  };
}

export function id(): Validator<string> {
  // cuid/uuid-artige IDs: alphanumerisch + - _, 8..64 Zeichen
  return (value, field) => {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(value)) {
      throw new ValidationError(`${field}: ungültige ID`);
    }
    return value;
  };
}

export function optional<T>(inner: Validator<T>): Validator<T | undefined> {
  return (value, field) => {
    if (value == null || value === "") return undefined;
    return inner(value, field);
  };
}

type Shape = Record<string, Validator<unknown>>;
type Infer<S extends Shape> = { [K in keyof S]: S[K] extends Validator<infer U> ? U : never };

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validiert ein Objekt gegen ein Schema. Nur Schema-Felder werden übernommen
 *  (implizite Whitelist gegen Mass-Assignment). */
export function parseObject<S extends Shape>(input: unknown, schema: S): ParseResult<Infer<S>> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Erwartet ein Objekt" };
  }
  const obj = input as Record<string, unknown>;
  const out = {} as Record<string, unknown>;
  try {
    for (const key of Object.keys(schema)) {
      out[key] = schema[key](obj[key], key);
    }
  } catch (e) {
    return { ok: false, error: e instanceof ValidationError ? e.message : "Ungültige Eingabe" };
  }
  return { ok: true, value: out as Infer<S> };
}

/** Wie parseObject, aber liest direkt aus FormData. */
export function parseForm<S extends Shape>(form: FormData, schema: S): ParseResult<Infer<S>> {
  const obj: Record<string, unknown> = {};
  for (const key of Object.keys(schema)) {
    const v = form.get(key);
    obj[key] = v === null ? undefined : v;
  }
  return parseObject(obj, schema);
}
