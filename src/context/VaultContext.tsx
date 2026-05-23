import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType, isNetworkOrOfflineError } from "../lib/firebase";
import { localDb } from "../lib/db";
import { type VaultEntry, type EncryptedVaultDoc, type LocalVaultRecord } from "../types";
import {
  deriveKeyFromMasterPassword,
  encryptData,
  decryptData,
  generateRandomSalt
} from "../utils/crypto";

interface VaultContextValue {
  user: User | null;
  authLoading: boolean;
  unlocked: boolean;
  entries: VaultEntry[];
  isOffline: boolean;
  hasLocalChanges: boolean;
  isNewUser: boolean;
  errorMsg: string;
  isSyncing: boolean;
  autoLockTime: number; // in seconds
  lockTimer: number; // countdown
  setupMasterPassword: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<boolean>;
  lockVault: () => void;
  addEntry: (entry: Omit<VaultEntry, "id" | "updatedAt">) => Promise<void>;
  updateEntry: (entry: VaultEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  forceSyncOffline: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [hasLocalChanges, setHasLocalChanges] = useState<boolean>(false);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Auto lock settings
  const [autoLockTime] = useState<number>(300); // 5 minutes inactivity
  const [lockTimer, setLockTimer] = useState<number>(300);

  // Memory refs to hold keying material (keeps keys safely out of serializable state)
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const saltRef = useRef<string | null>(null);
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null);

  // Monitor network online/offline state
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Track local IndexedDB unsynced records
  const updateOfflineChangesState = useCallback(async (uid: string) => {
    try {
      const record = await localDb.vaults.get(uid);
      setHasLocalChanges(record ? !record.isSynced : false);
    } catch (err) {
      console.error("Dexie access error checking synced state:", err);
    }
  }, []);

