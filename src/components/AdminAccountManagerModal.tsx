import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Wallet,
  Building,
  Save,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { TradingAccount } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import {
  getAllRegisteredUsers,
  loadUserFinancials,
  saveUserFinancials,
  getUserStorageKey,
} from '../utils/financialStorage';

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
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const users = getAllRegisteredUsers();
    setAllUsers(users);

    const activeKey = getUserStorageKey(currentUser);
    setSelectedUserKey(activeKey);
    setEditableWallet(currentWalletBalance);
    setEditableAccounts(currentAccounts);
    setSelectedAccIndex(0);
    setStatusMessage(null);
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

  const handleSaveAll = () => {
    const targetKey = selectedUserKey || getUserStorageKey(currentUser);

    // Save to user storage
    saveUserFinancials({ id: targetKey, email: targetKey } as any, {
      walletBalance: editableWallet,
      accounts: editableAccounts,
    });

    // If this is the current active session user, apply back to app state
    if (targetKey === getUserStorageKey(currentUser)) {
      onApplyChanges(editableWallet, editableAccounts);
    }

    setStatusMessage({
      text: `Account balances updated successfully!`,
      type: 'success',
    });

    setTimeout(() => {
      onClose();
    }, 1000);
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
                <span>Account &amp; Wallet Balances Manager</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Manager Mode
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Adjust user wallet balances and trading account details.
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

        {/* Status Toast / Banner */}
        {statusMessage && (
          <div
            className={`mx-5 mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* User Selection & Account Editor */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* User Selector */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-neutral-400 uppercase tracking-wider">
              Select User Account
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedUserKey}
                onChange={(e) => handleSelectUser(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-900 text-xs font-semibold focus:outline-none focus:border-[#E51937]"
              >
                {allUsers.length === 0 && (
                  <option value={getUserStorageKey(currentUser)}>
                    {currentUser?.name || 'Active Trader'} ({currentUser?.email || 'Current'})
                  </option>
                )}
                {allUsers.map((u) => (
                  <option key={u.email || u.id} value={getUserStorageKey(u)}>
                    {u.name} — {u.email} (Acc #{u.accountNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Central VTM One Wallet Balance */}
          <div className="p-4 rounded-xl border border-neutral-700/80 bg-neutral-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#E51937] font-bold text-xs uppercase tracking-wider">
                <Wallet className="w-4 h-4" />
                <span>Central VTM One Wallet Balance (USD)</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Live: ${editableWallet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editableWallet}
                onChange={(e) => setEditableWallet(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-neutral-700 bg-neutral-950 font-mono text-sm font-bold focus:outline-none focus:border-[#E51937]"
              />
            </div>
          </div>

          {/* Open Trading Accounts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>Trading Accounts ({editableAccounts.length})</span>
              </label>
            </div>

            {editableAccounts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-neutral-700 text-center text-neutral-400 text-xs">
                No active trading accounts for this user yet. User has $0.00 wallet balance.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Account Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {editableAccounts.map((acc, idx) => (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedAccIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                        selectedAccIndex === idx
                          ? 'bg-[#E51937] text-white border-[#E51937]'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
                      }`}
                    >
                      {acc.type} #{acc.accountNumber}
                    </button>
                  ))}
                </div>

                {/* Selected Account Fields */}
                {editableAccounts[selectedAccIndex] && (
                  <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-900/40 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-neutral-400">Account Type</label>
                        <input
                          type="text"
                          readOnly
                          value={editableAccounts[selectedAccIndex].type}
                          className="w-full px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-xs font-semibold text-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-neutral-400">Tier</label>
                        <input
                          type="text"
                          readOnly
                          value={editableAccounts[selectedAccIndex].tier}
                          className="w-full px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-xs font-semibold text-neutral-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-neutral-300">Balance ($ USD)</label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={editableAccounts[selectedAccIndex].balance}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleUpdateAccountField(selectedAccIndex, 'balance', val);
                              handleUpdateAccountField(selectedAccIndex, 'equity', val);
                            }}
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-950 font-mono text-xs font-bold focus:outline-none focus:border-[#E51937]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1 text-neutral-300">Equity ($ USD)</label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={editableAccounts[selectedAccIndex].equity}
                            onChange={(e) =>
                              handleUpdateAccountField(selectedAccIndex, 'equity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-950 font-mono text-xs font-bold focus:outline-none focus:border-[#E51937]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-neutral-300">Leverage</label>
                      <select
                        value={editableAccounts[selectedAccIndex].leverage}
                        onChange={(e) => handleUpdateAccountField(selectedAccIndex, 'leverage', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-950 text-xs font-bold focus:outline-none focus:border-[#E51937]"
                      >
                        <option value="1:100">1:100</option>
                        <option value="1:200">1:200</option>
                        <option value="1:400">1:400</option>
                        <option value="1:500">1:500</option>
                        <option value="1:1000">1:1000</option>
                        <option value="1:2000">1:2000</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80">
          <span className="text-[11px] text-neutral-400">
            Account adjustments apply to active balances.
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
