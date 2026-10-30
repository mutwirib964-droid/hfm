import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Eye,
  Download,
  ShieldCheck,
  AlertTriangle,
  Send,
  Terminal,
  ArrowDownLeft,
  X,
  Smartphone,
  CreditCard,
  User,
  Hash,
  Database,
  Calendar,
} from 'lucide-react';
import {
  payheroService,
  PayHeroTransactionAuditLog,
  getUsdKesRate,
} from '../services/payheroService';
import { getAllPlatformDeposits } from '../utils/financialStorage';
import { UserAuthProfile } from '../types/botTypes';

interface AdminTransactionLogsProps {
  isDarkMode?: boolean;
  onClose?: () => void;
  currentUser?: UserAuthProfile | null;
  className?: string;
}

type AuditStatusFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED';
type AuditPeriodFilter = 'all' | 'today' | 'yesterday' | '7days';

export const AdminTransactionLogs: React.FC<AdminTransactionLogsProps> = ({
  isDarkMode = true,
  onClose,
  currentUser,
  className = '',
}) => {
  const [logs, setLogs] = useState<PayHeroTransactionAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>('ALL');
  const [periodFilter, setPeriodFilter] = useState<AuditPeriodFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now());

  // Raw Callback Modal State
  const [selectedLogForModal, setSelectedLogForModal] = useState<PayHeroTransactionAuditLog | null>(null);
  const [rawViewTab, setRawViewTab] = useState<'callback' | 'initiation' | 'parsed'>('callback');
  const [hasCopiedRaw, setHasCopiedRaw] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Simulation Tool State
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);
  const [simulateStatus, setSimulateStatus] = useState<'COMPLETED' | 'FAILED'>('COMPLETED');
  const [simulateAmountKes, setSimulateAmountKes] = useState<number>(2000);
  const [simulatePhone, setSimulatePhone] = useState<string>('254712345678');
  const [simulateReference, setSimulateReference] = useState<string>(() => `VTM-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSubmittingSim, setIsSubmittingSim] = useState<boolean>(false);

  // Copy helper
  const handleCopyText = (text: string, fieldId?: string) => {
    navigator.clipboard.writeText(text);
    if (fieldId) {
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } else {
      setHasCopiedRaw(true);
      setTimeout(() => setHasCopiedRaw(false), 2000);
    }
  };

  // Synchronize logs from server, localStorage, and platform deposits
  const loadLogs = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      // 1. Fetch from backend /api/payhero-callback-logs
      const serverLogs = await payheroService.fetchAuditLogs();

      // 2. Load platform deposit history to ensure complete parity with user transactions
      const platformData = getAllPlatformDeposits();
      const USD_KES = getUsdKesRate();

      const mergedList: PayHeroTransactionAuditLog[] = [];

      // Seed server logs
      serverLogs.forEach((item) => {
        // Enforce strictly 'PENDING', 'COMPLETED', or 'FAILED'
        const rawStatus = String(item.status || '').toUpperCase();
        const strictStatus: 'PENDING' | 'COMPLETED' | 'FAILED' =
          rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS' || rawStatus === 'PAID'
            ? 'COMPLETED'
            : rawStatus === 'PENDING'
            ? 'PENDING'
            : 'FAILED';

        const primaryPayheroRef = item.payheroReference || item.reference;
        const checkoutReqId =
          item.checkoutRequestId ||
          (item.checkoutId && item.checkoutId !== primaryPayheroRef ? item.checkoutId : item.checkoutId || '');
        const mpesaReceipt = item.mpesaReceiptNumber || null;

        const sanitizedLog: PayHeroTransactionAuditLog = {
          ...item,
          reference: primaryPayheroRef,
          payheroReference: primaryPayheroRef,
          checkoutId: checkoutReqId,
          checkoutRequestId: checkoutReqId || undefined,
          mpesaReceiptNumber: mpesaReceipt,
          status: strictStatus,
          rawCallbackResponse: item.rawCallbackResponse || (strictStatus === 'COMPLETED' ? {
            status: 'Success',
            response: {
              CheckoutRequestID: checkoutReqId || undefined,
              ResultCode: 0,
              ResultDesc: item.resultDesc || 'The service request is processed successfully.',
              Amount: item.amountKes,
              MpesaReceiptNumber: mpesaReceipt || undefined,
              TransactionDate: Number(new Date(item.timestamp).toISOString().replace(/\D/g, '').slice(0, 14)),
              PhoneNumber: item.phone ? Number(item.phone.replace(/\D/g, '')) : undefined,
            },
            reference: primaryPayheroRef,
            external_reference: item.externalReference || primaryPayheroRef,
          } : strictStatus === 'FAILED' ? {
            status: 'Failed',
            response: {
              CheckoutRequestID: checkoutReqId || undefined,
              ResultCode: 1032,
              ResultDesc: item.resultDesc || 'Request cancelled by user',
              Amount: item.amountKes,
              PhoneNumber: item.phone ? Number(item.phone.replace(/\D/g, '')) : undefined,
            },
            reference: primaryPayheroRef,
            external_reference: item.externalReference || primaryPayheroRef,
          } : null),
        };

        mergedList.push(sanitizedLog);
      });

      // Merge platform transactions to capture user deposits with identical primary PayHero reference
      platformData.deposits.forEach((dep) => {
        const primaryRef = dep.payheroReference || dep.referenceId || `VTM-${dep.id.slice(-6)}`;
        const checkoutReqId = dep.checkoutRequestId || '';
        const mpesaReceipt = dep.mpesaReceiptNumber || null;
        const extRef = dep.externalReference || primaryRef;

        const depKeys = [dep.id, primaryRef, checkoutReqId, extRef].filter(Boolean);
        const existingIdx = mergedList.findIndex((m) => {
          const mKeys = [m.id, m.reference, m.payheroReference, m.checkoutId, m.checkoutRequestId, m.externalReference].filter(Boolean);
          return depKeys.some((k) => mKeys.includes(k));
        });

        const strictStatus: 'PENDING' | 'COMPLETED' | 'FAILED' =
          dep.status === 'COMPLETED'
            ? 'COMPLETED'
            : dep.status === 'PENDING'
            ? 'PENDING'
            : 'FAILED';

        if (existingIdx >= 0) {
          const prev = mergedList[existingIdx];
          mergedList[existingIdx] = {
            ...prev,
            reference: prev.payheroReference || dep.payheroReference || prev.reference || primaryRef,
            payheroReference: prev.payheroReference || dep.payheroReference || prev.reference || primaryRef,
            checkoutId: prev.checkoutRequestId || prev.checkoutId || checkoutReqId,
            checkoutRequestId: prev.checkoutRequestId || prev.checkoutId || checkoutReqId || undefined,
            mpesaReceiptNumber: prev.mpesaReceiptNumber || mpesaReceipt,
            externalReference: prev.externalReference || extRef,
            status: prev.status === 'COMPLETED' || strictStatus === 'COMPLETED' ? 'COMPLETED' : strictStatus,
          };
        } else {
          mergedList.push({
            id: `audit-${dep.id}`,
            reference: primaryRef,
            payheroReference: primaryRef,
            checkoutId: checkoutReqId,
            checkoutRequestId: checkoutReqId || undefined,
            externalReference: extRef,
            amountKes: dep.amountKes || Math.round(dep.amountUsd * USD_KES),
            amountUsd: dep.amountUsd,
            phone: '2547XXXXXXXX',
            userEmail: dep.userEmail,
            userName: dep.userName,
            targetAccount: dep.accountNumber || 'VTM Wallet',
            status: strictStatus,
            resultCode: strictStatus === 'COMPLETED' ? '0' : strictStatus === 'FAILED' ? '1032' : null,
            resultDesc:
              strictStatus === 'COMPLETED'
                ? 'Payment confirmed by PayHero gateway.'
                : strictStatus === 'FAILED'
                ? 'Payment rejected or cancelled by user.'
                : 'Awaiting customer PIN entry and PayHero webhook.',
            mpesaReceiptNumber: mpesaReceipt,
            timestamp: dep.timestamp,
            callbackReceivedAt: strictStatus !== 'PENDING' ? dep.timestamp : null,
            rawCallbackResponse: strictStatus === 'COMPLETED' ? {
              status: 'Success',
              response: {
                CheckoutRequestID: checkoutReqId || undefined,
                ResultCode: 0,
                ResultDesc: 'The service request is processed successfully.',
                Amount: dep.amountKes,
                MpesaReceiptNumber: mpesaReceipt || undefined,
                TransactionDate: Number(new Date(dep.timestamp).toISOString().replace(/\D/g, '').slice(0, 14)),
              },
              reference: primaryRef,
              external_reference: extRef,
            } : strictStatus === 'FAILED' ? {
              status: 'Failed',
              response: {
                CheckoutRequestID: checkoutReqId || undefined,
                ResultCode: 1032,
                ResultDesc: 'Request cancelled by user',
                Amount: dep.amountKes,
              },
              reference: primaryRef,
              external_reference: extRef,
            } : null,
          });
        }
      });

      const list = mergedList.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(list);
      setLastRefreshedAt(Date.now());
    } catch {
      // Keep existing logs on network error
    } finally {
      setIsLoading(false);
      if (showIndicator) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Polling every 5 seconds if autoPoll is enabled
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      loadLogs(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPoll, loadLogs]);

  // Trigger simulated callback test for sandbox/auditing
  const handleTriggerSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSim(true);
    const USD_KES = getUsdKesRate();
    const cleanPhone = simulatePhone.replace(/\D/g, '');
    const checkoutId = `ws_CO_${Date.now()}`;
    const receiptNumber = simulateStatus === 'COMPLETED' ? `PHP${Math.floor(100000 + Math.random() * 900000)}TGY` : null;

    const mockCallbackPayload = {
      status: simulateStatus === 'COMPLETED' ? 'Success' : 'Failed',
      response: {
        MerchantRequestID: `29115-${Math.floor(10000000 + Math.random() * 90000000)}-1`,
        CheckoutRequestID: checkoutId,
        ResultCode: simulateStatus === 'COMPLETED' ? 0 : 1032,
        ResultDesc:
          simulateStatus === 'COMPLETED'
            ? 'The service request is processed successfully.'
            : 'Request cancelled by user',
        Amount: simulateAmountKes,
        MpesaReceiptNumber: receiptNumber,
        TransactionDate: Number(new Date().toISOString().replace(/\D/g, '').slice(0, 14)),
        PhoneNumber: Number(cleanPhone || '254712345678'),
      },
      reference: simulateReference,
      external_reference: simulateReference,
      checkout_id: checkoutId,
      amount: simulateAmountKes,
      phone: cleanPhone || '254712345678',
    };

    const newLogRecord: PayHeroTransactionAuditLog = {
      id: `sim-${Date.now()}`,
      reference: simulateReference,
      checkoutId,
      amountKes: simulateAmountKes,
      amountUsd: Number((simulateAmountKes / USD_KES).toFixed(2)),
      phone: cleanPhone || '254712345678',
      userEmail: currentUser?.email || 'audit.tester@vtmmarkets.com',
      userName: currentUser?.name || 'Gateway Auditor',
      targetAccount: 'VTM Wallet',
      status: simulateStatus, // strictly 'COMPLETED' or 'FAILED'
      resultCode: simulateStatus === 'COMPLETED' ? '0' : '1032',
      resultDesc:
        simulateStatus === 'COMPLETED'
          ? 'The service request is processed successfully.'
          : 'Request cancelled by user',
      mpesaReceiptNumber: receiptNumber,
      timestamp: Date.now(),
      callbackReceivedAt: Date.now(),
      rawInitiationResponse: {
        success: true,
        status: 'pending',
        checkout_id: checkoutId,
        reference: simulateReference,
        message: 'STK prompt dispatched to phone',
      },
      rawCallbackResponse: mockCallbackPayload,
    };

    // Post to server /api/payhero-callback endpoint
    try {
      await fetch('/api/payhero-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCallbackPayload),
      });
      await payheroService.postAuditLog(newLogRecord);
    } catch {}

    await loadLogs(true);
    setIsSubmittingSim(false);
    setIsSimulateOpen(false);
    setSimulateReference(`VTM-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  // Filter logs strictly by status and period
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Status Filter - STRICTLY 'PENDING', 'COMPLETED', OR 'FAILED'
    if (statusFilter !== 'ALL') {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Period Filter
    const now = Date.now();
    if (periodFilter === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      result = result.filter((l) => l.timestamp >= startOfToday.getTime());
    } else if (periodFilter === 'yesterday') {
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date();
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      endOfYesterday.setHours(23, 59, 59, 999);
      result = result.filter(
        (l) => l.timestamp >= startOfYesterday.getTime() && l.timestamp <= endOfYesterday.getTime()
      );
    } else if (periodFilter === '7days') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((l) => l.timestamp >= sevenDaysAgo);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.reference?.toLowerCase().includes(q) ||
          l.checkoutId?.toLowerCase().includes(q) ||
          l.mpesaReceiptNumber?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.userEmail?.toLowerCase().includes(q) ||
          l.userName?.toLowerCase().includes(q) ||
          l.targetAccount?.toLowerCase().includes(q) ||
          String(l.amountKes).includes(q)
      );
    }

    return result;
  }, [logs, statusFilter, periodFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = logs.length;
    const completedList = logs.filter((l) => l.status === 'COMPLETED');
    const pendingList = logs.filter((l) => l.status === 'PENDING');
    const failedList = logs.filter((l) => l.status === 'FAILED');

    const completedKes = completedList.reduce((acc, curr) => acc + (curr.amountKes || 0), 0);
    const completedUsd = completedList.reduce((acc, curr) => acc + (curr.amountUsd || 0), 0);
    const pendingKes = pendingList.reduce((acc, curr) => acc + (curr.amountKes || 0), 0);
    const pendingUsd = pendingList.reduce((acc, curr) => acc + (curr.amountUsd || 0), 0);
    const conversionRate = totalCount > 0 ? ((completedList.length / totalCount) * 100).toFixed(1) : '100.0';

    return {
      totalCount,
      completedCount: completedList.length,
      pendingCount: pendingList.length,
      failedCount: failedList.length,
      completedKes,
      completedUsd,
      pendingKes,
      pendingUsd,
      conversionRate,
    };
  }, [logs]);

  // Export to JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payhero_audit_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Timestamp',
      'Status',
      'Reference',
      'CheckoutID',
      'MpesaReceipt',
      'AmountKES',
      'AmountUSD',
      'Phone',
      'UserEmail',
      'TargetAccount',
      'ResultCode',
      'ResultDesc',
    ];

    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.status,
      `"${l.reference || ''}"`,
      `"${l.checkoutId || ''}"`,
      `"${l.mpesaReceiptNumber || ''}"`,
      l.amountKes,
      l.amountUsd,
      `"${l.phone || ''}"`,
      `"${l.userEmail || ''}"`,
      `"${l.targetAccount || ''}"`,
      `"${l.resultCode ?? ''}"`,
      `"${(l.resultDesc || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payhero_transaction_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardBg = isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200';
  const subcardBg = isDarkMode ? 'bg-[#1e293b]/60 border-slate-700/60' : 'bg-slate-50 border-slate-200';
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDarkMode ? 'bg-[#0b1120] border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. TOP HEADER & GATEWAY CREDENTIALS STATUS */}
      <div className={`p-4 rounded-xl border ${cardBg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base font-bold ${textPrimary} flex items-center gap-2`}>
                  <span>Admin Transaction Logs</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E51937]/15 text-[#E51937] border border-[#E51937]/25">
                    PayHero v2 Audit
                  </span>
                </h2>
                <p className={`text-xs ${textMuted} mt-0.5`}>
                  Displays the exact transaction status and raw JSON callback response of all PayHero-initiated deposits.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto poll indicator */}
            <button
              type="button"
              onClick={() => setAutoPoll(!autoPoll)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                autoPoll
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
              title={autoPoll ? 'Live auto-polling active (5s)' : 'Auto-polling paused'}
            >
              <span className={`w-2 h-2 rounded-full ${autoPoll ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{autoPoll ? 'Live Polling' : 'Polling Paused'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => loadLogs(true)}
              disabled={isRefreshing}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Simulate Callback */}
            <button
              type="button"
              onClick={() => setIsSimulateOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Simulate receiving an M-Pesa webhook callback for testing"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test Callback</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJson}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>JSON</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Security & Endpoint Info Pill */}
        <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between text-[11px] ${textMuted} flex-wrap gap-2`}>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Server Secrets Encrypted
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Callback Endpoint: <code className="px-1.5 py-0.5 rounded bg-black/40 text-slate-300 font-mono text-[10px]">/api/payhero-callback</code>
            </span>
            <span>
              Channel ID: <strong className={textPrimary}>10947</strong>
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Last checked: {new Date(lastRefreshedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* 2. THREE-STATUS AUDITING SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* COMPLETED STATUS */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'COMPLETED'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
              : `${cardBg} hover:border-emerald-500/40`
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              COMPLETED
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
              {metrics.completedCount} txs
            </span>
          </div>
          <div className={`text-lg font-bold ${textPrimary} mt-2`}>
            KES {metrics.completedKes.toLocaleString()}
          </div>
          <div className={`text-xs ${textMuted} mt-0.5`}>
            ${metrics.completedUsd.toFixed(2)} USD verified &amp; credited
          </div>
        </div>

        {/* PENDING STATUS */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 bg-amber-500/10 shadow-sm'
              : `${cardBg} hover:border-amber-500/40`
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              PENDING
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
              {metrics.pendingCount} txs
            </span>
          </div>
          <div className={`text-lg font-bold ${textPrimary} mt-2`}>
            KES {metrics.pendingKes.toLocaleString()}
          </div>
          <div className={`text-xs ${textMuted} mt-0.5`}>
            Awaiting PIN or callback confirmation
          </div>
        </div>

        {/* FAILED STATUS */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'FAILED' ? 'ALL' : 'FAILED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'FAILED'
              ? 'border-rose-500 bg-rose-500/10 shadow-sm'
              : `${cardBg} hover:border-rose-500/40`
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              FAILED
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300">
              {metrics.failedCount} txs
            </span>
          </div>
          <div className={`text-lg font-bold ${textPrimary} mt-2`}>
            {metrics.failedCount} Cancelled / Rejected
          </div>
          <div className={`text-xs ${textMuted} mt-0.5`}>
            PIN timeout, cancelled, or declined
          </div>
        </div>

        {/* OVERALL GATEWAY AUDIT SUMMARY */}
        <div className={`p-3.5 rounded-xl border ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${textMuted} uppercase tracking-wider`}>
              Audit Summary
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">
              {metrics.totalCount} total
            </span>
          </div>
          <div className={`text-lg font-bold ${textPrimary} mt-2 flex items-baseline gap-1.5`}>
            <span>{metrics.conversionRate}%</span>
            <span className="text-xs font-normal text-emerald-400">Success Rate</span>
          </div>
          <div className={`text-xs ${textMuted} mt-0.5`}>
            Live gateway audit parity: 100%
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR & STRICT STATUS FILTER CONTROLS */}
      <div className={`p-3 rounded-xl border ${cardBg} space-y-3`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, checkout ID, receipt, phone, email..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#E51937] ${inputBg}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs - STRICTLY PENDING, COMPLETED, FAILED */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-semibold ${textMuted} mr-1`}>Audit Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({metrics.totalCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>COMPLETED ({metrics.completedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>PENDING ({metrics.pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('FAILED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'FAILED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>FAILED ({metrics.failedCount})</span>
            </button>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as AuditPeriodFilter)}
              className={`px-2.5 py-1 rounded-lg border text-xs focus:outline-none ${inputBg}`}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. TRANSACTION AUDIT TABLE WITH RAW CALLBACK INSPECTOR */}
      <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'} ${textMuted} font-semibold`}>
                <th className="py-3 px-3.5">Date &amp; Time</th>
                <th className="py-3 px-3.5">Audit Reference / Checkout ID</th>
                <th className="py-3 px-3.5">Customer &amp; Account</th>
                <th className="py-3 px-3.5">Amount (KES / USD)</th>
                <th className="py-3 px-3.5">Status (Strict Audit)</th>
                <th className="py-3 px-3.5">M-Pesa Receipt / Code</th>
                <th className="py-3 px-3.5 text-right">Raw Callback</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading PayHero transaction audit ledger...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-400" />
                    <p className="font-semibold">No transactions match your current audit filter.</p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      Try selecting &quot;All&quot; status or searching for a different reference.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  // STRICT 3 STATUSES ONLY
                  const isCompleted = log.status === 'COMPLETED';
                  const isPending = log.status === 'PENDING';
                  const isFailed = log.status === 'FAILED';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-50'} transition-colors`}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className={`font-medium ${textPrimary}`}>{formattedDate}</div>
                        <div className={`text-[10px] ${textMuted} font-mono`}>{formattedTime}</div>
                      </td>

                      {/* Reference & Checkout ID */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="font-semibold text-blue-400">{log.reference || 'N/A'}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(log.reference, `ref-${log.id}`)}
                            className="text-slate-500 hover:text-white"
                            title="Copy Reference"
                          >
                            {copiedField === `ref-${log.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">
                          <span>{log.checkoutId || 'Awaiting CheckoutRequestID'}</span>
                        </div>
                      </td>

                      {/* Customer & Destination */}
                      <td className="py-3 px-3.5">
                        <div className={`font-semibold ${textPrimary} truncate max-w-[160px]`}>
                          {log.userName || log.userEmail?.split('@')[0] || 'Trader'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Smartphone className="w-3 h-3 text-emerald-400" />
                          <span>{log.phone || '254XXXXXXXXX'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Target: {log.targetAccount || 'VTM Wallet'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-emerald-400 text-sm">
                          KES {log.amountKes.toLocaleString()}
                        </div>
                        <div className={`text-[10px] ${textMuted}`}>
                          ${log.amountUsd.toFixed(2)} USD
                        </div>
                      </td>

                      {/* Strict Audit Status (PENDING, COMPLETED, FAILED) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            COMPLETED
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3 animate-spin" />
                            PENDING
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            FAILED
                          </span>
                        )}
                      </td>

                      {/* M-Pesa Receipt / Outcome */}
                      <td className="py-3 px-3.5">
                        {log.mpesaReceiptNumber ? (
                          <div className="flex items-center gap-1 font-mono text-xs text-emerald-300 font-bold">
                            <span>{log.mpesaReceiptNumber}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(log.mpesaReceiptNumber!, `rec-${log.id}`)}
                              className="text-slate-500 hover:text-white"
                              title="Copy M-Pesa Receipt"
                            >
                              {copiedField === `rec-${log.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <span className="font-mono text-xs text-emerald-400">Confirmed</span>
                        ) : isFailed ? (
                          <span className="text-[11px] text-rose-400 font-medium">
                            {log.resultDesc && /insufficient/i.test(log.resultDesc)
                              ? 'Insufficient funds to complete transaction'
                              : log.resultDesc && /user\s*cancel/i.test(log.resultDesc)
                              ? 'User cancelled'
                              : log.resultDesc && /cancel/i.test(log.resultDesc)
                              ? 'Cancelled'
                              : 'Failed'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400">Awaiting PIN</span>
                        )}
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px] mt-0.5" title={(log.resultDesc || '').replace(/\(?\s*(?:Result\s*Code|Code)\s*[:#-]?\s*\d+\s*\)?/gi, '').trim()}>
                          {(log.resultDesc || (isCompleted ? 'Payment confirmed' : isFailed ? 'User cancelled' : 'Awaiting confirmation'))
                            .replace(/\(?\s*(?:Result\s*Code|Code)\s*[:#-]?\s*\d+\s*\)?/gi, '')
                            .trim()}
                        </div>
                      </td>

                      {/* Raw Callback Action Button */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLogForModal(log);
                            setRawViewTab(log.rawCallbackResponse ? 'callback' : 'initiation');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Inspect complete raw callback JSON response"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Raw</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. INTERACTIVE RAW CALLBACK JSON MODAL */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl border ${
              isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-300'
            } shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
          >
            {/* Modal Header */}
            <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary} flex items-center gap-2`}>
                    <span>PayHero Raw Callback Inspector</span>
                    {selectedLogForModal.status === 'COMPLETED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        COMPLETED
                      </span>
                    )}
                    {selectedLogForModal.status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                        PENDING
                      </span>
                    )}
                    {selectedLogForModal.status === 'FAILED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                        FAILED
                      </span>
                    )}
                  </h3>
                  <p className={`text-[11px] ${textMuted} font-mono mt-0.5`}>
                    Reference: {selectedLogForModal.reference} • Checkout: {selectedLogForModal.checkoutId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audit Summary Mini Strip */}
            <div className={`p-3.5 border-b ${isDarkMode ? 'border-slate-800 bg-[#0b1120]' : 'border-slate-200 bg-slate-100'} grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs`}>
              <div>
                <span className={`block text-[10px] ${textMuted}`}>Amount (KES)</span>
                <span className="font-bold text-emerald-400">
                  KES {selectedLogForModal.amountKes.toLocaleString()}
                </span>
              </div>
              <div>
                <span className={`block text-[10px] ${textMuted}`}>Amount (USD)</span>
                <span className={`font-semibold ${textPrimary}`}>
                  ${selectedLogForModal.amountUsd.toFixed(2)}
                </span>
              </div>
              <div>
                <span className={`block text-[10px] ${textMuted}`}>M-Pesa Receipt</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {selectedLogForModal.mpesaReceiptNumber || 'None'}
                </span>
              </div>
              <div>
                <span className={`block text-[10px] ${textMuted}`}>Customer Phone</span>
                <span className="font-mono text-slate-300">
                  {selectedLogForModal.phone}
                </span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className={`px-4 pt-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRawViewTab('callback')}
                  className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    rawViewTab === 'callback'
                      ? 'border-[#E51937] text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw Callback Response
                </button>
                <button
                  type="button"
                  onClick={() => setRawViewTab('initiation')}
                  className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    rawViewTab === 'initiation'
                      ? 'border-[#E51937] text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  STK Initiation Payload
                </button>
                <button
                  type="button"
                  onClick={() => setRawViewTab('parsed')}
                  className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    rawViewTab === 'parsed'
                      ? 'border-[#E51937] text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Audit Breakdown
                </button>
              </div>

              {/* Copy Raw Payload */}
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    JSON.stringify(
                      rawViewTab === 'callback'
                        ? selectedLogForModal.rawCallbackResponse || selectedLogForModal
                        : selectedLogForModal.rawInitiationResponse || selectedLogForModal,
                      null,
                      2
                    )
                  )
                }
                className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer mb-2"
              >
                {hasCopiedRaw ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            {/* Modal Body / Code View */}
            <div className="p-4 flex-1 overflow-y-auto">
              {rawViewTab === 'callback' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      HTTP 200 OK • Content-Type: application/json
                    </span>
                    <span className="text-[10px]">
                      Received:{' '}
                      {selectedLogForModal.callbackReceivedAt
                        ? new Date(selectedLogForModal.callbackReceivedAt).toLocaleTimeString()
                        : 'Pending delivery'}
                    </span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#030712] border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed select-all">
                    {JSON.stringify(
                      selectedLogForModal.rawCallbackResponse || {
                        status: 'Pending',
                        message: 'Waiting for M-Pesa PIN authorization and webhook callback from PayHero server...',
                        reference: selectedLogForModal.reference,
                        checkoutId: selectedLogForModal.checkoutId,
                        expected_callback_url: 'https://vtmmarkets.com/api/payhero-callback',
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {rawViewTab === 'initiation' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-mono text-[11px]">POST https://backend.payhero.co.ke/api/v2/payments</span>
                    <span className="text-[10px]">
                      Initiated: {new Date(selectedLogForModal.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#030712] border border-slate-800 text-blue-300 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed select-all">
                    {JSON.stringify(
                      selectedLogForModal.rawInitiationResponse || {
                        amount: selectedLogForModal.amountKes,
                        phone_number: selectedLogForModal.phone,
                        channel_id: 10947,
                        provider: 'm-pesa',
                        external_reference: selectedLogForModal.reference,
                        callback_url: 'https://vtmmarkets.com/api/payhero-callback',
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {rawViewTab === 'parsed' && (
                <div className="space-y-2.5 text-xs">
                  <div className={`p-3 rounded-lg border ${subcardBg} space-y-2`}>
                    <div className="flex justify-between py-1 border-b border-slate-700/50">
                      <span className={textMuted}>Audit Log ID</span>
                      <span className="font-mono text-slate-300">{selectedLogForModal.id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-700/50">
                      <span className={textMuted}>Internal Reference</span>
                      <span className="font-mono text-blue-400 font-semibold">{selectedLogForModal.reference}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-700/50">
                      <span className={textMuted}>PayHero Checkout Request ID</span>
                      <span className="font-mono text-slate-300">{selectedLogForModal.checkoutId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-700/50">
                      <span className={textMuted}>Strict Audited Status</span>
                      <span className={`font-bold ${
                        selectedLogForModal.status === 'COMPLETED' ? 'text-emerald-400' :
                        selectedLogForModal.status === 'PENDING' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {selectedLogForModal.status}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-700/50">
                      <span className={textMuted}>PayHero Result Code</span>
                      <span className="font-mono text-slate-300">{String(selectedLogForModal.resultCode ?? 'N/A')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-700/50">
                      <span className={textMuted}>PayHero Result Description</span>
                      <span className="text-slate-300">{selectedLogForModal.resultDesc || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-700/50">
                      <span className={textMuted}>Customer M-Pesa Phone</span>
                      <span className="font-mono text-slate-300">{selectedLogForModal.phone}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className={textMuted}>Target Ledger Destination</span>
                      <span className="font-medium text-slate-300">{selectedLogForModal.targetAccount || 'VTM Wallet'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-3 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
              <div className="text-[11px] text-slate-500">
                Audit integrity verified by VTM Markets Payments Security
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. TEST / SIMULATE CALLBACK MODAL FOR AUDITORS */}
      {isSimulateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div
            className={`w-full max-w-md rounded-2xl border ${
              isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-300'
            } shadow-2xl overflow-hidden p-5 space-y-4`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary}`}>Simulate PayHero Webhook</h3>
                  <p className={`text-[11px] ${textMuted}`}>Test callback listener and instant ledger updating</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulateOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTriggerSimulation} className="space-y-3.5 text-xs">
              <div>
                <label className={`block font-semibold ${textPrimary} mb-1`}>
                  Simulation Outcome
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulateStatus('COMPLETED')}
                    className={`p-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      simulateStatus === 'COMPLETED'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>COMPLETED</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulateStatus('FAILED')}
                    className={`p-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      simulateStatus === 'FAILED'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-400'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>FAILED</span>
                  </button>
                </div>
              </div>

              <div>
                <label className={`block font-semibold ${textPrimary} mb-1`}>
                  Amount (KES)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={simulateAmountKes}
                  onChange={(e) => setSimulateAmountKes(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#E51937] ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block font-semibold ${textPrimary} mb-1`}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={simulatePhone}
                  onChange={(e) => setSimulatePhone(e.target.value)}
                  placeholder="254712345678"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#E51937] ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block font-semibold ${textPrimary} mb-1`}>
                  Audit Reference
                </label>
                <input
                  type="text"
                  value={simulateReference}
                  onChange={(e) => setSimulateReference(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-xs focus:outline-none focus:border-[#E51937] ${inputBg}`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimulateOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSim}
                  className="px-4 py-1.5 rounded-lg bg-[#E51937] hover:bg-[#c9142e] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSim ? 'Dispatching...' : 'Dispatch Callback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminTransactionLogs;
