/** base64url → bytes, puro (Hermes: sin Buffer ni atob confiables). */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LOOKUP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charAt(i)] = i;

/** UTF-8 encode puro (sin depender del global TextEncoder, no tipado en todos los libs).
 *  Produce los mismos bytes que `Buffer.from(str, "utf8")` del backend/CI. */
export function utf8Bytes(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

export function b64urlToBytes(s: string): Uint8Array {
  const clean = s.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let bits = 0;
  let value = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = LOOKUP[clean.charAt(i)];
    if (idx === undefined) throw new Error("base64url inválido");
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (value >> bits) & 0xff;
    }
  }
  return out;
}
