/**
 * Hashback Kenya M-Pesa STK Push Gateway Service
 * Official API: https://api.hashback.co.ke
 *
 * All credentials (HASHBACK_ACCOUNT_ID, HASHBACK_API_KEY, USD_KES_RATE) are loaded
 * dynamically from environment Secrets and saved configuration—never hardcoded in source code.
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

export interface HashbackStkRequest {
  amountKes: number;
  amountUsd: number;
  phone: string;
  reference?: string;
  accountReference?: string;
  targetAccount?: string;
  userEmail?: string;
  accountNumber?: string;
}

export interface HashbackStatusResponse {
  success: boolean;
  confirmed: boolean;
  pending: boolean;
  failed: boolean;
  resultCode?: string;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
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

const STORAGE_KEY_USD_KES_RATE = 'vtm_hashback_usd_kes_rate';
const STORAGE_KEY_MERCHANT_NAME = 'vtm_hashback_merchant_name';

// Live mutable exports hydrated from `/api/hashback-config` (sensitive credentials remain strictly server-side)
export let HASHBACK_MERCHANT_NAME: string = 'HASHBACK PAYMENT';
export let USD_KES_RATE: number =
  Number(import.meta.env.VITE_USD_KES_RATE) > 0 ? Number(import.meta.env.VITE_USD_KES_RATE) : 125.56;
export let USD_KES_WITHDRAW_RATE: number = USD_KES_RATE;

let runtimeSecretsCache: {
  usdKesRate: number;
  merchantName: string;
  isConfigured: boolean;
  loaded: boolean;
} = {
  usdKesRate: USD_KES_RATE,
  merchantName: '',
  isConfigured: false,
  loaded: false,
};

/**
 * Fetches live non-sensitive configuration from `/api/hashback-config` so changes to
 * HASHBACK_ACCOUNT_ID, HASHBACK_API_KEY, or USD_KES_RATE take effect immediately
 * while keeping sensitive credentials strictly on the server.
 */
export async function syncRuntimeHashbackSecrets(): Promise<{
  usdKesRate: number;
  merchantName: string;
  isConfigured: boolean;
}> {
  try {
    // Clean up any legacy sensitive keys in localStorage
    localStorage.removeItem('vtm_hashback_api_key');
    localStorage.removeItem('vtm_hashback_account_id');
  } catch {
    // ignore storage errors
  }

  try {
    const res = await fetch('/api/hashback-config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Number(data.usdKesRate) > 0) {
        runtimeSecretsCache.usdKesRate = Number(data.usdKesRate);
        USD_KES_RATE = runtimeSecretsCache.usdKesRate;
        USD_KES_WITHDRAW_RATE = runtimeSecretsCache.usdKesRate;
      }
      if (data.merchantName) {
        runtimeSecretsCache.merchantName = String(data.merchantName).trim();
        HASHBACK_MERCHANT_NAME = runtimeSecretsCache.merchantName;
        try {
          localStorage.setItem(STORAGE_KEY_MERCHANT_NAME, runtimeSecretsCache.merchantName);
        } catch {
          // ignore
        }
      }
      runtimeSecretsCache.isConfigured = Boolean(data.configured);
      runtimeSecretsCache.loaded = true;
    }
  } catch {
    // Fallback to cached values
  }
  return getHashbackConfig();
}

// Automatically hydrate on module load in browser
if (typeof window !== 'undefined') {
  syncRuntimeHashbackSecrets().catch(() => {});
}

export function getUsdKesRate(): number {
  if (runtimeSecretsCache.usdKesRate > 0) {
    USD_KES_RATE = runtimeSecretsCache.usdKesRate;
    USD_KES_WITHDRAW_RATE = runtimeSecretsCache.usdKesRate;
    return runtimeSecretsCache.usdKesRate;
  }
  const envRate = Number(import.meta.env.VITE_USD_KES_RATE);
  if (!Number.isNaN(envRate) && envRate > 0) {
    USD_KES_RATE = envRate;
    USD_KES_WITHDRAW_RATE = envRate;
    return envRate;
  }
  try {
    const storedRate = Number(localStorage.getItem(STORAGE_KEY_USD_KES_RATE));
    if (!Number.isNaN(storedRate) && storedRate > 0) {
      USD_KES_RATE = storedRate;
      USD_KES_WITHDRAW_RATE = storedRate;
      return storedRate;
    }
  } catch {
    // ignore storage errors
  }
  return USD_KES_RATE;
}

export function getUsdKesWithdrawRate(): number {
  return getUsdKesRate();
}

export function getHashbackMerchantName(): string {
  return getHashbackConfig().merchantName;
}

export function getHashbackConfig() {
  let savedMerchant = '';
  try {
    savedMerchant = (localStorage.getItem(STORAGE_KEY_MERCHANT_NAME) || '').trim();
  } catch {
    // ignore
  }

  const merchantName =
    runtimeSecretsCache.merchantName ||
    savedMerchant ||
    HASHBACK_MERCHANT_NAME ||
    'HASHBACK PAYMENT';

  const usdKesRate = getUsdKesRate();

  return {
    usdKesRate,
    merchantName,
    isConfigured: runtimeSecretsCache.isConfigured,
  };
}

