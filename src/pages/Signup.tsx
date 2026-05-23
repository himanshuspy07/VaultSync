import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { ShieldAlert, Lock } from "lucide-react";

export const Signup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
            <Lock className="w-10 h-10 text-indigo-500" />
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white font-sans">VaultSync</h2>
        <p className="mt-2 text-sm text-slate-400">
          Create password manager sync coordinator profiles
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <div className="mb-6 text-center">
            <h3 className="text-lg font-medium text-white">Device Registration</h3>
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
