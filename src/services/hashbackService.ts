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
export let HASHBACK_MERCHANT_NAME: string = 'VTMMARKETS';
export let USD_KES_RATE: number =
  Number(import.meta.env?.VITE_USD_KES_RATE) > 0 ? Number(import.meta.env?.VITE_USD_KES_RATE) : 129.56;
export let USD_KES_WITHDRAW_RATE: number =
  Number(import.meta.env?.VITE_USD_KES_WITHDRAW_RATE) > 0 ? Number(import.meta.env?.VITE_USD_KES_WITHDRAW_RATE) : 126.58;

let runtimeSecretsCache: {
  usdKesRate: number;
  usdKesWithdrawRate: number;
  merchantName: string;
  isConfigured: boolean;
  loaded: boolean;
} = {
  usdKesRate: USD_KES_RATE,
  usdKesWithdrawRate: USD_KES_WITHDRAW_RATE,
  merchantName: 'VTMMARKETS',
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
    // Clean up any legacy sensitive keys or outdated exchange rates in localStorage
    localStorage.removeItem('vtm_hashback_api_key');
    localStorage.removeItem('vtm_hashback_account_id');
    const legacyRate = Number(localStorage.getItem(STORAGE_KEY_USD_KES_RATE));
    if (legacyRate && legacyRate < 129.56) {
      localStorage.removeItem(STORAGE_KEY_USD_KES_RATE);
    }
  } catch {
    // ignore storage errors
  }

  try {
    let res = await fetch('/api/hashback-config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      try {
        res = await fetch('/.netlify/functions/api?route=hashback-config', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      } catch {}
    }
    if (!res.ok) {
      try {
        res = await fetch('/.netlify/functions/hashback-config', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      } catch {}
    }

    if (res && res.ok) {
      const data = await res.json();
      const parsedRate = Number(data.usdKesRate);
      if (parsedRate >= 129.56) {
        runtimeSecretsCache.usdKesRate = parsedRate;
        USD_KES_RATE = parsedRate;
      } else {
        runtimeSecretsCache.usdKesRate = 129.56;
        USD_KES_RATE = 129.56;
      }
      if (Number(data.usdKesWithdrawRate) > 0) {
        runtimeSecretsCache.usdKesWithdrawRate = Number(data.usdKesWithdrawRate);
        USD_KES_WITHDRAW_RATE = runtimeSecretsCache.usdKesWithdrawRate;
      } else {
        runtimeSecretsCache.usdKesWithdrawRate = 126.58;
        USD_KES_WITHDRAW_RATE = 126.58;
      }
      const rawMerchant = String(data.merchantName || '').trim();
      // Ensure merchant name never defaults to third-party provider "HashBack"
      if (rawMerchant && !rawMerchant.toLowerCase().includes('hashback')) {
        runtimeSecretsCache.merchantName = rawMerchant;
        HASHBACK_MERCHANT_NAME = rawMerchant;
      } else {
        runtimeSecretsCache.merchantName = 'VTMMARKETS';
        HASHBACK_MERCHANT_NAME = 'VTMMARKETS';
      }
      try {
        localStorage.setItem(STORAGE_KEY_MERCHANT_NAME, runtimeSecretsCache.merchantName);
      } catch {
        // ignore
      }
      runtimeSecretsCache.isConfigured = Boolean(data.configured);
      runtimeSecretsCache.loaded = true;
    } else {
      // Fallback
      runtimeSecretsCache.usdKesRate = 129.56;
      USD_KES_RATE = 129.56;
    }
  } catch {
    runtimeSecretsCache.usdKesRate = 129.56;
    USD_KES_RATE = 129.56;
  }
  return getHashbackConfig();
}

// Automatically hydrate on module load in browser
if (typeof window !== 'undefined') {
  syncRuntimeHashbackSecrets().catch(() => {});
}

export function getUsdKesRate(): number {
  if (runtimeSecretsCache.usdKesRate >= 129.56) {
    USD_KES_RATE = runtimeSecretsCache.usdKesRate;
    return runtimeSecretsCache.usdKesRate;
  }
  const envRate = Number(import.meta.env?.VITE_USD_KES_RATE);
  if (!Number.isNaN(envRate) && envRate >= 129.56) {
    USD_KES_RATE = envRate;
    return envRate;
  }
  try {
    const storedRate = Number(localStorage.getItem(STORAGE_KEY_USD_KES_RATE));
    if (!Number.isNaN(storedRate) && storedRate >= 129.56) {
      USD_KES_RATE = storedRate;
      return storedRate;
    }
  } catch {
    // ignore storage errors
  }
  USD_KES_RATE = 129.56;
  runtimeSecretsCache.usdKesRate = 129.56;
  return 129.56;
}

