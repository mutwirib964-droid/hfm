/**
 * PayHero Kenya M-Pesa STK Push Gateway Service
 * Official API: https://backend.payhero.co.ke/api/v2/payments
 */

export interface MpesaPaymentResponse {
  success: boolean;
  message: string;
  checkoutId?: string;
  reference?: string;
  amountKes?: number;
  amountUsd?: number;
  formattedPhone?: string;
  raw?: any;
}

export interface PayHeroStkRequest {
  amountKes: number;
  amountUsd: number;
  phone: string;
  reference?: string;
  accountReference?: string;
  targetAccount?: string;
  userEmail?: string;
  accountNumber?: string;
}

export interface PayHeroStatusResponse {
  success: boolean;
  confirmed: boolean;
  pending: boolean;
  failed: boolean;
  resultCode?: string;
  resultDesc?: string;
  message?: string;
  mpesaReceiptNumber?: string;
  cancelledAt?: number | string;
  cancelledAtFormatted?: string;
  data?: any;
  raw?: any;
}

export const WELL_KNOWN_AFRICAN_BANKS = [
  { id: 'equity', name: 'Equity Bank Kenya', shortName: 'Equity Bank', paybill: '247247', country: 'Kenya' },
  { id: 'kcb', name: 'KCB Bank Kenya', shortName: 'KCB Bank', paybill: '522522', country: 'Kenya' },
  { id: 'coop', name: 'Co-operative Bank of Kenya', shortName: 'Co-op Bank', paybill: '400200', country: 'Kenya' },
  { id: 'ncba', name: 'NCBA Bank Kenya', shortName: 'NCBA Bank', paybill: '880100', country: 'Kenya' },
  { id: 'absa', name: 'Absa Bank Kenya', shortName: 'Absa Bank', paybill: '303030', country: 'Kenya' },
  { id: 'stanbic', name: 'Stanbic Bank Kenya', shortName: 'Stanbic Bank', paybill: '600100', country: 'Kenya' },
  { id: 'stanchart', name: 'Standard Chartered Kenya', shortName: 'Standard Chartered', paybill: '329329', country: 'Kenya' },
  { id: 'im', name: 'I&M Bank Limited', shortName: 'I&M Bank', paybill: '542542', country: 'Kenya' },
  { id: 'dtb', name: 'Diamond Trust Bank (DTB)', shortName: 'DTB Bank', paybill: '516600', country: 'Kenya' },
  { id: 'ecobank', name: 'Ecobank Pan-African', shortName: 'Ecobank', paybill: '700201', country: 'Pan-Africa' },
  { id: 'uba', name: 'United Bank for Africa (UBA)', shortName: 'UBA Bank', paybill: '559900', country: 'Pan-Africa' },
];

const STORAGE_KEY_USD_KES_RATE = 'vtm_payhero_usd_kes_rate';
const STORAGE_KEY_MERCHANT_NAME = 'vtm_payhero_merchant_name';

export let PAYHERO_MERCHANT_NAME: string = 'VTMMARKETS';
export let USD_KES_RATE: number = 129.56;
export let USD_KES_WITHDRAW_RATE: number = 126.58;

let runtimeSecretsCache = {
  usdKesRate: 129.56,
  usdKesWithdrawRate: 126.58,
  merchantName: 'VTMMARKETS',
  isConfigured: true,
  loaded: true,
};

export async function syncRuntimePayHeroSecrets(): Promise<{
  usdKesRate: number;
  merchantName: string;
  isConfigured: boolean;
}> {
  return {
    usdKesRate: USD_KES_RATE,
    merchantName: 'VTMMARKETS',
    isConfigured: true,
  };
}

export function getUsdKesRate(): number {
  return USD_KES_RATE;
}

export function getUsdKesWithdrawRate(): number {
  return USD_KES_WITHDRAW_RATE;
}

export function getPayHeroMerchantName(): string {
  return 'VTMMARKETS';
}

export function getPayHeroConfig() {
  return {
    usdKesRate: USD_KES_RATE,
    merchantName: 'VTMMARKETS',
    isConfigured: true,
  };
}

export function savePayHeroConfig(apiKey?: string, accountId?: string, usdKesRate?: number) {
  if (usdKesRate && usdKesRate > 0) {
    USD_KES_RATE = usdKesRate;
  }
}

