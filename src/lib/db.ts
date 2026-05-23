import Dexie, { type Table } from "dexie";
import { type LocalVaultRecord } from "../types";

/**
 * Dexie-based Offline IndexedDB Layer
 * Stored records remain fully encrypted using the user's derived key (AES-GCM).
 * The master password or raw key is NEVER persisted.
 */
class VaultSyncDatabase extends Dexie {
  vaults!: Table<LocalVaultRecord, string>;

  constructor() {
    super("VaultSyncDB");
    this.version(1).stores({
      vaults: "userId, isSynced, updatedAt"
    });
  }
}

export const localDb = new VaultSyncDatabase();
