import { signatureMessage } from "../signatureMessage.js";
import { b64urlToBytes } from "../base64url.js";

describe("signatureMessage", () => {
  it("arma id:platform:integrity", () => {
    expect(signatureMessage("acc", "ios", "sha256-abc")).toBe("acc:ios:sha256-abc");
  });
});

describe("b64urlToBytes", () => {
  it("decodifica base64url a bytes (sin padding, url-safe)", () => {
    // "hi" = [104,105] → base64 "aGk=" → base64url "aGk"
    expect(Array.from(b64urlToBytes("aGk"))).toEqual([104, 105]);
    // 0xfb 0xff 0xbf → base64 "+/+/" → base64url "-_-_"
    expect(Array.from(b64urlToBytes("-_-_"))).toEqual([251, 255, 191]);
  });
});
