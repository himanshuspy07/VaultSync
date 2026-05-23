import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { VaultProvider, useVault } from "./context/VaultContext";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Unlock } from "./pages/Unlock";
import { Dashboard } from "./pages/Dashboard";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { ShieldAlert, KeyRound } from "lucide-react";

/**
 * Gate Guard mapping authentication and decryption states
 */
const AppContent: React.FC = () => {
  const { user, authLoading, unlocked } = useVault();

  // 1. Loading splash screen during initial Firebase Handshake
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="relative p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-4 animate-pulse">
          <KeyRound className="w-10 h-10 text-indigo-500" />
        </div>
        <h2 className="text-xl font-bold font-sans text-white">VaultSync Secure</h2>
        <p className="text-xs text-slate-500 mt-1">Establishing handshakes with active cryptography nodes...</p>
        <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-indigo-500 animate-loading-bar rounded-full" />
        </div>
      </div>
    );
  }

  // 2. Not authenticated: user must log in or register
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <PwaInstallPrompt />
      </div>
    );
  }

  // 3. Authenticated but local Decryption Key is not derived (unlocked === false)
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Unlock />
        <PwaInstallPrompt />
      </div>
    );
  }

  // 4. Fully Authenticated and Decrypted: access secure dashboard list
  return (
    <div className="min-h-screen bg-slate-950">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaInstallPrompt />
    </div>
  );
};

export default function App() {
  return (
    <VaultProvider>
      <Router>
        <AppContent />
      </Router>
    </VaultProvider>
  );
}
