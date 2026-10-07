/** Encoder base64url puro (solo para tests; el prod solo decodifica). Evita Buffer,
 *  que no está tipado en el tsconfig de este paquete (RN, sin @types/node). */
const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function bytesToB64url(bytes: Uint8Array): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]!;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += A.charAt((value >> bits) & 63);
    }
  }
  if (bits > 0) out += A.charAt((value << (6 - bits)) & 63);
  return out;
}
