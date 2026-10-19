/**
 * Normaliza lo que llega por un `catch`. TypeScript tipa la variable de `catch`
 * como `unknown` porque un `throw` puede lanzar cualquier valor, no solo un
 * `Error`: una string, un objeto de Supabase o un `undefined` de una promesa
 * rechazada sin motivo. Estos dos helpers evitan tener que anotar `: any` en
 * cada bloque para poder leer `.message`.
 */

/** Convierte cualquier valor capturado en un `Error` real. */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  if (value && typeof value === "object" && "message" in value) {
    return new Error(String((value as { message: unknown }).message));
  }
  return new Error("Unknown error");
}

/** Mensaje legible de cualquier valor capturado, para mostrar en un toast. */
export function errorMessage(value: unknown): string {
  return toError(value).message;
}
