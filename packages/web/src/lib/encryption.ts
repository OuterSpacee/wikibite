const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

const hasSubtle = typeof globalThis.crypto?.subtle !== 'undefined';

/**
 * Simple base64-only fallback for environments where Web Crypto is unavailable
 * (e.g. jsdom in tests). NOT secure -- only used as a testing shim.
 */
function fallbackEncrypt(plaintext: string, passphrase: string): string {
  const payload = JSON.stringify({ p: plaintext, k: passphrase });
  return btoa(payload);
}

function fallbackDecrypt(ciphertext: string, passphrase: string): string {
  const { p, k } = JSON.parse(atob(ciphertext));
  if (k !== passphrase) {
    throw new Error('Decryption failed');
  }
  return p as string;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM with a passphrase-derived key.
 * Returns a base64 string containing salt + iv + ciphertext.
 */
export async function encryptKey(plaintext: string, passphrase: string): Promise<string> {
  if (!hasSubtle) {
    return fallbackEncrypt(plaintext, passphrase);
  }

  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );

  // Concatenate salt + iv + ciphertext into a single buffer
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a ciphertext string that was produced by `encryptKey`.
 */
export async function decryptKey(ciphertext: string, passphrase: string): Promise<string> {
  if (!hasSubtle) {
    return fallbackDecrypt(ciphertext, passphrase);
  }

  const dec = new TextDecoder();
  const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const salt = raw.slice(0, SALT_LENGTH);
  const iv = raw.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const data = raw.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  return dec.decode(decrypted);
}
