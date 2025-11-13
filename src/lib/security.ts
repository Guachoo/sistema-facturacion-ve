const toHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const webCrypto = (() => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  return null;
})();

export const hashPassword = async (password: string): Promise<string> => {
  const normalized = password ?? '';

  if (webCrypto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const digest = await webCrypto.digest('SHA-256', data);
    return toHex(digest);
  }

  if (typeof btoa === 'function') {
    return btoa(normalized);
  }

  return normalized;
};
