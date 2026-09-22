import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Wallet,
  Building,
  Save,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  Plus,
  KeyRound,
  DollarSign,
} from 'lucide-react';
import { TradingAccount } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import {
  getAllRegisteredUsers,
  loadUserFinancials,
  saveUserFinancials,
  adminUpdateUserAccount,
  getUserStorageKey,
} from '../utils/financialStorage';
import { supabaseService } from '../services/supabaseService';

interface AdminAccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAuthProfile | null;
  currentAccounts: TradingAccount[];
  currentWalletBalance: number;
  onApplyChanges: (updatedWallet: number, updatedAccounts: TradingAccount[]) => void;
  isDarkMode?: boolean;
}

export const AdminAccountManagerModal: React.FC<AdminAccountManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentAccounts,
  currentWalletBalance,
  onApplyChanges,
  isDarkMode = true,
}) => {
  const [selectedUserKey, setSelectedUserKey] = useState<string>(() => getUserStorageKey(currentUser));
  const [allUsers, setAllUsers] = useState<UserAuthProfile[]>([]);

  // Form state
  const [editableWallet, setEditableWallet] = useState<number>(currentWalletBalance);
  const [editableAccounts, setEditableAccounts] = useState<TradingAccount[]>(currentAccounts);
  const [selectedAccIndex, setSelectedAccIndex] = useState<number>(0);

  // Supabase connection state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [dbStatusMessage, setDbStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'database'>('accounts');

  useEffect(() => {
    if (!isOpen) return;
    const users = getAllRegisteredUsers();
    setAllUsers(users);

    const activeKey = getUserStorageKey(currentUser);
    setSelectedUserKey(activeKey);
    setEditableWallet(currentWalletBalance);
    setEditableAccounts(currentAccounts);
    setSelectedAccIndex(0);

    const cfg = supabaseService.getConfig();
    if (cfg) {
      setSupabaseUrl(cfg.url);
      setSupabaseKey(cfg.anonKey);
    }
  }, [isOpen, currentUser, currentAccounts, currentWalletBalance]);

  // When switching user in admin view
  const handleSelectUser = (key: string) => {
    setSelectedUserKey(key);
    const raw = loadUserFinancials({ id: key, email: key } as any);
    if (raw) {
      setEditableWallet(raw.walletBalance);
      setEditableAccounts(raw.accounts);
      setSelectedAccIndex(0);
    } else {
      setEditableWallet(0);
      setEditableAccounts([]);
      setSelectedAccIndex(0);
    }
  };

  const handleUpdateAccountField = (index: number, field: keyof TradingAccount, val: any) => {
    setEditableAccounts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddNewAccount = (type: 'Live' | 'Demo') => {
    const num = Math.floor(7000000 + Math.random() * 999999).toString();
    const newAcc: TradingAccount = {
      id: `acc-admin-${Date.now()}`,
      accountNumber: num,
      server: type === 'Live' ? 'VTMarkets-LiveServer1' : 'VTMarkets-DemoServer',
      type,
      tier: 'Premium',
      balance: type === 'Demo' ? 100000 : 0,
      equity: type === 'Demo' ? 100000 : 0,
      margin: 0,
      freeMargin: type === 'Demo' ? 100000 : 0,
      marginLevel: 0,
      currency: 'USD',
      leverage: '1:500',
    };
    setEditableAccounts((prev) => [...prev, newAcc]);
    setSelectedAccIndex(editableAccounts.length);
  };

  const handleSaveAll = () => {
    // 1. Update persistent storage
    const targetKey = selectedUserKey;
    adminUpdateUserAccount(targetKey, {
      walletBalance: editableWallet,
    });

    // Save full state for target user
    saveUserFinancials({ id: targetKey, email: targetKey } as any, {
      walletBalance: editableWallet,
      accounts: editableAccounts,
    });

    // 2. If this is the current active session user, apply back to App.tsx state
    if (targetKey === getUserStorageKey(currentUser)) {
      onApplyChanges(editableWallet, editableAccounts);
    }

    setDbStatusMessage({
      text: `Changes saved permanently to local storage & queued for Supabase!`,
      type: 'success',
    });

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTestDatabase = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setDbStatusMessage({ text: 'Please enter both Supabase Project URL and Anon Key.', type: 'error' });
      return;
    }
    setIsTestingDb(true);
    setDbStatusMessage(null);
    try {
      supabaseService.setCredentials(supabaseUrl, supabaseKey);
      const res = await supabaseService.testConnection();
      if (res.success) {
        setDbStatusMessage({ text: '✓ Supabase database connection verified!', type: 'success' });
        // Trigger sync
        await supabaseService.syncUserFinancials(currentUser, {
          walletBalance: editableWallet,
          accounts: editableAccounts,
          lastUpdated: Date.now(),
        });
      } else {
        setDbStatusMessage({ text: `Connection note: ${res.message}`, type: 'error' });
      }
    } catch (e: any) {
      setDbStatusMessage({ text: e.message || 'Error connecting to database', type: 'error' });
    } finally {
      setIsTestingDb(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
          isDarkMode ? 'bg-[#12151D] border-neutral-700/80 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E51937]/15 text-[#E51937] border border-[#E51937]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>Account &amp; Wallet Permissions Manager</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Manager Mode
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Authorized control to adjust user wallet balances, live accounts &amp; Supabase persistence.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs: Accounts vs Supabase Config */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/50 px-4 pt-2">
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'accounts'
                ? 'border-[#E51937] text-[#E51937]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>User Accounts &amp; Balances</span>
          </button>
          <button
            onClick={() => setActiveSubTab('database')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'database'
                ? 'border-[#E51937] text-[#E51937]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Cloud Database</span>
          </button>
        </div>

        {/* Status Toast / Banner */}
        {dbStatusMessage && (
          <div
            className={`mx-5 mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              dbStatusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            }`}
          >
            {dbStatusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{dbStatusMessage.text}</span>
          </div>
        )}

        {/* Tab 1: User Accounts & Balances */}
        {activeSubTab === 'accounts' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* User Selection */}
            <div>
              <label className="block text-xs font-bold mb-1 text-neutral-300">Target User Account</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedUserKey}
                  onChange={(e) => handleSelectUser(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-900 text-xs font-semibold focus:outline-none focus:border-[#E51937]"
                >
                  <option value={getUserStorageKey(currentUser)}>
                    {currentUser?.name || 'Active Session'} ({currentUser?.email || 'Current'})
                  </option>
                  {allUsers
                    .filter((u) => getUserStorageKey(u) !== getUserStorageKey(currentUser))
                    .map((u) => (
                      <option key={u.id} value={getUserStorageKey(u)}>
                        {u.name} ({u.email || u.accountNumber || u.id})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Central VTM Wallet Balance Editor */}
            <div className="p-4 rounded-xl border border-neutral-700/80 bg-neutral-900/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">VTM One Central Wallet Balance (USD)</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">Survives Logout/Login</span>
              </div>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editableWallet}
                  onChange={(e) => setEditableWallet(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-700 bg-neutral-950 font-mono font-bold text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Trading Accounts List & Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#E51937]" />
                  <span className="text-xs font-bold">Trading Accounts ({editableAccounts.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAddNewAccount('Live')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E51937] hover:bg-[#c9142f] text-white text-[11px] font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Live</span>
                  </button>
                  <button
                    onClick={() => handleAddNewAccount('Demo')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-[11px] font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Demo</span>
                  </button>
                </div>
              </div>

              {editableAccounts.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-neutral-700 text-center text-xs text-neutral-400">
                  User currently has 0 live or demo accounts (Clean sign-up state). Click "Add Live" or "Add Demo" to grant one.
                </div>
              ) : (
                <div className="space-y-2">
                  {editableAccounts.map((acc, idx) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl border border-neutral-700/80 bg-neutral-900/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded leading-none ${
                              acc.type === 'Live' ? 'bg-[#E51937] text-white' : 'bg-amber-500 text-black'
                            }`}
                          >
                            {acc.type}
                          </span>
                          <span className="text-xs font-mono font-bold">#{acc.accountNumber}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">({acc.server})</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditableAccounts((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-400 mb-0.5">
                            Balance ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={acc.balance}
                            onChange={(e) => {
                              const b = parseFloat(e.target.value) || 0;
                              handleUpdateAccountField(idx, 'balance', b);
                              handleUpdateAccountField(idx, 'equity', b);
                              handleUpdateAccountField(idx, 'freeMargin', b);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-700 bg-neutral-950 font-mono font-bold text-xs focus:outline-none focus:border-[#E51937]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-400 mb-0.5">
                            Leverage
                          </label>
                          <select
                            value={acc.leverage}
                            onChange={(e) => handleUpdateAccountField(idx, 'leverage', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-700 bg-neutral-950 font-mono text-xs focus:outline-none focus:border-[#E51937]"
                          >
                            <option value="1:100">1:100</option>
                            <option value="1:200">1:200</option>
                            <option value="1:500">1:500</option>
                            <option value="1:1000">1:1000</option>
                            <option value="1:2000">1:2000</option>
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-semibold text-neutral-400 mb-0.5">
                            Tier
                          </label>
                          <select
                            value={acc.tier}
                            onChange={(e) => handleUpdateAccountField(idx, 'tier', e.target.value as any)}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-700 bg-neutral-950 text-xs focus:outline-none focus:border-[#E51937]"
                          >
                            <option value="Standard">Standard</option>
                            <option value="Premium">Premium</option>
                            <option value="Pro">Pro</option>
                            <option value="Zero Spread">Zero Spread</option>
                            <option value="Cent">Cent</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Supabase Cloud Database Configuration */}
        {activeSubTab === 'database' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="p-4 rounded-xl border border-neutral-700/80 bg-neutral-900/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Database className="w-4 h-4" />
                <span>Supabase Real-Time Cross-Device Synchronization</span>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Connect your Supabase project so account balances, VTM One Wallet transfers, and trade records stay identical across mobile and desktop devices.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-neutral-300">Supabase Project URL</label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-950 font-mono text-xs focus:outline-none focus:border-[#E51937]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-neutral-300">Supabase Anon Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-950 font-mono text-xs focus:outline-none focus:border-[#E51937]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestDatabase}
                disabled={isTestingDb}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
                <span>{isTestingDb ? 'Testing...' : 'Test & Save Supabase'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80">
          <span className="text-[11px] text-neutral-400">
            Changes update immediate state &amp; durable database storage.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E51937] hover:bg-[#c9142f] text-white font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Apply Balances</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