  // Fetch salt from local store or remote Firestore to check user setup status
  const checkSalt = useCallback(async (uid: string) => {
    try {
      // 1. Check local IndexedDB cache first (works offline)
      const cached = await localDb.vaults.get(uid);
      if (cached && cached.salt) {
        saltRef.current = cached.salt;
        setIsNewUser(false);
        return;
      }

      // 2. Fetch from Firestore if online
      if (navigator.onLine && !isOffline) {
        try {
          const docRef = doc(db, "vaults", uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.salt) {
              saltRef.current = data.salt;
              setIsNewUser(false);

              // Cache in local IndexedDB
              await localDb.vaults.put({
                userId: uid,
                salt: data.salt,
                encryptedData: data.encryptedData || "",
                updatedAt: data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now(),
                isSynced: true
              });
              return;
            }
          }
        } catch (e: any) {
          if (isNetworkOrOfflineError(e)) {
            console.warn("Firestore could not be reached (client is offline). Falling back to local vault storage.");
            setIsOffline(true);
          } else {
            // Wrap with requested error logging but don't crash app initiation
            try {
              handleFirestoreError(e, OperationType.GET, `vaults/${uid}`);
            } catch (wrapped) {
              console.error("Error checked & handled: ", wrapped);
            }
          }
        }
      }

      // If we got here, no salt exists anywhere: user needs setup
      setIsNewUser(true);
    } catch (err) {
      console.error("Failed to fetch salt setup state: ", err);
    }
  }, [isOffline]);

  // Monitor Firebase Auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(true);

      // Clean session elements when user logs out
      if (!currentUser) {
        masterKeyRef.current = null;
        saltRef.current = null;
        setUnlocked(false);
        setEntries([]);
        setIsNewUser(false);
        if (firebaseUnsubscribeRef.current) {
          firebaseUnsubscribeRef.current();
          firebaseUnsubscribeRef.current = null;
        }
        setAuthLoading(false);
      } else {
        await checkSalt(currentUser.uid);
        await updateOfflineChangesState(currentUser.uid);
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, [checkSalt, updateOfflineChangesState]);

  // Handle syncing local unsynced records to Cloud Firestore when connection restored
  const syncOfflineRecordToFirestore = useCallback(async (uid: string, key: CryptoKey) => {
    if (!navigator.onLine || isOffline) return;

    try {
      const localRecord = await localDb.vaults.get(uid);
      if (localRecord && !localRecord.isSynced && localRecord.encryptedData) {
        setIsSyncing(true);
        const docRef = doc(db, "vaults", uid);
        
        try {
          await setDoc(docRef, {
            userId: uid,
            encryptedData: localRecord.encryptedData,
            salt: localRecord.salt,
            updatedAt: serverTimestamp()
          });
          // Update IndexedDB to state as synced
          await localDb.vaults.update(uid, { isSynced: true });
          setHasLocalChanges(false);
        } catch (fError: any) {
          if (isNetworkOrOfflineError(fError)) {
            console.warn("Sync failed: Client is offline.");
            setIsOffline(true);
          } else {
            handleFirestoreError(fError, OperationType.WRITE, `vaults/${uid}`);
          }
        }
      }
    } catch (err) {
      console.error("Synchronization loop failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOffline]);

  // Force sync offline triggered by User UI
  const forceSyncOffline = useCallback(async () => {
    if (user && masterKeyRef.current) {
      await syncOfflineRecordToFirestore(user.uid, masterKeyRef.current);
    }
  }, [user, syncOfflineRecordToFirestore]);

  // Build the live Cloud Firestore document listener while unlocked
  const startRealtimeSyncListener = useCallback((uid: string, key: CryptoKey) => {
    if (firebaseUnsubscribeRef.current) {
      firebaseUnsubscribeRef.current();
    }

    const docRef = doc(db, "vaults", uid);
    firebaseUnsubscribeRef.current = onSnapshot(docRef, async (docSnap) => {
      if (!docSnap.exists() || !navigator.onLine) return;

      const data = docSnap.data() as EncryptedVaultDoc;
      if (!data || !data.encryptedData) return;

      // Ensure local Dexie is in-sync to avoid overriding newer local writes
      const local = await localDb.vaults.get(uid);
      const serverTimeMs = data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now();

      if (local && !local.isSynced && local.updatedAt > serverTimeMs) {
        // Local state is newer but unsynced – push local to server instead
        await syncOfflineRecordToFirestore(uid, key);
        return;
      }

      try {
        // Decrypt the newer server payload in memory
        const decryptedStr = await decryptData(data.encryptedData, key);
        const parsedEntries: VaultEntry[] = JSON.parse(decryptedStr);

        setEntries(parsedEntries);

        // Update local Dexie storage
        await localDb.vaults.put({
          userId: uid,
          encryptedData: data.encryptedData,
          salt: data.salt,
          updatedAt: serverTimeMs,
          isSynced: true
        });
        setHasLocalChanges(false);
      } catch (err) {
        console.error("Sync decryption failed (likely because of key derivation delay):", err);
      }
    }, (error) => {
      if (isNetworkOrOfflineError(error)) {
        console.warn("Realtime sync listener lost connection: Client is offline.");
        setIsOffline(true);
      } else {
        // Log firestore rules issue
        try {
          handleFirestoreError(error, OperationType.GET, `vaults/${uid}`);
        } catch (wrapped) {
          console.error("Checked error synced: ", wrapped);
        }
      }
    });
  }, [syncOfflineRecordToFirestore]);

  // Sync back to database & restart/ensure the realtime listener runs when connection state recovers to online
  useEffect(() => {
    if (!isOffline && user && masterKeyRef.current) {
      const key = masterKeyRef.current;
      const uid = user.uid;
      
      const reconnectAndSync = async () => {
        try {
          await syncOfflineRecordToFirestore(uid, key);
        } catch (err) {
          console.error("Failed to sync offline record: ", err);
        }
        startRealtimeSyncListener(uid, key);
      };
      
      reconnectAndSync();
    }
  }, [isOffline, user, syncOfflineRecordToFirestore, startRealtimeSyncListener]);

  // First time configuration: setting up the master password
  const setupMasterPassword = useCallback(async (password: string) => {
    if (!user) throw new Error("Must be logged in to create a secure vault.");

    try {
      setErrorMsg("");
      const localSalt = generateRandomSalt();
      saltRef.current = localSalt;

      // Derive our 256-bit AES-GCM key
      const key = await deriveKeyFromMasterPassword(password, localSalt);
      masterKeyRef.current = key;

      // Save empty vault dataset encrypted
      const encryptedBlob = await encryptData(JSON.stringify([]), key);

      // Write layout to local IndexedDB
      const timestamp = Date.now();
      await localDb.vaults.put({
        userId: user.uid,
        salt: localSalt,
        encryptedData: encryptedBlob,
        updatedAt: timestamp,
        isSynced: false
      });

      // Write to Cloud Firestore if online
      if (navigator.onLine && !isOffline) {
        const docRef = doc(db, "vaults", user.uid);
        try {
          await setDoc(docRef, {
            userId: user.uid,
            encryptedData: encryptedBlob,
            salt: localSalt,
            updatedAt: serverTimestamp()
          });
          await localDb.vaults.update(user.uid, { isSynced: true });
          setHasLocalChanges(false);
        } catch (fErr: any) {
          if (isNetworkOrOfflineError(fErr)) {
            console.warn("Failed to push initial setup to Cloud: Client is offline.");
            setIsOffline(true);
            setHasLocalChanges(true);
          } else {
            handleFirestoreError(fErr, OperationType.WRITE, `vaults/${user.uid}`);
          }
        }
      } else {
        setHasLocalChanges(true);
      }

      setEntries([]);
      setIsNewUser(false);
      setUnlocked(true);

      // Initiate listener if.online
      if (navigator.onLine && !isOffline) {
        startRealtimeSyncListener(user.uid, key);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to finalize vault credentials.");
      throw err;
    }
  }, [user, startRealtimeSyncListener, isOffline]);

  // Unlock existing user's vault
  const unlockVault = useCallback(async (password: string): Promise<boolean> => {
    if (!user) throw new Error("User session terminated.");
    if (!saltRef.current) {
      await checkSalt(user.uid);
    }
    if (!saltRef.current) {
      setErrorMsg("No cryptographic salt found. Verify account initialization.");
      return false;
    }

    try {
      setErrorMsg("");
      const key = await deriveKeyFromMasterPassword(password, saltRef.current);

      // Retrieve encrypted entries from local IndexedDB cache (makes it direct and responsive)
      const cached = await localDb.vaults.get(user.uid);
      let payloadToDecryptStr = cached?.encryptedData || "";

      // Fallback: If not indexed, fetch from Firestore online
      if (!payloadToDecryptStr && navigator.onLine && !isOffline) {
        try {
          const snap = await getDoc(doc(db, "vaults", user.uid));
          if (snap.exists()) {
            const docData = snap.data() as EncryptedVaultDoc;
            payloadToDecryptStr = docData.encryptedData;
          }
        } catch (e: any) {
          if (isNetworkOrOfflineError(e)) {
            console.warn("Failed to fetch vault because client is offline.");
            setIsOffline(true);
          } else {
            throw e;
          }
        }
      }

      if (!payloadToDecryptStr) {
        // Vault holds salt but has no encrypted blob yet – initialize empty
        const initialEncrypted = await encryptData(JSON.stringify([]), key);
        
        await localDb.vaults.put({
          userId: user.uid,
          salt: saltRef.current,
          encryptedData: initialEncrypted,
          updatedAt: Date.now(),
          isSynced: false
        });

        masterKeyRef.current = key;
        setEntries([]);
        setUnlocked(true);

        if (navigator.onLine && !isOffline) {
          await syncOfflineRecordToFirestore(user.uid, key);
          startRealtimeSyncListener(user.uid, key);
        }
        return true;
      }

      // Try decrypting the ciphertext block to verify correct master password
      const cleartext = await decryptData(payloadToDecryptStr, key);
      const parsedEntries: VaultEntry[] = JSON.parse(cleartext);

      // Verify and register derived cryptographic key
      masterKeyRef.current = key;
      setEntries(parsedEntries);
      setUnlocked(true);

      // Synchronize in the background
      await syncOfflineRecordToFirestore(user.uid, key);

      if (navigator.onLine && !isOffline) {
        startRealtimeSyncListener(user.uid, key);
      }

      return true;
    } catch (err: any) {
      console.error("Faulty master password key validation: ", err);
      if (isNetworkOrOfflineError(err)) {
        setErrorMsg("Failed to connect to security sync network. Please check your internet connection.");
      } else {
        setErrorMsg("Incorrect master password. Please verify credentials.");
      }
      return false;
    }
  }, [user, checkSalt, syncOfflineRecordToFirestore, startRealtimeSyncListener, isOffline]);

  // Lock vault - clears all keys and plain text records from memory
  const lockVault = useCallback(() => {
    masterKeyRef.current = null;
    setEntries([]);
    setUnlocked(false);
    setErrorMsg("");
    if (firebaseUnsubscribeRef.current) {
      firebaseUnsubscribeRef.current();
      firebaseUnsubscribeRef.current = null;
    }
  }, []);

  // Sync internal entries state to databases (Dexie and Firestore proxy)
  const saveVaultState = useCallback(async (updatedEntries: VaultEntry[]) => {
    if (!user || !masterKeyRef.current || !saltRef.current) return;

    try {
      const serialized = JSON.stringify(updatedEntries);
      const encryptedBlob = await encryptData(serialized, masterKeyRef.current);
      const timestamp = Date.now();

      // Write to Local IndexedDB immediate cache first
      await localDb.vaults.put({
        userId: user.uid,
        salt: saltRef.current,
        encryptedData: encryptedBlob,
        updatedAt: timestamp,
        isSynced: false
      });
      setHasLocalChanges(true);

      // Synchronize to Firestore database if online
      if (navigator.onLine && !isOffline) {
        try {
          const docRef = doc(db, "vaults", user.uid);
          await setDoc(docRef, {
            userId: user.uid,
            encryptedData: encryptedBlob,
            salt: saltRef.current,
            updatedAt: serverTimestamp()
          });

          // Mark local cache as synchronized
          await localDb.vaults.update(user.uid, { isSynced: true });
          setHasLocalChanges(false);
        } catch (fErr: any) {
          if (isNetworkOrOfflineError(fErr)) {
            console.warn("Failed to sync updated entries: Client is offline.");
            setIsOffline(true);
          } else {
            handleFirestoreError(fErr, OperationType.WRITE, `vaults/${user.uid}`);
          }
        }
      }
    } catch (err) {
      console.error("Error writing updated vault credentials: ", err);
    }
  }, [user, isOffline]);

  // CRUD operations
  const addEntry = useCallback(async (entry: Omit<VaultEntry, "id" | "updatedAt">) => {
    const newEntry: VaultEntry = {
      ...entry,
      id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now() + Math.random()),
      updatedAt: Date.now()
    };

    const nextEntries = [newEntry, ...entries];
    setEntries(nextEntries);
    await saveVaultState(nextEntries);
  }, [entries, saveVaultState]);

  const updateEntry = useCallback(async (updatedEntry: VaultEntry) => {
    const nextEntries = entries.map((e) =>
      e.id === updatedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e
    );
    setEntries(nextEntries);
    await saveVaultState(nextEntries);
  }, [entries, saveVaultState]);

  const deleteEntry = useCallback(async (id: string) => {
    const nextEntries = entries.filter((e) => e.id !== id);
    setEntries(nextEntries);
    await saveVaultState(nextEntries);
  }, [entries, saveVaultState]);

  // Inactivity Auto-Lock timer mechanism
  useEffect(() => {
    if (!unlocked) return;

    const interval = setInterval(() => {
      setLockTimer((prev) => {
        if (prev <= 1) {
          lockVault();
          return autoLockTime;
        }
        return prev - 1;
      });
    }, 1000);

    const resetTimer = () => {
      setLockTimer(autoLockTime);
    };

    // Listen to user inputs for activity reset
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, [unlocked, autoLockTime, lockVault]);

  return (
    <VaultContext.Provider
      value={{
        user,
        authLoading,
        unlocked,
        entries,
        isOffline,
        hasLocalChanges,
        isNewUser,
        errorMsg,
        isSyncing,
        autoLockTime,
        lockTimer,
        setupMasterPassword,
        unlockVault,
        lockVault,
        addEntry,
        updateEntry,
        deleteEntry,
        forceSyncOffline
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
};
