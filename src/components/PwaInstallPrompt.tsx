import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if or already running in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setVisible(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md bg-indigo-600 dark:bg-indigo-700 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between animate-bounce border border-indigo-400">
      <div className="flex items-center space-x-3">
        <div className="bg-white/10 p-2 rounded-lg">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Install VaultSync App</h3>
          <p className="text-xs text-indigo-100">Access your security vault directly from your desktop or home screen offline.</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={handleInstallClick}
          className="bg-white text-indigo-600 hover:bg-indigo-50 font-medium text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          Install App
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
