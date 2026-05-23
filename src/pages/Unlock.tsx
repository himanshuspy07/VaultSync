import React, { useState, useEffect } from "react";
import { useVault } from "../context/VaultContext";
import { signOut, updatePassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { KeyRound, ShieldCheck, ShieldAlert, LogOut, CheckCircle, HelpCircle, Eye, EyeOff, Globe, Settings } from "lucide-react";

export const Unlock: React.FC = () => {
  const {
    unlockVault,
    setupMasterPassword,
    isNewUser,
    errorMsg: vaultError,
    isOffline
  } = useVault();

  // For existing users
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // For new users
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [strength, setStrength] = useState({ score: 0, label: "Very Weak", color: "bg-rose-500" });

  // Optional global account password for Google users
  const isGoogleUser = auth.currentUser?.providerData.some(p => p.providerId === "google.com") || auth.currentUser?.email?.includes("@");
  const [setupAccountPassword, setSetupAccountPassword] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [confirmAccountPassword, setConfirmAccountPassword] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [accountWarn, setAccountWarn] = useState("");

  useEffect(() => {
    if (vaultError) {
      setError(vaultError);
    }
  }, [vaultError]);

  // Calculate master password strength
  useEffect(() => {
    if (!newPassword) {
      setStrength({ score: 0, label: "Empty", color: "bg-slate-700" });
      return;
    }

    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    let label = "Very Weak";
    let color = "bg-rose-500";

    if (score === 2) {
      label = "Weak";
      color = "bg-orange-500";
    } else if (score === 3) {
      label = "Moderate";
      color = "bg-amber-500";
    } else if (score === 4) {
      label = "Strong";
      color = "bg-emerald-500";
    } else if (score === 5) {
      label = "Extremely Secure";
      color = "bg-indigo-500";
    }

    setStrength({ score, label, color });
  }, [newPassword]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your master password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const success = await unlockVault(password);
      if (!success) {
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Crypto derivation failure. Please try again.");
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAccountWarn("");

    if (!newPassword || !confirmPassword) {
      setError("Master password fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Master password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Master passwords do not match.");
      return;
    }

    if (isGoogleUser && setupAccountPassword) {
      if (!accountPassword || !confirmAccountPassword) {
        setError("Both Account Password and account confirmation are required.");
        return;
      }
      if (accountPassword.length < 6) {
        setError("Global Account login password must be at least 6 characters.");
        return;
      }
      if (accountPassword !== confirmAccountPassword) {
        setError("Global Account login passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (isGoogleUser && setupAccountPassword && auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, accountPassword);
        } catch (pwErr: any) {
          console.error("Account login password update failed:", pwErr);
          const isOpNotAllowed = pwErr.code === "auth/operation-not-allowed" || 
            (pwErr.message && pwErr.message.includes("operation-not-allowed"));
          if (isOpNotAllowed) {
            setAccountWarn(
              "Note: Setting a Global Account password is unavailable because standard 'Email/Password' logins are deactivated in this Firebase Console project. However, you can still sign in worldwide using 'Continue with Google' and unlock your vault by entering your master password."
            );
          } else {
            setError(`Failed to set up global password: ${pwErr.message || pwErr}`);
            setLoading(false);
            return;
          }
        }
      }
      await setupMasterPassword(newPassword);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to set up master password.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">VaultSync</h2>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Zero-Knowledge Secure Tunnel</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 relative overflow-hidden">
          {/* Subtle colored accent glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500" />

          {isNewUser ? (
            // MASTER PASSWORD CREATION MODE
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-3">
                  <KeyRound className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Secure Vault Initialization</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Configure your cryptographic master key and global credentials to sync your secrets worldwide.
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg flex items-start space-x-2 text-xs">
                  <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {accountWarn && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3.5 rounded-lg flex flex-col space-y-1.5 text-xs">
                  <div className="flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <span className="font-semibold text-amber-400">Firebase Limitation Warning:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{accountWarn}</p>
                </div>
              )}

              <form onSubmit={handleSetup} className="space-y-4">
                {/* Master Password Fields */}
                <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/85">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide block mb-2">Step 1: On-Device Cryptographic Key</span>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Choose Master Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••••"
                        className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Dynamic Strength Meter */}
                    {newPassword && (
                      <div className="mt-2.5">
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-slate-400 font-medium">Strength Indicator:</span>
                          <span className="font-semibold" style={{ color: strength.color.includes("indigo") ? "#818cf8" : strength.color.includes("emerald") ? "#34d399" : "#fb923c" }}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5 h-1 px-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-full rounded-full transition-all duration-300 ${
                                i <= strength.score ? strength.color : "bg-slate-800"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Verify Master Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••••"
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white transition-all shadow-inner"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Used strictly on-device to derive your AES encryption key. It never leaves your browser.
                  </p>
                </div>

                {/* Optional Global Account Password for Google Users */}
                {isGoogleUser && (
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/85">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id="checkbox-setup-account-password"
                        checked={setupAccountPassword}
                        onChange={(e) => setSetupAccountPassword(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="checkbox-setup-account-password" className="text-xs font-semibold text-slate-200 cursor-pointer select-none flex items-center">
                        <Globe className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                        Step 2: Set Global Login Password (Optional)
                      </label>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-normal mb-3">
                      Allows logging into your account from any browser/device worldwide using standard Email & Password, in addition to Google Account verification.
                    </p>

                    {setupAccountPassword && (
                      <div className="space-y-3 border-t border-slate-800/50 pt-3 animate-fadeIn">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Choose Global Login Password
                          </label>
                          <div className="relative rounded-md shadow-sm">
                            <input
                              type={showAccountPassword ? "text" : "password"}
                              value={accountPassword}
                              onChange={(e) => setAccountPassword(e.target.value)}
                              placeholder="Minimum 6 characters..."
                              className="block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white transition-all shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAccountPassword(!showAccountPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                            >
                              {showAccountPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Verify Global Login Password
                          </label>
                          <input
                            type={showAccountPassword ? "text" : "password"}
                            value={confirmAccountPassword}
                            onChange={(e) => setConfirmAccountPassword(e.target.value)}
                            placeholder="Re-enter global login password..."
                            className="block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white transition-all shadow-inner"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    id="btn-password-setup"
                    type="submit"
                    disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword || (setupAccountPassword && (!accountPassword || accountPassword !== confirmAccountPassword))}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Initialize Crypt-Vault & Sync
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // UNLOCK MODE FOR CURRENT USER
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-indigo-500/15 border border-indigo-500/35 rounded-2xl mb-3 shadow-inner">
                  <KeyRound className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Unlock Secure Vault</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Active authorization verified. Decode your offline client file locally.
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg flex items-start space-x-2 text-xs">
                  <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Master Password
                    </label>
                    <span className="text-[10px] text-slate-500 flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 mr-0.5 " />
                      Offline active
                    </span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter master password..."
                      className="block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-unlock-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Decrypt & Unlock
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-6 border-t border-slate-800/60 pt-4 flex justify-between items-center">
            <div className="text-[10px] text-slate-500">
              Logged in as: <span className="font-semibold text-slate-400 break-all">{auth.currentUser?.email}</span>
            </div>
            <button
              id="unlock-signout"
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center py-1 px-2.5 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
