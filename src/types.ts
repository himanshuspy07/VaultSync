/**
 * Shared Type Definitions for VaultSync
 */

export interface VaultEntry {
  id: string; // Unique entry identifier (UUID or timestamp)
  name: string; // Service name (e.g., "Github", "Google")
  url: string; // Optional login URL
  username: string; // Username or email
  password: string; // Plaintext password (fully decrypted in-memory)
  category: "Login" | "Card" | "Note" | "Identity" | "Other";
  notes?: string; // Optional secure notes
  updatedAt: number; // Internal timestamp of when this entry was created/edited
}

export interface EncryptedVaultDoc {
  userId: string;
  encryptedData: string; // Base64 packed AES-GCM encrypted string of VaultEntry[]
  salt: string; // Salt used for PBKDF2 key derivation
  updatedAt: any; // ServerTimestamp for firestore, number for IndexedDB local cache
}

export interface LocalVaultRecord extends EncryptedVaultDoc {
  isSynced: boolean; // Tells whether this local write is synced with Firestore
}

export interface PasswordGeneratorConfig {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}
