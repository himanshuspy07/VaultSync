# VaultSync – Zero-Knowledge Password Vault & Sync Manager

VaultSync is a secure, Production-Ready Progressive Web App (PWA) personal password manager. It enables users to store secrets locally, synchronize them securely across multiple devices using Firebase, and continue reading/writing credentials even while completely offline.

---

## 🔐 Zero-Knowledge Cryptographic Model (Critical Security)

VaultSync operates on an **absolute zero-knowledge architecture**. Under no circumstances can anyone—including the hosting servers or Firebase cloud administrators—access, reconstruct, or view your decrypted password items.

1. **In-Memory Derived Key**: Upon unlocking, a 256-bit AES-GCM master key is derived directly on the client machine using **PBKDF2** with **100,000 iterations** (SHA-256) and a unique per-user cryptographic salt.
2. **Double Encryption Layer**: Plaintext credentials never touch the wire or local system disks. Decrypted structures are held *strictly* in active React in-memory states (not inside serializable local storage).
3. **Encrypted Offline Storage**: Dexie.js (IndexedDB) and Firebase Firestore only receive and store the Base64 representation of the encrypted byte-array.
4. **On-Device Offline Verification**: True offline unlock is supported because the master derived key decrypts the locally cached IndexedDB block on the fly. If the password was incorrect, key signature validation fails (AES-GCM tag mismatch), preventing arbitrary decryption.

---

## ✨ Features Implemented

* **Secure Authentication**: Traditional signup and signin pathways via Firebase Authentication.
* **Dual Master Verification**: Separate master password prevents host account hijacking from accessing private vaults.
* **PBKDF2 Strength Evaluation**: Interactive, real-time segment-indicator password strength estimation.
* **Real-time Firestore Mirroring**: Instantly syncs changes between active screens or tabs using real-time listeners.
* **Complete Offline Functionality**: Full offline reads/writes cached through IndexedDB using Dexie.js.
* **Auto-Lock Timeout**: Guard against local physical shoulder surfing. Auto-locks after 5 minutes of total user inactivity (moves and keyboard events reset this).
* **PWA Caching & Installer**: Native Service Worker configuration caches index, script bundles, and stylesheets for immediate loading. Includes a custom browser application installation banner.
* **Interactive Tooling**: Responsive password generator embedded in form menus, custom copying indicators, and beautiful icon categorization labels.

---

## 🛠️ Technology Stack

* **Frontend Framework**: React with TypeScript and Vite.
* **Styles**: Tailwind CSS with custom fonts ("Inter" and "JetBrains Mono").
* **Local Caching Layer**: Dexie.js (IndexedDB wrapper).
* **Service Worker**: Workbox (`vite-plugin-pwa`).
* **Database & Handshakes**: Firebase Auth & Cloud Firestore.
* **Animations**: Motion package.

---

## 🚀 How to Run the Project Locally

To run the application locally on your computer, complete these four simple phases:

### Phase 1: Enable Email/Password Auth in Firebase Console
For safety reasons, Firebase projects do not have email/password logins active by default. You **MUST** enable them:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (`igneous-engine-d07pf` or your custom setup).
3. Under the left menu, select **Authentication** and navigate to the **Sign-in method** tab.
4. Click **Add new provider**, select **Email/Password**, ensure it is toggled to **Enabled**, and save changes.

### Phase 2: Create a local `.env` file
Make a copy of `.env.example` named `.env` and fill in any customized variables if you are migrating models to separate servers:
```env
GEMINI_API_KEY="Optional_Key"
APP_URL="Your_Cloud_Run_Or_Localhost_URL"
```

### Phase 3: Install dependencies
Install all workspace packages:
```bash
npm install
```

### Phase 4: Spin up Dev Server
Run the local Vite builder:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🎯 Production Build & Service Workers

To compile a packed, optimized production build ready for deployment (which compiles static files into `/dist/` alongside custom service worker files):
```bash
npm run build
```

Verify your build locally:
```bash
npm run preview
```

---

## 📋 Security Assertions & Firewalls
VaultSync uses a dedicated Attribute-Based Access Control rule map loaded into `firestore.rules`.
These constraints assert that:
* Blanket collections lists are completely prohibited.
* Users can only `get`/`create`/`update`/`delete` documents corresponding directly to their authenticated `request.auth.uid`.
* Immutable parameters like ID fields `userId` and Key-Derivation `salt` cannot be tampered with on existing documents during updates.
* Document write payloads are rejected if they exceed exact schema sizes or contain unauthorized supplementary elements.
