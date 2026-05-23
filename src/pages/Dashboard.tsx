import React, { useState, useEffect } from "react";
import { useVault } from "../context/VaultContext";
import { signOut, updatePassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { generatePassword } from "../utils/crypto";
import { type VaultEntry, type PasswordGeneratorConfig } from "../types";
import { motion, AnimatePresence } from "motion/react";
import vaultSyncIcon from "../assets/images/vaultsync_icon_1779518157491.png";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Lock,
  RefreshCw,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  MoreVertical,
  LogOut,
  Moon,
  Sun,
  Shield,
  ShieldAlert,
  Clock,
  Globe,
  Settings
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const {
    entries,
    isOffline,
    hasLocalChanges,
    isSyncing,
    lockTimer,
    autoLockTime,
    lockVault,
    addEntry,
    updateEntry,
    deleteEntry,
    forceSyncOffline
  } = useVault();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Local theme state (defaults to dark, matches user request)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") !== "light";
  });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<VaultEntry | null>(null);

  // Settings modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newGlobalPassword, setNewGlobalPassword] = useState("");
  const [confirmGlobalPassword, setConfirmGlobalPassword] = useState("");
  const [showGlobalPassword, setShowGlobalPassword] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [setupOptionWarning, setSetupOptionWarning] = useState("");

  // Form States
  const [serviceName, setServiceName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<VaultEntry["category"]>("Login");
  const [notes, setNotes] = useState("");

  // Sub-generator panel state
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [genConfig, setGenConfig] = useState<PasswordGeneratorConfig>({
    length: 16,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: true
  });

  // Copy Indicators Map (maps ID to active icon copy indicator)
  const [copyStates, setCopyStates] = useState<{ [key: string]: "username" | "password" | "done" | null }>({});

  // Active view passwords map (which entries have revealed passwords)
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});

  // Detail panel (selected entry card state)
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);

  // Apply light/dark class on document node
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

  // Handle password reveal toggles
  const toggleReveal = (id: string, e?: React.MouseEvent) => {
    if (e) {e.stopPropagation();}
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Trigger clipboard copying + visual toast states
  const handleCopy = async (id: string, text: string, type: "username" | "password", e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopyStates(prev => ({ ...prev, [id]: type }));
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [id]: null }));
      }, 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Open modal for Creating
  const openCreateModal = () => {
    setEditingEntry(null);
    setServiceName("");
    setUsername("");
    setPassword("");
    setUrl("");
    setCategory("Login");
    setNotes("");
    setShowGenPanel(false);
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const openEditModal = (entry: VaultEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEntry(entry);
    setServiceName(entry.name);
    setUsername(entry.username);
    setPassword(entry.password);
    setUrl(entry.url || "");
    setCategory(entry.category);
    setNotes(entry.notes || "");
    setShowGenPanel(false);
    setIsModalOpen(true);
  };

  // Delete handlers
  const triggerDeleteConfirm = (entry: VaultEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEntryToDelete(entry);
  };

  const confirmDelete = async () => {
    if (entryToDelete) {
      const targetId = entryToDelete.id;
      // Close the delete modal optimistically and immediately for responsiveness
      setEntryToDelete(null);
      if (selectedEntry?.id === targetId) {
        setSelectedEntry(null);
      }
      try {
        await deleteEntry(targetId);
      } catch (err) {
        console.error("Deletion failed:", err);
      }
    }
  };

  // Trigger password generation in form
  const handleGenerateInForm = () => {
    const generated = generatePassword(genConfig);
    setPassword(generated);
  };

  // Submit Modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !username || !password) {
      alert("Service Name, Username, and Password are required.");
      return;
    }

    const itemPayload = {
      name: serviceName,
      username,
      password,
      url,
      category,
      notes
    };

    // Close the create/edit modal optimistically and immediately for responsiveness
    setIsModalOpen(false);

    try {
      if (editingEntry) {
        // Update local state and trigger DB write asynchronously
        updateEntry({
          ...editingEntry,
          ...itemPayload
        }).catch(err => console.error("Update entry failed:", err));
        
        // Update selected detail view if active
        if (selectedEntry?.id === editingEntry.id) {
          setSelectedEntry({ ...editingEntry, ...itemPayload });
        }
      } else {
        // Add local state and trigger DB write asynchronously
        addEntry(itemPayload).catch(err => console.error("Add entry failed:", err));
      }
    } catch (err) {
      console.error("Save credentials failed:", err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleUpdateGlobalPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");
    setSetupOptionWarning("");

    if (!newGlobalPassword) {
      setSettingsError("Please choose a password.");
      return;
    }
    if (newGlobalPassword.length < 6) {
      setSettingsError("Password must be at least 6 characters.");
      return;
    }
    if (newGlobalPassword !== confirmGlobalPassword) {
      setSettingsError("Passwords do not match.");
      return;
    }

    setSettingsLoading(true);

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newGlobalPassword);
        setSettingsSuccess("Global login password successfully configured! You can now log in using standard Email & Password from any browser worldwide, in addition to Google Account verification.");
        setNewGlobalPassword("");
        setConfirmGlobalPassword("");
      } else {
        setSettingsError("No active user session found.");
      }
    } catch (err: any) {
      console.error(err);
      const isOpNotAllowed = err.code === "auth/operation-not-allowed" || 
        (err.message && err.message.includes("operation-not-allowed"));
      if (isOpNotAllowed) {
        setSetupOptionWarning("Standard 'Email/Password' logins are deactivated in your Firebase console. Please contact your Firebase project administrator to enable it under Authentication > Sign-in method. Google quick logins and local Master Passwords remain fully active and secured!");
      } else if (err.code === "auth/requires-recent-login") {
        setSettingsError("Security restriction: Please re-authenticate (logout and log back in) before updating credentials.");
      } else {
        setSettingsError(err.message || "Failed to set global login password.");
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  // Filter & Search computation
  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.url && e.url.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = activeCategory === "All" || e.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const categoriesList = ["All", "Login", "Card", "Note", "Identity", "Other"];

  // Helper to color visual identifiers
  const getAvatarInitialsAndColor = (name: string) => {
    const initial = name.trim().charAt(0).toUpperCase();
    const colors = [
      "bg-slate-800 text-slate-100 border-slate-700/80",
      "bg-slate-900 text-indigo-400 border-slate-800",
      "bg-slate-900 text-blue-500 border-slate-800",
      "bg-slate-900 text-emerald-400 border-slate-800",
      "bg-slate-900 text-amber-400 border-slate-800"
    ];
    // Deterministic pick based on first ASCII char
    const index = (initial.charCodeAt(0) || 0) % colors.length;
    return { character: initial || "?", style: colors[index] };
  };

  // Auto lock warning calculations
  const isTimeCritical = lockTimer <= 15;

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 transition-colors duration-300 font-sans text-slate-100 dark:text-slate-100 light:text-slate-800 flex flex-col">
      
      {/* ⚠️ BANNER SYSTEM: OFFLINE AND SYNC STATUSES */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between border-b border-amber-500/30"
          >
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
              <span>You are offline. Vault Sync is running locally to save your credentials. Changes will auto-encrypt and write to Cloud when connection returns.</span>
            </div>
            {hasLocalChanges && (
              <span className="bg-amber-800 text-amber-100 px-2.5 py-0.5 rounded-full text-[10px]">Unsaved Local Saves</span>
            )}
          </motion.div>
        )}
        {!isOffline && hasLocalChanges && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>You have pending cryptokey changes waiting to sync.</span>
            </div>
            <button
              onClick={forceSyncOffline}
              disabled={isSyncing}
              className="bg-indigo-800 hover:bg-slate-900 border border-indigo-400/20 text-indigo-100 px-3 py-1 rounded-lg text-[11px] font-bold transition-all shadow"
            >
              Sync Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-0.5 bg-slate-900 border border-slate-800 rounded-xl shadow-inner shrink-0">
              <img
                src={vaultSyncIcon}
                alt="VaultSync Logo"
                className="w-8 h-8 rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-200 flex items-center">
                VaultSync
                <span className="ml-2 text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium px-2 py-0.5 rounded-full">v1.0</span>
              </h1>
              <p className="text-[10px] text-slate-400">Zero-Knowledge Offline Active</p>
            </div>
          </div>

          {/* Center Activity Status */}
          <div className="hidden md:flex items-center space-x-4 text-xs">
            {/* Auto Lock Timer Bar */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border ${
              isTimeCritical ? "border-rose-500/30 bg-rose-950/10 text-rose-400" : "border-slate-800 text-slate-400"
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isTimeCritical ? "animate-spin" : ""}`} />
              <span className="font-semibold tabular-nums">
                Auto Lock warning: {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-indigo-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Security Settings Toggle */}
            <button
              id="btn-nav-settings"
              onClick={() => {
                setSettingsError("");
                setSettingsSuccess("");
                setSetupOptionWarning("");
                setIsSettingsOpen(true);
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Security Settings"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
            </button>

            {/* In-Memory Lock Button */}
            <button
              id="btn-lock-vault"
              onClick={lockVault}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 text-xs font-semibold flex items-center space-x-1.5 transition-all"
              title="Return and clear decrypters"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock Vault</span>
            </button>

            {/* Logout Profile */}
            <button
              id="btn-nav-logout"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
              title="Logout Sync session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* AUTO LOCK TIMEOUT STATUS STRIP ON MOBILE */}
      <div className="md:hidden flex items-center justify-center bg-slate-900 border-b border-slate-800/60 py-1.5 px-4 text-[11px]">
        <div className={`flex items-center space-x-1.5 ${isTimeCritical ? "text-rose-400 animate-pulse font-bold" : "text-slate-400"}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>Auto Locking: {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, "0")}</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6">

        {/* SIDEBAR NAVIGATION: CATEGORIES */}
        <section className="w-full md:w-64 shrink-0 flex flex-col space-y-4">
          <button
            id="btn-add-vault-item"
            onClick={openCreateModal}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4.5 h-4.5" style={{ color: "#080808" }} />
            <span className="text-[#0e0d0d]">Add Password</span>
          </button>

          {/* Categories Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-2">Folders / Entries</h2>
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {categoriesList.map((cat) => {
                const isActive = activeCategory === cat;
                const count = cat === "All" 
                  ? entries.length 
                  : entries.filter((e) => e.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                      isActive
                        ? "bg-indigo-600 text-white font-semibold shadow"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <span>{cat === "All" ? "All Vault Items" : `${cat}s`}</span>
                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${
                      isActive ? "bg-indigo-700 text-indigo-100" : "bg-slate-800 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </section>

        {/* VAULT SEARCH AND LISTING SECTION */}
        <section className="flex-1 flex flex-col space-y-4">
          
          {/* Search box row */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-500" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by application name, username, URL..."
              className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm placeholder-slate-500 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
          </div>

          {/* Data List container */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-xl min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850 mb-4">
              <h3 className="font-bold text-sm text-slate-200">
                {activeCategory === "All" ? "All Credentials" : `${activeCategory} Listings`}
              </h3>
              <span className="text-xs text-slate-500">
                Fetched {filteredEntries.length} of {entries.length} records
              </span>
            </div>

            {/* List entries */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[600px] pr-1">
              <AnimatePresence initial={false}>
                {filteredEntries.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl text-slate-500 mb-3 shadow-inner">
                      <Shield className="w-10 h-10 text-slate-600 animate-pulse" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">No passwords or credentials found.</span>
                    <p className="text-[11px] text-slate-600 max-w-xs mt-1">
                      {searchTerm ? "No local records match your active search filter." : "Your password vault is currently empty. Initialize items with button above."}
                    </p>
                  </motion.div>
                ) : (
                  filteredEntries.map((entry) => {
                    const avatar = getAvatarInitialsAndColor(entry.name);
                    const isRevealed = !!revealedPasswords[entry.id];
                    const copyState = copyStates[entry.id];
                    const isSelected = selectedEntry?.id === entry.id;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => setSelectedEntry(isSelected ? null : entry)}
                        className={`group relative p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-slate-800/50 border-indigo-500/50"
                            : "bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/20 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          {/* Circular Avatar */}
                          <div className={`w-9.5 h-9.5 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-xs border uppercase shrink-0 shadow-lg ${avatar.style}`}>
                            {avatar.character}
                          </div>

                          {/* Text info */}
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-xs text-slate-200 truncate">{entry.name}</span>
                              <span className="text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-full text-slate-400 font-medium">
                                {entry.category}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-0.5 max-w-[150px] sm:max-w-[280px]">
                              {entry.username}
                            </div>
                          </div>
                        </div>

                        {/* Interactive items and buttons */}
                        <div className="flex items-center space-x-1 ml-4 shrink-0">
                          
                          {/* Masked Password block */}
                          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg text-xs font-mono mr-2 gap-1.5">
                            <span className="text-slate-400 select-none">
                              {isRevealed ? entry.password : "••••••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => toggleReveal(entry.id, e)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Quick copy icons */}
                          <div className="flex items-center">
                            <button
                              id={`btn-copy-username-${entry.id}`}
                              onClick={(e) => handleCopy(entry.id, entry.username, "username", e)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                copyState === "username"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200"
                              }`}
                              title="Copy username"
                            >
                              {copyState === "username" ? <Check className="w-3.5 h-3.5 animate-scale" /> : <MoreVertical className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              id={`btn-copy-password-${entry.id}`}
                              onClick={(e) => handleCopy(entry.id, entry.password, "password", e)}
                              className={`p-1.5 rounded-lg border ml-1 transition-colors ${
                                copyState === "password"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200 animate-pulse"
                              }`}
                              title="Copy secure password"
                            >
                              {copyState === "password" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Action Items */}
                          <div className="hidden sm:flex items-center pl-2 border-l border-slate-800/80 ml-1.5">
                            <button
                              id={`btn-edit-item-${entry.id}`}
                              onClick={(e) => openEditModal(entry, e)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-900 transition-colors"
                              title="Edit record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-delete-item-${entry.id}`}
                              onClick={(e) => triggerDeleteConfirm(entry, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                      
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* SIDE DETAIL VIEW PANEL */}
        {selectedEntry && (
          <>
            {/* Mobile backdrop to dismiss card on clicking overlay outside */}
            <div 
              className="fixed inset-0 bg-slate-950/70 z-30 md:hidden backdrop-blur-xs"
              onClick={() => setSelectedEntry(null)}
            />
            
            {/* Floating pop-up card on mobile screens, elegant column block on desktop screens */}
            <aside className="fixed inset-x-4 bottom-4 md:inset-auto z-40 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between animate-fadeIn md:relative md:z-0 md:w-80 md:shadow-xl shrink-0">
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-slate-850 mb-4">
                <h3 className="font-bold text-sm text-slate-200">Record Inspector</h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-xs text-slate-500 hover:text-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                {/* Visual Circle avatar */}
                <div className="flex flex-col items-center py-2 text-center">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold text-xl border uppercase shadow-xl mb-2.5 ${getAvatarInitialsAndColor(selectedEntry.name).style}`}>
                    {getAvatarInitialsAndColor(selectedEntry.name).character}
                  </div>
                  <h4 className="font-bold text-base text-slate-200">{selectedEntry.name}</h4>
                  <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-indigo-300 font-semibold mt-1">
                    {selectedEntry.category}
                  </span>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block mb-1">Username / Identifier</span>
                    <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-slate-300 font-mono truncate mr-2">{selectedEntry.username}</span>
                      <button
                        onClick={(e) => handleCopy(selectedEntry.id, selectedEntry.username, "username", e)}
                        className="text-indigo-400 hover:text-indigo-300 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block mb-1">Decrypted Password</span>
                    <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between">
                      <span className="text-indigo-300 font-mono text-sm break-all select-all mr-2">
                        {revealedPasswords[selectedEntry.id] ? selectedEntry.password : "••••••••••••••"}
                      </span>
                      <div className="flex space-x-2 shrink-0">
                        <button
                          onClick={() => toggleReveal(selectedEntry.id)}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          {revealedPasswords[selectedEntry.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => handleCopy(selectedEntry.id, selectedEntry.password, "password", e)}
                          className="text-indigo-400 hover:text-indigo-300"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedEntry.url && (
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">Access URL</span>
                      <a
                        href={selectedEntry.url.startsWith("http") ? selectedEntry.url : `https://${selectedEntry.url}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between hover:border-slate-700 text-indigo-400 font-mono truncate"
                      >
                        <span className="truncate mr-2 text-[11px]">{selectedEntry.url}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      </a>
                    </div>
                  )}

                  {selectedEntry.notes && (
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">Encrypted Notes</span>
                      <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {selectedEntry.notes}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-2.5 flex justify-between items-center bg-slate-950/20 px-2 rounded">
                    <span>Last local write:</span>
                    <span className="font-semibold">{new Date(selectedEntry.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex space-x-2">
              <button
                id={`btn-side-edit-${selectedEntry.id}`}
                onClick={(e) => openEditModal(selectedEntry, e)}
                className="flex-1 py-2 px-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 text-xs font-bold rounded-xl transition-all"
              >
                Modify Record
              </button>
              <button
                id={`btn-side-delete-${selectedEntry.id}`}
                onClick={(e) => triggerDeleteConfirm(selectedEntry, e)}
                className="py-2 px-3 text-rose-400 bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 rounded-xl font-bold text-xs transition-colors"
                title="Remove permanently"
              >
                Delete
              </button>
            </div>
          </aside>
        </>
      )}
      </main>

      {/* CREATE & EDIT DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500" />
            
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-1">
                  {editingEntry ? "Modify Secured Password" : "Secure New Credential"}
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  Secure with full locally encrypted container fields.
                </p>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Service / Website Name</label>
                      <input
                        type="text"
                        required
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="e.g. Github, Bank accounts"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Category Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as VaultEntry["category"])}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-xs"
                      >
                        <option value="Login">Login</option>
                        <option value="Card">Card</option>
                        <option value="Note">Notes</option>
                        <option value="Identity">Identity</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Username / Identifier</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. myalias@domain.com or account_id"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-400">Password / Secret Key</label>
                      <button
                        type="button"
                        onClick={() => setShowGenPanel(!showGenPanel)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center font-bold"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        {showGenPanel ? "Hide Generator" : "Random Generator"}
                      </button>
                    </div>

                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter secret sequence..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-xs"
                      />
                    </div>

                    {/* INTERACTIVE PASSWORD GENERATOR SUBPANEL */}
                    <AnimatePresence>
                      {showGenPanel && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 overflow-hidden text-xs text-slate-300"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">Generator Length: {genConfig.length}</span>
                            <input
                              type="range"
                              min="8"
                              max="64"
                              value={genConfig.length}
                              onChange={(e) => setGenConfig({ ...genConfig, length: Number(e.target.value) })}
                              className="accent-indigo-500 w-32"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                              <input
                                type="checkbox"
                                checked={genConfig.useUppercase}
                                onChange={(e) => setGenConfig({ ...genConfig, useUppercase: e.target.checked })}
                                className="rounded border-slate-800 text-indigo-600 focus:ring-opacity-0"
                              />
                              <span>A-Z (Uppercase)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                              <input
                                type="checkbox"
                                checked={genConfig.useLowercase}
                                onChange={(e) => setGenConfig({ ...genConfig, useLowercase: e.target.checked })}
                                className="rounded border-slate-800 text-indigo-600 focus:ring-opacity-0"
                              />
                              <span>a-z (Lowercase)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                              <input
                                type="checkbox"
                                checked={genConfig.useNumbers}
                                onChange={(e) => setGenConfig({ ...genConfig, useNumbers: e.target.checked })}
                                className="rounded border-slate-800 text-indigo-600 focus:ring-opacity-0"
                              />
                              <span>0-9 (Numbers)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                              <input
                                type="checkbox"
                                checked={genConfig.useSymbols}
                                onChange={(e) => setGenConfig({ ...genConfig, useSymbols: e.target.checked })}
                                className="rounded border-slate-800 text-indigo-600 focus:ring-opacity-0"
                              />
                              <span>!@#$ (Symbols)</span>
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={handleGenerateInForm}
                            className="w-full flex items-center justify-center space-x-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg font-bold text-xs text-white"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Apply Generated Key</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Access URL / Domain (Optional)</label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="e.g. https://domain.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Secure Notes (Optional, Decoded on unlock)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Write recovery keys, card details or context here safely..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-xs h-20 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/70 py-4 px-6 border-t border-slate-805 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-semibold text-xs border border-transparent hover:border-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-credentials"
                  type="submit"
                  className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500-white font-bold text-xs rounded-xl shadow shadow-indigo-600/10 transition-colors"
                >
                  {editingEntry ? "Update Securely" : "Save Encrypted"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* SECURITY SETTINGS MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Security Settings</h3>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-500 hover:text-white transition-colors text-xl font-bold px-1"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                  <p className="font-semibold text-white flex items-center">
                    <Globe className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                    Worldwide Access Configuration
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    To access your credentials dashboard from any computer worldwide, you can configure a standard global account password in addition to Google Account verification.
                  </p>
                </div>

                {settingsError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg flex items-start space-x-2 text-xs">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                    <span>{settingsError}</span>
                  </div>
                )}

                {settingsSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg flex items-start space-x-2 text-xs leading-relaxed">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span>{settingsSuccess}</span>
                  </div>
                )}

                {setupOptionWarning && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-lg flex flex-col space-y-1.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                      <span className="font-semibold text-amber-400">Sign-in Provider Restrained</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{setupOptionWarning}</p>
                  </div>
                )}

                <form onSubmit={handleUpdateGlobalPassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Global Account Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type={showGlobalPassword ? "text" : "password"}
                        value={newGlobalPassword}
                        onChange={(e) => setNewGlobalPassword(e.target.value)}
                        placeholder="At least 6 characters..."
                        required
                        className="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGlobalPassword(!showGlobalPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showGlobalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Confirm Global Password
                    </label>
                    <input
                      type={showGlobalPassword ? "text" : "password"}
                      value={confirmGlobalPassword}
                      onChange={(e) => setConfirmGlobalPassword(e.target.value)}
                      placeholder="Confirm global password..."
                      required
                      className="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <button
                    id="btn-settings-password-save"
                    type="submit"
                    disabled={settingsLoading || !newGlobalPassword}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md font-bold bg-indigo-650 hover:bg-indigo-600 text-white bg-indigo-600 hover:bg-indigo-500 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {settingsLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Set Global Credentials"
                    )}
                  </button>
                </form>

                <div className="border-t border-slate-805 pt-4 flex justify-between text-[10px] text-slate-500">
                  <span>Secured locally with Master Password</span>
                  <span className="font-semibold text-slate-400">Sync is active</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {entryToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500" />
              
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-3 text-rose-500">
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <Trash2 className="w-5 h-5 text-rose-500 animate-pulse" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">Confirm Permanent Deletion</h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-xl space-y-2">
                    <p className="text-slate-400">
                      You are about to permanently delete the credential for:
                    </p>
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-slate-900 border border-slate-805 rounded-lg shrink-0">
                        <div className="w-5 h-5 text-[10px] flex items-center justify-center font-bold text-slate-300 font-mono uppercase bg-slate-800 border border-slate-700/80 rounded-md">
                          {entryToDelete.name.trim().charAt(0).toUpperCase() || "?"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs block truncate leading-tight">{entryToDelete.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">{entryToDelete.username}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 leading-relaxed text-[11px] bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500 inline-block mr-1.5 shrink-0 align-text-bottom" />
                    <strong>Security Warning:</strong> This operation is performed client-side using Zero-Knowledge encryption. Deleting this entry will wipe all active local cached states and synced cloud storage backups permanently. <strong>This cannot be undone.</strong>
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/70 py-4 px-6 border-t border-slate-805 flex justify-end space-x-2.5">
                <button
                  id="btn-cancel-delete"
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-semibold text-xs border border-transparent hover:border-slate-800 rounded-xl transition-all"
                >
                  Cancel, Keep Credential
                </button>
                <button
                  id="btn-confirm-delete"
                  type="button"
                  onClick={confirmDelete}
                  className="px-4.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow shadow-rose-600/10 transition-colors"
                >
                  Permanently Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