export function formatSafaricomPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('07') || digits.startsWith('01')) {
    return '254' + digits.slice(1);
  }
  if (digits.startsWith('7') || digits.startsWith('1')) {
    return '254' + digits;
  }
  if (digits.startsWith('254')) {
    return digits;
  }
  return digits;
}

export function isValidSafaricomPhone(phone: string): boolean {
  const formatted = formatSafaricomPhone(phone);
  return /^254(7|1)\d{8}$/.test(formatted);
}

export function formatKenyanPhone(phone: string): {
  valid: boolean;
  formatted: string;
  display: string;
} {
  const formatted = formatSafaricomPhone(phone);
  const valid = /^254(7|1)\d{8}$/.test(formatted);
  const display = valid ? `+${formatted}` : phone.trim();
  return { valid, formatted, display };
}

export function usdToKes(usdAmount: number): number {
  return Math.max(1, Math.round(usdAmount * USD_KES_RATE));
}

export const convertUsdToKes = usdToKes;

export function kesToUsd(kesAmount: number): number {
  return Number((kesAmount / USD_KES_RATE).toFixed(2));
}

export const convertKesToUsd = kesToUsd;

export async function initiateStkPush(req: PayHeroStkRequest): Promise<MpesaPaymentResponse> {
  const msisdn = formatSafaricomPhone(req.phone);
  const reference = req.reference || req.accountReference || `VTM-${Date.now()}`;

  if (!isValidSafaricomPhone(msisdn)) {
    return {
      success: false,
      message: 'Please enter a valid Safaricom M-Pesa phone number (e.g., 0712 345 678 or 254712345678).',
    };
  }

  const payload = {
    action: 'payhero-stk',
    amount: Math.max(1, Math.round(req.amountKes)),
    phone_number: msisdn,
    phone: msisdn,
    msisdn,
    reference,
    accountReference: req.accountReference,
    targetAccount: req.targetAccount,
    userEmail: req.userEmail,
  };

  let data: any = null;
  let httpOk = false;

  try {
    const res = await fetch('/api/payhero-stk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    try {
      data = JSON.parse(text);
      httpOk = res.ok;
    } catch {}
  } catch {}

  if (!data) {
    return {
      success: false,
      message: 'Transaction cannot be completed right now. Please try again later.',
    };
  }

  const checkoutId = data.checkout_id || data.CheckoutRequestID || data.id || reference;
  const isAccepted =
    httpOk &&
    (data.success === true ||
      data.status === 'success' ||
      data.status === 'pending' ||
      Boolean(checkoutId));

  if (isAccepted) {
    return {
      success: true,
      message: data.message || 'STK Push sent to your Safaricom phone. Please enter your M-Pesa PIN.',
      checkoutId,
      reference,
      amountKes: req.amountKes,
      amountUsd: req.amountUsd,
      formattedPhone: msisdn,
      raw: data,
    };
  }

  return {
    success: false,
    message: data.message || data.error || 'Failed to initiate M-Pesa STK Push. Please check your phone number.',
    raw: data,
  };
}

export interface PayHeroTransactionAuditLog {
  id: string;
  reference: string;
  checkoutId: string;
  amountKes: number;
  amountUsd: number;
  phone: string;
  userEmail?: string;
  userName?: string;
  targetAccount?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED'; // STRICTLY ONLY 'PENDING', 'COMPLETED', AND 'FAILED'
  resultCode?: string | number | null;
  resultDesc?: string | null;
  mpesaReceiptNumber?: string | null;
  timestamp: number;
  callbackReceivedAt?: number | null;
  rawCallbackResponse?: any;
  rawInitiationResponse?: any;
}

const STORAGE_KEY_AUDIT_LOGS = 'vtm_payhero_audit_logs';

export function getLocalPayHeroAuditLogs(): PayHeroTransactionAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalPayHeroAuditLog(log: PayHeroTransactionAuditLog): void {
  try {
    const logs = getLocalPayHeroAuditLogs();
    const existingIdx = logs.findIndex(
      (l) =>
        (log.id && l.id === log.id) ||
        (log.reference && l.reference === log.reference) ||
        (log.checkoutId && l.checkoutId === log.checkoutId)
    );
    if (existingIdx >= 0) {
      logs[existingIdx] = { ...logs[existingIdx], ...log };
    } else {
      logs.unshift(log);
    }
    localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
  } catch {}
}

