/**
 * PayHero Kenya M-Pesa STK Push Gateway Service
 * Official API: https://backend.payhero.co.ke/api/v2/payments
 */

export interface MpesaPaymentResponse {
  success: boolean;
  message: string;
  /** Primary payment transaction reference returned by PayHero (`reference`) */
  reference?: string;
  payheroReference?: string;
  /** M-PESA Daraja / PayHero CheckoutRequestID (`CheckoutRequestID`) stored separately */
  checkoutRequestId?: string;
  checkoutId?: string;
  /** Merchant external reference (`VTM-...`) stored separately */
  externalReference?: string;
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
  /** Primary PayHero transaction reference */
  reference?: string;
  payheroReference?: string;
  /** Separate CheckoutRequestID */
  checkoutRequestId?: string;
  checkoutId?: string;
  /** Separate MpesaReceiptNumber */
  mpesaReceiptNumber?: string;
  /** Separate merchant external reference */
  externalReference?: string;
  resultCode?: string;
  resultDesc?: string;
  message?: string;
  cancelledAt?: number | string;
  cancelledAtFormatted?: string;
  outcome?: 'COMPLETED' | 'CANCELLED' | 'INSUFFICIENT_FUNDS' | 'TIMED_OUT' | 'FAILED';
  friendlyTitle?: string;
  isDelayed?: boolean;
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
  const externalReference = req.accountReference || req.reference || `VTM-${Date.now()}`;

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
    reference: externalReference,
    external_reference: externalReference,
    accountReference: externalReference,
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

  // Strictly extract PayHero's primary `reference` vs `CheckoutRequestID` vs `external_reference`
  const rawPayheroRef = String(
    data.payhero_reference ||
      data.payheroReference ||
      data.raw?.reference ||
      data.raw?.transaction_reference ||
      data.reference ||
      ''
  ).trim();
  const rawCheckoutRequestId = String(
    data.CheckoutRequestID ||
      data.checkout_request_id ||
      data.checkoutRequestId ||
      data.raw?.CheckoutRequestID ||
      data.raw?.checkout_request_id ||
      data.checkout_id ||
      data.checkoutId ||
      ''
  ).trim();

  // Primary payment transaction reference is PayHero's `reference` (or externalReference if PayHero didn't return one yet)
  const primaryReference = rawPayheroRef || externalReference;
  const checkoutRequestId = rawCheckoutRequestId;

  const isAccepted =
    httpOk &&
    (data.success === true ||
      data.status === 'success' ||
      data.status === 'pending' ||
      data.status === 'QUEUED' ||
      Boolean(rawPayheroRef || rawCheckoutRequestId));

