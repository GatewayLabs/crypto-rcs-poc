// BigInteger modular arithmetic utilities
export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === 1n) return 0n;
  
  let result = 1n;
  base = base % modulus;
  
  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    base = (base * base) % modulus;
    exponent = exponent >> 1n;
  }
  
  return result;
}

// Extended Euclidean algorithm for modular multiplicative inverse
export function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  let [old_t, t] = [0n, 1n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
    [old_t, t] = [t, old_t - quotient * t];
  }

  return old_s;
}

// Chinese remainder theorem (CRT)
export function crt(remainders: bigint[], moduli: bigint[]): bigint {
  const product = moduli.reduce((a, b) => a * b, 1n);
  let sum = 0n;

  for (let i = 0; i < remainders.length; i++) {
    const p = product / moduli[i];
    sum = (sum + remainders[i] * modInverse(p, moduli[i]) * p) % product;
  }

  return sum;
}

// Convert number to fixed-length string
export function numberToFixedString(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

// Symmetric encryption/decryption using AES
export async function aesEncrypt(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const keyBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(key)
  );
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  );
  
  const result = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
  return btoa(String.fromCharCode(...result));
}

export async function aesDecrypt(encryptedData: string, key: string): Promise<string> {
  const decoder = new TextDecoder();
  const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  const keyBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(key)
  );
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );
  
  return decoder.decode(decrypted);
}

// Convert byte array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to byte array
export function hexToBytes(hex: string): Uint8Array {
  const str = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(str.length / 2);
  for (let i = 0; i < str.length; i += 2) {
    bytes[i / 2] = parseInt(str.substr(i, 2), 16);
  }
  return bytes;
}