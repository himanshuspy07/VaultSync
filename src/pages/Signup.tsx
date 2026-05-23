import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { ShieldAlert, Sun, Moon } from "lucide-react";
import vaultSyncIcon from "../assets/images/vaultsync_icon_1779518157491.png";

export const Signup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to register with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative animate-fadeIn">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-850 text-slate-400 hover:text-slate-100 transition-colors shadow-lg"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-indigo-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="relative p-1.5 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl">
            <img
              src={vaultSyncIcon}
              alt="VaultSync Logo"
              className="w-16 h-16 rounded-xl object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-200 font-sans">VaultSync</h2>
        <p className="mt-2 text-sm text-slate-400">
          Create password manager sync coordinator profiles
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <div className="mb-6 text-center">
            <h3 className="text-lg font-medium text-slate-200">Device Registration</h3>
            <p className="text-xs text-slate-400 mt-1">
              Create an account using your Google profile. Safe & instant synchronization setup.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-lg flex items-start space-x-2 text-xs">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-4">
            <button
              id="btn-google-signup"
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full h-12 flex justify-center items-center py-2.5 px-4 border border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-xl shadow text-sm font-semibold text-slate-300 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.4-2.4C17.3 1.7 14.9 1 12.24 1a10 10 0 100 20c5.3 0 9.8-3.9 9.8-9.715a13.3 13.3 0 00-.16-2H12.24z" />
                  </svg>
                  Sign Up with Google
                </>
              )}
            </button>
          </div>

          <div className="mt-6 border-t border-slate-850 pt-4 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