  if (isAccepted) {
    return {
      success: true,
      message: data.message || 'STK Push sent to your Safaricom phone. Please enter your M-Pesa PIN.',
      reference: primaryReference,
      payheroReference: primaryReference,
      checkoutRequestId: checkoutRequestId || undefined,
      checkoutId: checkoutRequestId || primaryReference,
      externalReference,
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
  /** Primary PayHero transaction reference */
  reference: string;
  payheroReference?: string;
  /** Separate CheckoutRequestID */
  checkoutId: string;
  checkoutRequestId?: string;
  /** Separate external reference */
  externalReference?: string;
  amountKes: number;
  amountUsd: number;
  phone: string;
  userEmail?: string;
  userName?: string;
  targetAccount?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED'; // STRICTLY ONLY 'PENDING', 'COMPLETED', AND 'FAILED'
  resultCode?: string | number | null;
  resultDesc?: string | null;
  /** Separate MpesaReceiptNumber */
  mpesaReceiptNumber?: string | null;
  timestamp: number;
  callbackReceivedAt?: number | null;
  rawCallbackResponse?: any;
  rawInitiationResponse?: any;
}

const STORAGE_KEY_AUDIT_LOGS = 'vtm_payhero_audit_logs';

export function sanitizeUserPayHeroMessage(
  rawDesc?: string | null,
  resultCode?: string | number | null,
  isFailed?: boolean
): string {
  const codeStr = resultCode !== undefined && resultCode !== null ? String(resultCode).trim() : '';
  const cleaned = String(rawDesc || '')
    .replace(/\(?\s*Result\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
    .replace(/\(?\s*Error\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
    .replace(/\(?\s*Status\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
    .replace(/\(?\s*Code\s*[:#-]?\s*\d+\s*\)?/gi, '')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (isFailed) {
    if (codeStr === '1' || /insufficient|funds|balance/i.test(cleaned)) {
      return 'Insufficient funds';
    }
    if (/no\s*response|cannot\s*be\s*reached|unreachable|did\s*not\s*respond/i.test(cleaned)) {
      return 'No response from user';
    }
    if (codeStr === '1037' || /timeout|timed?\s*out|expired/i.test(cleaned)) {
      return 'Timed out';
    }
    if (codeStr === '1032' || /cancel/i.test(cleaned)) {
      return 'Cancelled';
    }
    return cleaned || 'Failed';
  }

  return cleaned;
}

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
        (log.payheroReference && (l.payheroReference === log.payheroReference || l.reference === log.payheroReference)) ||
        (log.checkoutId && l.checkoutId === log.checkoutId) ||
        (log.externalReference && (l.externalReference === log.externalReference || l.reference === log.externalReference))
    );
    if (existingIdx >= 0) {
      logs[existingIdx] = {
        ...logs[existingIdx],
        ...log,
        reference: log.payheroReference || log.reference || logs[existingIdx].reference,
        payheroReference: log.payheroReference || log.reference || logs[existingIdx].payheroReference,
        checkoutId: log.checkoutRequestId || log.checkoutId || logs[existingIdx].checkoutId,
        checkoutRequestId: log.checkoutRequestId || log.checkoutId || logs[existingIdx].checkoutRequestId,
        mpesaReceiptNumber: log.mpesaReceiptNumber ?? logs[existingIdx].mpesaReceiptNumber ?? null,
      };
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
        const local = getLocalPayHeroAuditLogs();
        const merged: PayHeroTransactionAuditLog[] = [...data.logs];
        local.forEach((l: PayHeroTransactionAuditLog) => {
          const exists = merged.some(
            (m) =>
              (l.id && m.id === l.id) ||
              (l.reference && m.reference === l.reference) ||
              (l.payheroReference && (m.payheroReference === l.payheroReference || m.reference === l.payheroReference)) ||
              (l.checkoutId && m.checkoutId === l.checkoutId) ||
              (l.externalReference && (l.externalReference === l.externalReference || m.reference === l.externalReference))
          );
          if (!exists) merged.push(l);
        });
        return merged.sort((a, b) => b.timestamp - a.timestamp);
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
  primaryReferenceOrCheckoutId: string,
  extra?: {
    reference?: string;
    payheroReference?: string;
    checkoutRequestId?: string;
    externalReference?: string;
    startedAt?: number;
  }
): Promise<PayHeroStatusResponse> {
  const payheroRef = extra?.payheroReference || extra?.reference || primaryReferenceOrCheckoutId;
  const checkoutReqId = extra?.checkoutRequestId || primaryReferenceOrCheckoutId;
  const extRef = extra?.externalReference || extra?.reference;

  const payload = {
    action: 'payhero-status',
    reference: payheroRef,
    payhero_reference: payheroRef,
    checkout_request_id: checkoutReqId,
    CheckoutRequestID: checkoutReqId,
    checkout_id: checkoutReqId || payheroRef,
    checkoutid: checkoutReqId || payheroRef,
    external_reference: extRef,
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
      const resultCode = data.resultCode !== undefined && data.resultCode !== null ? String(data.resultCode) : undefined;
      const rawDesc = data.resultDesc || data.message || '';
      const resultDesc = sanitizeUserPayHeroMessage(rawDesc, resultCode, Boolean(data.failed));
      let outcome = data.outcome;
      let friendlyTitle = data.friendlyTitle;

      if (data.confirmed) {
        outcome = 'COMPLETED';
        friendlyTitle = 'Payment successful';
      } else if (data.failed) {
        if (resultCode === '1' || /insufficient|balance|funds/i.test(resultDesc)) {
          outcome = 'INSUFFICIENT_FUNDS';
          friendlyTitle = 'Insufficient funds';
        } else if (/no\s*response|cannot\s*be\s*reached|unreachable|did\s*not\s*respond/i.test(resultDesc)) {
          outcome = 'NO_RESPONSE';
          friendlyTitle = 'No response from user';
        } else if (resultCode === '1037' || /timeout|timed?\s*out|expired/i.test(resultDesc)) {
          outcome = 'TIMED_OUT';
          friendlyTitle = 'Timed out';
        } else if (resultCode === '1032' || /cancel/i.test(resultDesc)) {
          outcome = 'CANCELLED';
          friendlyTitle = 'Cancelled';
        } else {
          outcome = 'FAILED';
          friendlyTitle = 'Failed';
        }
      }

      const resolvedPayheroRef =
        data.payheroReference ||
        data.payhero_reference ||
        data.reference ||
        data.data?.payhero_reference ||
        data.data?.reference ||
        payheroRef;
      const resolvedCheckoutRequestId =
        data.checkoutRequestId ||
        data.checkout_request_id ||
        data.CheckoutRequestID ||
        data.data?.CheckoutRequestID ||
        data.data?.checkout_request_id ||
        extra?.checkoutRequestId ||
        '';
      const resolvedReceiptNumber =
        data.mpesaReceiptNumber ||
        data.data?.MpesaReceiptNumber ||
        data.data?.mpesa_receipt_number ||
        undefined;
      const resolvedExternalRef =
        data.externalReference ||
        data.external_reference ||
        data.data?.external_reference ||
        extRef;

      return {
        success: Boolean(data.success),
        confirmed: Boolean(data.confirmed),
        pending: Boolean(data.pending),
        failed: Boolean(data.failed),
        reference: resolvedPayheroRef,
        payheroReference: resolvedPayheroRef,
        checkoutRequestId: resolvedCheckoutRequestId || undefined,
        checkoutId: resolvedCheckoutRequestId || undefined,
        mpesaReceiptNumber: resolvedReceiptNumber,
        externalReference: resolvedExternalRef,
        resultCode,
        resultDesc,
        cancelledAt: data.cancelledAt,
        cancelledAtFormatted: data.cancelledAtFormatted,
        outcome,
        friendlyTitle,
        isDelayed: Boolean(data.isDelayed),
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
    reference: payheroRef,
    payheroReference: payheroRef,
    checkoutRequestId: extra?.checkoutRequestId,
    externalReference: extRef,
    resultDesc: 'Waiting for confirmation from your phone...',
  };
}

export async function cancelStkPaymentStatus(
  checkoutId: string,
  reference?: string,
  payheroReference?: string
): Promise<PayHeroStatusResponse> {
  const cancelTimestamp = Date.now();
  const payload = {
    checkout_id: checkoutId,
    checkoutid: checkoutId,
    checkout_request_id: checkoutId,
    reference: payheroReference || reference,
    payhero_reference: payheroReference || reference,
    external_reference: reference,
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
      const cleanDesc = sanitizeUserPayHeroMessage(
        data.resultDesc || 'User cancelled',
        data.resultCode || '1032',
        true
      );
      return {
        success: false,
        confirmed: false,
        pending: false,
        failed: true,
        reference: payheroReference || reference,
        payheroReference: payheroReference || reference,
        checkoutRequestId: checkoutId,
        checkoutId,
        externalReference: reference,
        resultCode: data.resultCode || '1032',
        resultDesc: cleanDesc,
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
    reference: payheroReference || reference,
    payheroReference: payheroReference || reference,
    checkoutRequestId: checkoutId,
    checkoutId,
    externalReference: reference,
    resultCode: '1032',
    resultDesc: 'User cancelled',
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


