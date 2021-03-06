export function ab2str(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf)
}

export function str2ab(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer
}

export const b64str2str = (b64: string): string => {
  return new TextDecoder().decode(Buffer.from(b64, 'base64'))
}
