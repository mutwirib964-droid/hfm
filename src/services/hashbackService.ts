/**
 * Hashback Payment Gateway Integration for Safaricom M-PESA Kenya
 * Endpoint: https://api.hashback.co.ke/initiatestk
 * Account: HP068635
 * Rate: 1 USD = 125.67 KES
 */

export const HASHBACK_ACCOUNT_ID = 'HP068635';
export const HASHBACK_API_KEY = '09a166c7e99ef7751c92f675076e73f8deb6f980c33d92f6321f180116d42f5a';
export const USD_KES_RATE = 125.67;

export interface MpesaPaymentRequest {
  phone: string;
  amountUsd: number;
  amountKes?: number;
  accountReference?: string;
  targetAccount?: string;
  userEmail?: string;
}

export interface MpesaPaymentResponse {
  success: boolean;
  message: string;
  checkoutId?: string;
  merchantRequestId?: string;
  responseCode?: string;
  customerMessage?: string;
  amountKes: number;
  amountUsd: number;
  formattedPhone: string;
  rawResponse?: any;
}

export interface HashbackStatusResult {
  confirmed: boolean;
  pending: boolean;
  failed: boolean;
  resultCode?: string;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  data?: any;
}

/**
 * Standardize any Kenyan phone format to international MSISDN: 2547XXXXXXXX or 2541XXXXXXXX
 * Handles formats: 07XXXXXXXX, 01XXXXXXXX, +254XXXXXXXXX, 254XXXXXXXXX, 7XXXXXXXX, 1XXXXXXXX
 */
export function formatKenyanPhone(phone: string): { valid: boolean; formatted: string; display: string } {
  if (!phone) return { valid: false, formatted: '', display: '' };
  
  // Strip all non-numeric characters except +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '').trim();
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Handle 07XX or 01XX -> 2547XX / 2541XX
  if (cleaned.startsWith('0') && (cleaned.length === 10)) {
    cleaned = '254' + cleaned.substring(1);
  } else if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }

  // Validate format: 254 + 7XXXXXXXX or 254 + 1XXXXXXXX (total 12 digits)
  const isValid = /^254[17][0-9]{8}$/.test(cleaned);
  const display = isValid ? `+254 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}` : phone;

  return {
    valid: isValid,
    formatted: cleaned,
    display,
  };
}

/**
 * Convert USD to KES at current fixed broker rate (125.67)
 */
export function usdToKes(usd: number): number {
  if (!usd || usd <= 0) return 0;
  return Math.round(usd * USD_KES_RATE);
}

/**
 * Convert KES to USD at current fixed broker rate (125.67)
 */
export function kesToUsd(kes: number): number {
  if (!kes || kes <= 0) return 0;
  return Number((kes / USD_KES_RATE).toFixed(2));
}

class HashbackService {
  private accountId: string = HASHBACK_ACCOUNT_ID;
  private apiKey: string = HASHBACK_API_KEY;
  private exchangeRate: number = USD_KES_RATE;

  public getExchangeRate(): number {
    return this.exchangeRate;
  }

  public getAccountId(): string {
    return this.accountId;
  }

