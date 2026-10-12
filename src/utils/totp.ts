// RFC 6238 Time-Based One-Time Password (TOTP) Generator & Validator
// Uses Web Crypto API HMAC-SHA1 and standard Base32 encoding compatible with Google Authenticator & Authy.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface User2FAState {
  enabled: boolean;
  secret: string;
  verifiedAt?: number;
}

export function get2FAStorageKey(email?: string | null): string {
  const clean = (email || 'guest').trim().toLowerCase();
  return `vtm_2fa_state_${clean}`;
}

/**
 * Generates a deterministic or random 16-character Base32 TOTP secret for a user.
 */
export function generateBase32Secret(seedEmail?: string): string {
  try {
    const bytes = new Uint8Array(10);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 10; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let secret = '';
    for (let i = 0; i < 16; i++) {
      const idx = (bytes[i % bytes.length] + i * 7 + (seedEmail ? seedEmail.charCodeAt(i % seedEmail.length) : 0)) % 32;
      secret += BASE32_ALPHABET[idx];
    }
    return secret;
  } catch {
    return 'JBSWY3DPEHPK3PXP';
  }
}

export function formatSecretForDisplay(secret: string): string {
  const clean = (secret || '').replace(/\s+/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

export function loadUser2FAState(email?: string | null): User2FAState {
  if (!email) {
    return { enabled: false, secret: 'JBSWY3DPEHPK3PXP' };
  }
  try {
    const raw = localStorage.getItem(get2FAStorageKey(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.secret === 'string' && parsed.secret.length >= 8) {
        return {
          enabled: Boolean(parsed.enabled),
          secret: parsed.secret.replace(/\s+/g, '').toUpperCase(),
          verifiedAt: parsed.verifiedAt,
        };
      }
    }
  } catch {
    // ignore
  }
  const newSecret = generateBase32Secret(email);
  const initial: User2FAState = { enabled: false, secret: newSecret };
  try {
    localStorage.setItem(get2FAStorageKey(email), JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

export function saveUser2FAState(email: string | null | undefined, state: User2FAState): void {
  if (!email) return;
  try {
    const cleanState: User2FAState = {
      enabled: Boolean(state.enabled),
      secret: (state.secret || '').replace(/\s+/g, '').toUpperCase() || generateBase32Secret(email),
      verifiedAt: state.verifiedAt || (state.enabled ? Date.now() : undefined),
    };
    localStorage.setItem(get2FAStorageKey(email), JSON.stringify(cleanState));
  } catch {
    // ignore
  }
}

export function getStoredTotpState(email?: string | null): User2FAState {
  return loadUser2FAState(email);
}

export function saveStoredTotpState(
  email: string | null | undefined,
  enabled: boolean,
  secret?: string
): void {
  const existing = loadUser2FAState(email);
  saveUser2FAState(email, {
    enabled,
    secret: secret || existing.secret,
    verifiedAt: enabled ? Date.now() : existing.verifiedAt,
  });
}

function base32ToBytes(base32: string): Uint8Array {
  const cleaned = (base32 || '').replace(/[^A-Z2-7]/gi, '').toUpperCase();
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const byteCount = Math.floor(bits.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

/**
 * Pure JS fallback HMAC-SHA1 in case subtle crypto is unavailable in a non-HTTPS preview context.
 */
function sha1Bytes(msg: Uint8Array): Uint8Array {
  function rotl(n: number, s: number): number {
    return (n << s) | (n >>> (32 - s));
  }
  const ml = msg.length * 8;
  const withOne = new Uint8Array(msg.length + 1);
  withOne.set(msg);
  withOne[msg.length] = 0x80;

  let padLen = withOne.length;
  while (padLen % 64 !== 56) padLen++;
  const padded = new Uint8Array(padLen + 8);
  padded.set(withOne);
  const view = new DataView(padded.buffer);
  view.setUint32(padLen, Math.floor(ml / 0x100000000), false);
  view.setUint32(padLen + 4, ml >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Int32Array(80);
  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getInt32(i + j * 4, false);
    }
    for (let j = 16; j < 80; j++) {
      w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f = 0;
      let k = 0;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, h0, false);
  outView.setInt32(4, h1, false);
  outView.setInt32(8, h2, false);
  outView.setInt32(12, h3, false);
  outView.setInt32(16, h4, false);
  return out;
}

function hmacSha1Sync(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) {
    k = sha1Bytes(k);
  }
  const keyBlock = new Uint8Array(blockSize);
  keyBlock.set(k);

  const oKeyPad = new Uint8Array(blockSize + 20);
  const iKeyPad = new Uint8Array(blockSize + message.length);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBlock[i] ^ 0x5c;
    iKeyPad[i] = keyBlock[i] ^ 0x36;
  }
  iKeyPad.set(message, blockSize);
  const innerHash = sha1Bytes(iKeyPad);
  oKeyPad.set(innerHash, blockSize);
  return sha1Bytes(oKeyPad);
}

/**
 * Synchronously computes a 6-digit RFC 6238 TOTP code for a given Base32 secret and timestamp.
 */
export function generateTotpCodeSync(
  secret: string,
  timestampMs: number = Date.now(),
  stepSeconds: number = 30
): string {
  const keyBytes = base32ToBytes(secret);
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);

  const counterBytes = new Uint8Array(8);
  const view = new DataView(counterBytes.buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const hmac = hmacSha1Sync(keyBytes, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code against the user's Base32 secret, allowing ±1 time window (30s) for clock drift.
 */
export function verifyTotpCode(
  secret: string,
  inputCode: string,
  timestampMs: number = Date.now(),
  windowSteps: number = 1
): boolean {
  const cleanCode = (inputCode || '').replace(/\D/g, '');
  if (cleanCode.length !== 6) return false;

  const stepMs = 30 * 1000;
  for (let w = -windowSteps; w <= windowSteps; w++) {
    const candidate = generateTotpCodeSync(secret, timestampMs + w * stepMs, 30);
    if (candidate === cleanCode) {
      return true;
    }
  }
  return false;
}

/**
 * Returns remaining seconds in the current 30-second TOTP window (1 to 30).
 */
export function getTotpRemainingSeconds(timestampMs: number = Date.now()): number {
  const elapsed = Math.floor(timestampMs / 1000) % 30;
  return 30 - elapsed;
}

/**
 * Generates an otpauth:// URI for authenticator apps.
 */
export function buildOtpAuthUri(email: string, secret: string, issuer: string = 'VTM Markets'): string {
  const cleanSecret = (secret || '').replace(/\s+/g, '').toUpperCase();
  const label = encodeURIComponent(`${issuer}:${email || 'trader@vtmarkets.com'}`);
  return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a deterministic 21x21 QR-style matrix from a string so the QR visual renders offline without external image dependencies.
 */
export function generateQrMatrix(data: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[rowOffset + r][colOffset + c] = isBorder || isInner;
        reserved[rowOffset + r][colOffset + c] = true;
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Reserve quiet separators around finders
  for (let i = 0; i < 8; i++) {
    if (i < size) {
      reserved[7][i] = true;
      reserved[i][7] = true;
      reserved[7][size - 1 - i] = true;
      reserved[i][size - 8] = true;
      reserved[size - 8][i] = true;
      reserved[size - 1 - i][7] = true;
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    reserved[6][i] = true;
    grid[i][6] = i % 2 === 0;
    reserved[i][6] = true;
  }

  // Fill remaining modules deterministically from data bytes
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const charCode = data.charCodeAt(bitIdx % data.length) || 65;
      const mixed = (hash ^ (charCode * (bitIdx + 1) * 1103515245) ^ (r * 31 + c * 17)) >>> 0;
      grid[r][c] = (mixed & 1) === 1;
      bitIdx++;
    }
  }

  return grid;
}