export async function fetchPayHeroAuditLogs(): Promise<PayHeroTransactionAuditLog[]> {
  try {
    const res = await fetch('/api/payhero-callback-logs', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        // Merge with local logs
        const local = getLocalPayHeroAuditLogs();
        const map = new Map<string, PayHeroTransactionAuditLog>();
        data.logs.forEach((l: PayHeroTransactionAuditLog) => {
          const key = l.reference || l.checkoutId || l.id;
          if (key) map.set(key, l);
        });
        local.forEach((l: PayHeroTransactionAuditLog) => {
          const key = l.reference || l.checkoutId || l.id;
          if (key && !map.has(key)) map.set(key, l);
        });
        return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch {}
  return getLocalPayHeroAuditLogs();
}

export async function postAuditLogToBackend(log: PayHeroTransactionAuditLog): Promise<void> {
  saveLocalPayHeroAuditLog(log);
  try {
    await fetch('/api/payhero-callback-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log }),
    });
  } catch {}
}

export async function checkStkPaymentStatus(
  checkoutId: string,
  extra?: { reference?: string; startedAt?: number }
): Promise<PayHeroStatusResponse> {
  const payload = {
    action: 'payhero-status',
    checkout_id: checkoutId,
    checkoutid: checkoutId,
    reference: extra?.reference,
    startedAt: extra?.startedAt,
  };

  try {
    const res = await fetch('/api/payhero-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: Boolean(data.success),
        confirmed: Boolean(data.confirmed),
        pending: Boolean(data.pending),
        failed: Boolean(data.failed),
        resultCode: data.resultCode !== undefined ? String(data.resultCode) : undefined,
        resultDesc: data.resultDesc || data.message,
        mpesaReceiptNumber: data.mpesaReceiptNumber,
        cancelledAt: data.cancelledAt,
        cancelledAtFormatted: data.cancelledAtFormatted,
        data: data.data || data,
        raw: data,
      };
    }
  } catch {}

  return {
    success: false,
    confirmed: false,
    pending: true,
    failed: false,
    resultDesc: 'Waiting for M-Pesa confirmation callback...',
  };
}

export async function cancelStkPaymentStatus(
  checkoutId: string,
  reference?: string
): Promise<PayHeroStatusResponse> {
  const cancelTimestamp = Date.now();
  const payload = {
    checkout_id: checkoutId,
    checkoutid: checkoutId,
    reference,
    action: 'cancel',
    cancelled: true,
    cancelledAt: cancelTimestamp,
  };

  try {
    const res = await fetch('/api/payhero-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: false,
        confirmed: false,
        pending: false,
        failed: true,
        resultCode: data.resultCode || '1032',
        resultDesc: data.resultDesc || 'Request cancelled by user',
        cancelledAt: data.cancelledAt || cancelTimestamp,
        cancelledAtFormatted: data.cancelledAtFormatted || new Date(cancelTimestamp).toLocaleTimeString(),
        data: data.data || data,
        raw: data,
      };
    }
  } catch {}

  return {
    success: false,
    confirmed: false,
    pending: false,
    failed: true,
    resultCode: '1032',
    resultDesc: 'Request cancelled by user',
    cancelledAt: cancelTimestamp,
    cancelledAtFormatted: new Date(cancelTimestamp).toLocaleTimeString(),
  };
}

export const payheroService = {
  initiateStkPush,
  queryTransactionStatus: checkStkPaymentStatus,
  checkStkPaymentStatus,
  cancelDepositStatus: cancelStkPaymentStatus,
  cancelStkPaymentStatus,
  syncSecrets: syncRuntimePayHeroSecrets,
  getConfig: getPayHeroConfig,
  saveConfig: savePayHeroConfig,
  getUsdKesRate,
  fetchAuditLogs: fetchPayHeroAuditLogs,
  saveAuditLog: saveLocalPayHeroAuditLog,
  postAuditLog: postAuditLogToBackend,
};