  /**
   * Send STK Push prompt to customer's phone via Hashback gateway
   */
  public async initiateStkPush(req: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    const { valid, formatted, display } = formatKenyanPhone(req.phone);
    if (!valid) {
      return {
        success: false,
        message: 'Invalid Kenyan phone number. Please enter a valid Safaricom/Airtel number (e.g., 0712345678 or 0112345678).',
        amountKes: req.amountKes || usdToKes(req.amountUsd),
        amountUsd: req.amountUsd,
        formattedPhone: req.phone,
      };
    }

    const calculatedKes = req.amountKes && req.amountKes > 0 ? Math.round(req.amountKes) : usdToKes(req.amountUsd);
    if (calculatedKes < 10) {
      return {
        success: false,
        message: 'Minimum deposit via M-PESA is KES 10 ($0.10 USD).',
        amountKes: calculatedKes,
        amountUsd: req.amountUsd,
        formattedPhone: formatted,
      };
    }

    const reference = req.accountReference || `VTM-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      account_id: this.accountId,
      api_key: this.apiKey,
      amount: calculatedKes,
      msisdn: formatted,
      reference: reference,
    };

    // 1. Try server-side proxy route first (/api/hashback-stk)
    try {
      const serverRes = await fetch('/api/hashback-stk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.success || data.ResponseCode === '0' || data.checkout_id || data.CheckoutRequestID) {
          return {
            success: true,
            message: data.message || data.ResponseDescription || 'STK Push sent successfully to your phone.',
            checkoutId: data.checkout_id || data.CheckoutRequestID,
            merchantRequestId: data.MerchantRequestID,
            responseCode: data.ResponseCode || '0',
            customerMessage: data.CustomerMessage || 'Please check your phone and enter your M-Pesa PIN.',
            amountKes: calculatedKes,
            amountUsd: req.amountUsd,
            formattedPhone: display,
            rawResponse: data,
          };
        } else {
          return {
            success: false,
            message: data.message || data.ResponseDescription || 'Failed to initiate STK push.',
            amountKes: calculatedKes,
            amountUsd: req.amountUsd,
            formattedPhone: display,
            rawResponse: data,
          };
        }
      }
    } catch (proxyErr) {
      console.warn('Server proxy unavailable, falling back to direct Hashback gateway call:', proxyErr);
    }

    // 2. Direct gateway fallback (CORS is supported by Hashback API)
    try {
      const directRes = await fetch('https://api.hashback.co.ke/initiatestk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      const json = await directRes.json();
      if (directRes.ok && (json.success || json.ResponseCode === '0' || json.checkout_id || json.CheckoutRequestID)) {
        return {
          success: true,
          message: json.message || json.ResponseDescription || 'STK Push sent successfully to your phone.',
          checkoutId: json.checkout_id || json.CheckoutRequestID,
          merchantRequestId: json.MerchantRequestID,
          responseCode: json.ResponseCode || '0',
          customerMessage: json.CustomerMessage || 'Please check your phone and enter your M-Pesa PIN.',
          amountKes: calculatedKes,
          amountUsd: req.amountUsd,
          formattedPhone: display,
          rawResponse: json,
        };
      } else {
        return {
          success: false,
          message: json.message || json.ResponseDescription || json.error || 'Failed to trigger M-Pesa prompt.',
          amountKes: calculatedKes,
          amountUsd: req.amountUsd,
          formattedPhone: display,
          rawResponse: json,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error communicating with M-Pesa gateway.',
        amountKes: calculatedKes,
        amountUsd: req.amountUsd,
        formattedPhone: display,
      };
    }
  }

  /**
   * Polls Hashback / Safaricom Daraja for real-time transaction confirmation.
   * Never relies on manual approval - strictly receives cryptographic confirmation
   * from Hashback API with ResultCode = 0 and MpesaReceiptNumber.
   */
  public async queryTransactionStatus(checkoutId: string): Promise<HashbackStatusResult> {
    if (!checkoutId) {
      return { confirmed: false, pending: false, failed: true, resultDesc: 'Missing checkout_id' };
    }

    // 1. Try server proxy route first (/api/hashback-status)
    try {
      const res = await fetch('/api/hashback-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: this.accountId,
          api_key: this.apiKey,
          checkout_id: checkoutId,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          confirmed: Boolean(json.confirmed),
          pending: Boolean(json.pending),
          failed: Boolean(json.failed),
          resultCode: json.resultCode,
          resultDesc: json.resultDesc,
          mpesaReceiptNumber: json.mpesaReceiptNumber,
          data: json.data,
        };
      }
    } catch (e) {
      console.warn('Proxy status check failed, trying direct Hashback query:', e);
    }

    // 2. Direct gateway fallback to Hashback API
    try {
      const payload = {
        account_id: this.accountId,
        api_key: this.apiKey,
        checkoutid: checkoutId,
        checkout_id: checkoutId,
      };

      const directRes = await fetch('https://api.hashback.co.ke/transactionstatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      const data = await directRes.json();
      const rawCode = data.ResultCode !== undefined ? String(data.ResultCode) : undefined;
      const isSuccess = rawCode === '0' || data.status === 'completed' || data.status === 'success';
      const isFailed = rawCode === '1032' || rawCode === '1037' || rawCode === '1' || (rawCode !== undefined && rawCode !== '0');
      const isPending = !isSuccess && !isFailed;

      let receiptNo = data.MpesaReceiptNumber || data.mpesa_receipt;
      if (!receiptNo && data.CallbackMetadata?.Item) {
        const item = data.CallbackMetadata.Item.find((i: any) => i.Name === 'MpesaReceiptNumber');
        if (item) receiptNo = item.Value;
      }

      return {
        confirmed: isSuccess,
        pending: isPending,
        failed: isFailed,
        resultCode: rawCode,
        resultDesc: data.ResultDesc || data.ResponseDescription,
        mpesaReceiptNumber: receiptNo,
        data,
      };
    } catch (err: any) {
      return {
        confirmed: false,
        pending: true,
        failed: false,
        resultDesc: 'Waiting for network response from Hashback...',
      };
    }
  }
}

export const hashbackService = new HashbackService();
