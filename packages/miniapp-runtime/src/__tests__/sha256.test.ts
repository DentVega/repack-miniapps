import { sha256Hex } from "../sha256.js";

const enc = (s: string) => new TextEncoder().encode(s);

describe("sha256Hex — NIST/known vectors", () => {
  it("hashes the empty string", () => {
    expect(sha256Hex(new Uint8Array(0))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it('hashes "abc"', () => {
    expect(sha256Hex(enc("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes a 56-byte message (two blocks, padding edge)", () => {
    expect(
      sha256Hex(enc("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")),
    ).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });

  it("hashes 1000 bytes of 0x61 ('a')", () => {
    const a = new Uint8Array(1000).fill(0x61);
    // sha256 of 1000 'a's (known vector)
    expect(sha256Hex(a)).toBe(
      "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3",
    );
  });
});