export function getUsdKesWithdrawRate(): number {
  if (runtimeSecretsCache.usdKesWithdrawRate > 0) {
    USD_KES_WITHDRAW_RATE = runtimeSecretsCache.usdKesWithdrawRate;
    return runtimeSecretsCache.usdKesWithdrawRate;
  }
  const envWithdrawRate = Number(import.meta.env?.VITE_USD_KES_WITHDRAW_RATE);
  if (!Number.isNaN(envWithdrawRate) && envWithdrawRate > 0) {
    USD_KES_WITHDRAW_RATE = envWithdrawRate;
    return envWithdrawRate;
  }
  return USD_KES_WITHDRAW_RATE || 126.58;
}

export function getHashbackMerchantName(): string {
  return getHashbackConfig().merchantName;
}

export function getHashbackConfig() {
  let savedMerchant = '';
  try {
    savedMerchant = (localStorage.getItem(STORAGE_KEY_MERCHANT_NAME) || '').trim();
    if (savedMerchant.toLowerCase().includes('hashback')) {
      savedMerchant = 'VTMMARKETS';
      localStorage.setItem(STORAGE_KEY_MERCHANT_NAME, 'VTMMARKETS');
    }
  } catch {
    // ignore
  }

  let merchantName =
    runtimeSecretsCache.merchantName ||
    savedMerchant ||
    HASHBACK_MERCHANT_NAME ||
    'VTMMARKETS';

  if (!merchantName || merchantName.toLowerCase().includes('hashback')) {
    merchantName = 'VTMMARKETS';
  }

  const usdKesRate = getUsdKesRate();

  return {
    usdKesRate,
    merchantName,
    isConfigured: runtimeSecretsCache.isConfigured || Boolean(import.meta.env?.VITE_HASHBACK_ACCOUNT_ID),
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

  // Tier 1: Standard proxy endpoint (/api/hashback-stk)
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

  // Tier 2: Direct Netlify function path (/.netlify/functions/api)
  if (!data || !httpOk) {
    try {
      const netlifyRes = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ...payload, action: 'hashback-stk' }),
      });
      const text = await netlifyRes.text();
      try {
        const netlifyData = JSON.parse(text);
        if (netlifyData) {
          data = netlifyData;
          httpOk = netlifyRes.ok;
        }
      } catch {}
    } catch {}
  }

  // Tier 3: Named Netlify function (/.netlify/functions/hashback-stk)
  if (!data || !httpOk) {
    try {
      const fnRes = await fetch('/.netlify/functions/hashback-stk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const text = await fnRes.text();
      try {
        const fnData = JSON.parse(text);
        if (fnData) {
          data = fnData;
          httpOk = fnRes.ok;
        }
      } catch {}
    } catch {}
  }

  // Tier 4: Direct client-side HashBack CORS call if client credentials exist
  if (!data || !httpOk) {
    const clientAcc = String(import.meta.env.VITE_HASHBACK_ACCOUNT_ID || '').trim();
    const clientKey = String(import.meta.env.VITE_HASHBACK_API_KEY || '').trim();
    if (clientAcc && clientKey) {
      try {
        const directRes = await fetch('https://api.hashback.co.ke/initiatestk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            account_id: clientAcc,
            api_key: clientKey,
            amount: payload.amount,
            msisdn: payload.msisdn,
            reference: payload.reference,
          }),
        });
        const directText = await directRes.text();
        try {
          const directData = JSON.parse(directText);
          if (directData) {
            data = directData;
            httpOk = directRes.ok;
          }
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    }
  }

  if (!data) {
    return {
      success: false,
      message: 'Transaction cannot be completed right now. Please try again later.',
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
  const statusPayload = {
    checkout_id: checkoutId,
    checkoutid: checkoutId,
    action: 'hashback-status',
  };

  const parseStatusResult = (data: any) => {
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
    return null;
  };

  // Tier 1: /api/hashback-status
  try {
    const response = await fetch('/api/hashback-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusPayload),
    });
    if (response.ok) {
      const data = await response.json();
      const parsed = parseStatusResult(data);
      if (parsed) return parsed;
    }
  } catch {}

  // Tier 2: /.netlify/functions/api
  try {
    const netlifyRes = await fetch('/.netlify/functions/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusPayload),
    });
    if (netlifyRes.ok) {
      const data = await netlifyRes.json();
      const parsed = parseStatusResult(data);
      if (parsed) return parsed;
    }
  } catch {}

  // Tier 3: /.netlify/functions/hashback-status
  try {
    const fnRes = await fetch('/.netlify/functions/hashback-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusPayload),
    });
    if (fnRes.ok) {
      const data = await fnRes.json();
      const parsed = parseStatusResult(data);
      if (parsed) return parsed;
    }
  } catch {}

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