export function saveHashbackConfig(apiKey?: string, accountId?: string, usdKesRate?: number) {
  try {
    if (usdKesRate !== undefined && Number(usdKesRate) > 0) {
      const cleanRate = Number(usdKesRate);
      localStorage.setItem(STORAGE_KEY_USD_KES_RATE, String(cleanRate));
      runtimeSecretsCache.usdKesRate = cleanRate;
      USD_KES_RATE = cleanRate;
      USD_KES_WITHDRAW_RATE = cleanRate;
    }
    fetch('/api/hashback-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: accountId ? accountId.trim() : undefined,
        apiKey: apiKey ? apiKey.trim() : undefined,
        usdKesRate: runtimeSecretsCache.usdKesRate,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.merchantName) {
          runtimeSecretsCache.merchantName = String(data.merchantName).trim();
          HASHBACK_MERCHANT_NAME = runtimeSecretsCache.merchantName;
        }
      })
      .catch(() => {});
  } catch {
    // ignore storage errors
  }
}

/**
 * Formats any Kenyan phone number into standard 2547XXXXXXXX or 2541XXXXXXXX format
 */
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

/**
 * Converts USD amount to integer KES amount using the secret USD_KES_RATE
 */
export function usdToKes(usdAmount: number): number {
  const rate = getUsdKesRate();
  return Math.max(1, Math.round(usdAmount * rate));
}

export const convertUsdToKes = usdToKes;

/**
 * Converts KES amount to USD amount using the secret USD_KES_RATE
 */
export function kesToUsd(kesAmount: number): number {
  const rate = getUsdKesRate();
  return Number((kesAmount / rate).toFixed(2));
}

export const convertKesToUsd = kesToUsd;

/**
 * Initiates an M-Pesa STK Push via Hashback API using configured Secrets
 */
export async function initiateStkPush(req: HashbackStkRequest): Promise<MpesaPaymentResponse> {
  await syncRuntimeHashbackSecrets();
  const msisdn = formatSafaricomPhone(req.phone);
  const reference = req.reference || req.accountReference || `VTM-${Date.now()}`;

  if (!isValidSafaricomPhone(msisdn)) {
    return {
      success: false,
      message: 'Please enter a valid Safaricom M-Pesa phone number (e.g., 0712 345 678 or 254712345678).',
    };
  }

  const payload = {
    amount: String(Math.max(1, Math.round(req.amountKes))),
    msisdn,
    reference,
  };

  let data: any = null;
  let httpOk = false;

  // Server-side proxy (/api/hashback-stk) injects server Secrets (HASHBACK_ACCOUNT_ID, HASHBACK_API_KEY) securely
  try {
    const proxyRes = await fetch('/api/hashback-stk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await proxyRes.text();
    try {
      data = JSON.parse(text);
      httpOk = proxyRes.ok;
    } catch {
      data = null;
    }
  } catch {
    data = null;
  }

  if (!data) {
    return {
      success: false,
      message: 'Unable to reach M-Pesa gateway. Please check your connection and try again.',
    };
  }

  const responseCode = String(data?.ResponseCode ?? data?.response_code ?? data?.status ?? '');
  const isAccepted =
    httpOk &&
    (responseCode === '0' ||
      responseCode === '200' ||
      data?.success === true ||
      data?.status === 'success' ||
      Boolean(data?.checkout_id || data?.CheckoutRequestID || data?.checkoutid));

  if (isAccepted) {
    return {
      success: true,
      message:
        data?.ResponseDescription ||
        data?.message ||
        'STK Push sent to your phone. Please enter your M-Pesa PIN to complete the payment.',
      checkoutId: data?.checkout_id || data?.CheckoutRequestID || data?.checkoutid || reference,
      reference,
      amountKes: req.amountKes,
      amountUsd: req.amountUsd,
      formattedPhone: msisdn,
      raw: data,
    };
  }

  return {
    success: false,
    message:
      data?.ResponseDescription ||
      data?.error_message ||
      data?.message ||
      data?.error ||
      'Failed to initiate M-Pesa STK Push. Please check your phone number.',
    raw: data,
  };
}

/**
 * Polls Hashback API via server proxy to check if the customer has entered their M-Pesa PIN
 * and Safaricom has confirmed the transaction.
 */
export async function checkStkPaymentStatus(checkoutId: string): Promise<HashbackStatusResponse> {
  try {
    const response = await fetch('/api/hashback-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_id: checkoutId,
        checkoutid: checkoutId,
      }),
    });

    const data = await response.json();
    if (data && typeof data.confirmed === 'boolean') {
      return {
        success: Boolean(data.success),
        confirmed: Boolean(data.confirmed),
        pending: Boolean(data.pending),
        failed: Boolean(data.failed),
        resultCode: data.resultCode !== undefined ? String(data.resultCode) : undefined,
        resultDesc: data.resultDesc,
        mpesaReceiptNumber: data.mpesaReceiptNumber,
        data: data.data || data,
        raw: data.data || data,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      confirmed: false,
      pending: true,
      failed: false,
      resultDesc: err?.message || 'Checking payment status...',
    };
  }

  return {
    success: false,
    confirmed: false,
    pending: true,
    failed: false,
    resultDesc: 'Checking payment status...',
  };
}

export const hashbackService = {
  initiateStkPush,
  queryTransactionStatus: checkStkPaymentStatus,
  checkStkPaymentStatus,
  syncSecrets: syncRuntimeHashbackSecrets,
  getConfig: getHashbackConfig,
  saveConfig: saveHashbackConfig,
  getUsdKesRate,
};
