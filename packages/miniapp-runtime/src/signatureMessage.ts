/** Mensaje que firma el CI y reconstruye el host: id:platform:integrity. */
export function signatureMessage(id: string, platform: string, integrity: string): string {
  return `${id}:${platform}:${integrity}`;
}
