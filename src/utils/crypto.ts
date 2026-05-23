/**
 * Zero-Knowledge Cryptography Engine for VaultSync
 * Built strictly with Web Crypto API (PBKDF2 100,000 iterations, SHA-256, AES-GCM 256-bit)
 */

// Helper to convert base64 to Uint8Array
export function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.charCodeAt(0));
}

// Helper to convert Uint8Array to base64
export function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (x) => String.fromCharCode(x)).join("");
  return btoa(binString);
}

// Generate a brand new cryptographically secure salt (16 bytes / 128-bit)
export function generateRandomSalt(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return bytesToBase64(bytes);
}

// Generate a random secure password (for password generator)
export interface GeneratorOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}

export function generatePassword(options: GeneratorOptions): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let charSet = "";
  let guaranteedChars: string[] = [];

  if (options.useUppercase) {
    charSet += uppercase;
    guaranteedChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
  }
  if (options.useLowercase) {
    charSet += lowercase;
    guaranteedChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
  }
  if (options.useNumbers) {
    charSet += numbers;
    guaranteedChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
  }
  if (options.useSymbols) {
    charSet += symbols;
    guaranteedChars.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  // Fallback to lowercase if nothing selected
  if (charSet === "") {
    charSet = lowercase;
    guaranteedChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
  }

  const remainingLength = Math.max(0, options.length - guaranteedChars.length);
  const randomBytes = new Uint32Array(remainingLength);
  window.crypto.getRandomValues(randomBytes);

  let result = [...guaranteedChars];
  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = randomBytes[i] % charSet.length;
    result.push(charSet[randomIndex]);
  }

  // Shuffle the guaranteed and random characters
  const shuffleBytes = new Uint32Array(result.length);
  window.crypto.getRandomValues(shuffleBytes);
  for (let i = result.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result.join("");
}

/**
 * Derives a CryptoKey using PBKDF2 with 100,000 iterations and SHA-256.
 */
export async function deriveKeyFromMasterPassword(password: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);
  const saltBytes = base64ToBytes(saltBase64);

  // Import the raw password as a key-derivation base key
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );

  // Derive a 256-bit AES-GCM key
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string of text using AES-GCM with a derived CryptoKey.
 * Packages the 12-byte IV and ciphertext into a single Base64 string.
 */
export async function encryptData(plaintext: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(plaintext);

  // Generate a random 12-byte initialization vector (IV)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the plaintext using AES-GCM
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    plaintextBytes
  );

  const ciphertextBytes = new Uint8Array(ciphertextBuffer);

  // Combine IV and Ciphertext: [iv_bytes (12 bytes) + ciphertext_bytes]
  const combined = new Uint8Array(iv.byteLength + ciphertextBytes.byteLength);
  combined.set(iv, 0);
  combined.set(ciphertextBytes, iv.byteLength);

  return bytesToBase64(combined);
}

/**
 * Decrypts a combined Base64 string (IV + ciphertext) using AES-GCM.
 * Returns the decrypted string. Throws an error on integrity/password failure.
 */
export async function decryptData(packedBase64: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const combinedBytes = base64ToBytes(packedBase64);

  if (combinedBytes.byteLength < 12) {
    throw new Error("Invalid cipher packet: too short.");
  }

  // Extract the 12-byte IV and the remaining ciphertext
  const iv = combinedBytes.slice(0, 12);
  const ciphertextBytes = combinedBytes.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertextBytes
  );

  return dec.decode(decryptedBuffer);
}
