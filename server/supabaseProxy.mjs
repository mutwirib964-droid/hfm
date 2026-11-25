import crypto from 'crypto';

export const DEFAULT_SUPABASE_URL = 'https://seycwqpozegjwpxuewbf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNleWN3cXBvemVnandweHVld2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTM5NDMsImV4cCI6MjEwNTM4OTk0M30.biGNnOKU0pRdGzzluJkBL4gZT2iR_eMZWviRuMnC5Ew';

export const MASTER_ADMIN_EMAIL = 'mutwirib964@gmail.com';
export const MASTER_ADMIN_UID = '84a1e1db-f302-4dac-a077-291128ae0cea';

const ALLOWED_TABLES = new Set([
  'vtm_registered_users',
  'vtm_user_finances',
  'user_activities',
  'user_devices',
  'closed_trades',
  'financial_ledger',
  'vtm_cloud_states',
  'vtm_followed_strategies',
  'vtm_referrals',
  'vtm_referral_commissions',
  'vtm_referral_claims',
  'profiles',
  'trading_accounts',
]);

const USER_EMAIL_SCOPED_TABLES = new Set([
  'user_activities',
  'user_devices',
  'closed_trades',
  'financial_ledger',
  'vtm_cloud_states',
  'vtm_followed_strategies',
]);

let ephemeralDevSecret = null;
function getSigningKey() {
  const configured = (process.env.AUTH_SESSION_SECRET || '').trim();
  if (configured) {
    return crypto.createHash('sha256').update(configured).digest();
  }
  const derivedSeed = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.VTMMARKETS_WEBHOOK_SECRET ||
    process.env.PAYHERO_API_KEY ||
    ''
  ).trim();
  if (derivedSeed) {
    return crypto.createHmac('sha256', 'vtm-session-key-v1').update(derivedSeed).digest();
  }
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32);
  }
  return ephemeralDevSecret;
}

export function isMasterAdminEmail(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  return (
    clean === 'mutwirib964@gmail.com' ||
    clean === 'mutwrib@gmail.com' ||
    clean === 'mutwirib@gmail.com'
  );
}

export function normalizePlatformEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  return isMasterAdminEmail(clean) ? MASTER_ADMIN_EMAIL : clean;
}

export function isPlaceholderPhoneDigits(digits) {
  return (
    !digits ||
    digits === '254700000000' ||
    digits === '0700000000' ||
    digits === '700000000'
  );
}

export function isValidRealPhone(phone) {
  const trimmed = String(phone || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 6 && !isPlaceholderPhoneDigits(digits);
}

export function isValidUuid(val) {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

export function deterministicUuidFromEmail(email) {
  const clean = normalizePlatformEmail(email);
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  let h3 = 0x1b873593 ^ clean.length;
  let h4 = 0x85ebca6b ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  const full = hex(h1) + hex(h2) + hex(h3) + hex(h4);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

export function getSupabaseServerConfig() {
  const url = (process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  const key = serviceKey || anonKey;
  return { url, key, anonKey, isServiceRole: Boolean(serviceKey) };
}

/**
 * Builds Supabase REST headers cleanly for BOTH legacy JWT keys (eyJ...)
 * and Supabase's newer secret API keys (sb_secret_... / sb_publishable_...).
 */
export function buildSupabaseHeaders(key, extra = {}) {
  const headers = {
    apikey: key,
    ...extra,
  };
  if (key && key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export function signSessionToken(user) {
  const email = normalizePlatformEmail(user.email);
  const role = isMasterAdminEmail(email)
    ? 'admin'
    : user.role === 'marketer'
    ? 'marketer'
    : 'normal';
  const uid = isMasterAdminEmail(email)
    ? MASTER_ADMIN_UID
    : isValidUuid(user.uid || user.id)
    ? String(user.uid || user.id).trim()
    : deterministicUuidFromEmail(email);

  const payloadObj = {
    email,
    uid,
    role,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', getSigningKey())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

export function verifySessionToken(authHeaderOrToken) {
  if (!authHeaderOrToken || typeof authHeaderOrToken !== 'string') return null;
  let token = authHeaderOrToken.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx === token.length - 1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64) return null;

  const expectedSigB64 = crypto
    .createHmac('sha256', getSigningKey())
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf8');
  const expectedBuf = Buffer.from(expectedSigB64, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || typeof payload.email !== 'string' || typeof payload.exp !== 'number') {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }
    const email = normalizePlatformEmail(payload.email);
    const role = isMasterAdminEmail(email)
      ? 'admin'
      : payload.role === 'marketer'
      ? 'marketer'
      : 'normal';
    const uid = isMasterAdminEmail(email)
      ? MASTER_ADMIN_UID
      : isValidUuid(payload.uid)
      ? payload.uid
      : deterministicUuidFromEmail(email);
    return { email, uid, role, exp: payload.exp };
  } catch {
    return null;
  }
}

export function parseStoredPasswordAndUid(rawHash) {
  if (!rawHash || typeof rawHash !== 'string') return {};
  if (rawHash.startsWith('uid:')) {
    const pipeIdx = rawHash.indexOf('|');
    if (pipeIdx > 4) {
      const uid = rawHash.slice(4, pipeIdx).trim();
      const password = rawHash.slice(pipeIdx + 1);
      return { uid: isValidUuid(uid) ? uid : undefined, password };
    }
  }
  return { password: rawHash };
}

export function sanitizePublicPayload(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicPayload(item));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'password_hash' || k === 'password') continue;
      out[k] = sanitizePublicPayload(v);
    }
    return out;
  }
  return value;
}

function rowToUserProfile(row, fallbackEmail = '') {
  const email = normalizePlatformEmail(row?.email || fallbackEmail);
  const isAdmin = isMasterAdminEmail(email);
  const parsedHash = parseStoredPasswordAndUid(row?.password_hash);
  let resolvedUid = isAdmin
    ? MASTER_ADMIN_UID
    : row?.uid || parsedHash.uid || '';
  if (!isValidUuid(resolvedUid)) {
    resolvedUid = deterministicUuidFromEmail(email);
  }
  const safeRole = isAdmin
    ? 'admin'
    : row?.role === 'marketer'
    ? 'marketer'
    : 'normal';
  return {
    id: resolvedUid,
    name: isAdmin ? 'mutwiri' : row?.name || 'Trader',
    email,
    phoneNumber: row?.phone_number || '',
    phone: row?.phone_number || '',
    countryCode: row?.country_code || (isAdmin ? '+254' : '+1'),
    countryName: row?.country_name || (isAdmin ? 'Kenya' : 'United States'),
    accountNumber: row?.account_number || '27330648',
    role: safeRole,
    isLoggedIn: true,
    createdAt: row?.created_at ? new Date(row.created_at).getTime() : Date.now(),
    referredByCode: row?.referred_by_code || undefined,
  };
}

async function sbFetch(pathAndQuery, init = {}) {
  const cfg = getSupabaseServerConfig();
  const extraHeaders = init.headers || {};
  return fetch(`${cfg.url}/rest/v1/${pathAndQuery.replace(/^\/+/, '')}`, {
    ...init,
    headers: buildSupabaseHeaders(cfg.key, extraHeaders),
  });
}

async function lookupSupabaseUserRow(cleanEmail) {
  const email = normalizePlatformEmail(cleanEmail);
  const isAdmin = isMasterAdminEmail(email);
  const queryFilter = isAdmin
    ? 'or=(email.ilike.mutwrib@gmail.com,email.ilike.mutwirib964@gmail.com,email.ilike.mutwirib@gmail.com)'
    : `email=ilike.${encodeURIComponent(email)}`;
  const res = await sbFetch(`vtm_registered_users?${queryFilter}&select=*&limit=1`, {
    method: 'GET',
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return { ok: false, status: res.status, row: null };
  const rows = await res.json().catch(() => []);
  return {
    ok: true,
    status: res.status,
    row: Array.isArray(rows) && rows.length > 0 ? rows[0] : null,
  };
}

function setQueryParam(searchParams, key, value) {
  searchParams.set(key, value);
}

function parseTableAndQuery(rawPath) {
  const cleanPath = String(rawPath || '').replace(/^\/+/, '');
  const qIdx = cleanPath.indexOf('?');
  const table = (qIdx >= 0 ? cleanPath.slice(0, qIdx) : cleanPath).trim();
  const queryString = qIdx >= 0 ? cleanPath.slice(qIdx + 1) : '';
  return { table, queryString, params: new URLSearchParams(queryString) };
}

function enforceBodyOwnership(body, applyFn) {
  if (Array.isArray(body)) {
    return body.map((item) => applyFn(item && typeof item === 'object' ? { ...item } : {}));
  }
  if (body && typeof body === 'object') {
    return applyFn({ ...body });
  }
  return body;
}

async function fetchExistingPhoneForEmail(email) {
  try {
    const res = await sbFetch(
      `vtm_registered_users?email=eq.${encodeURIComponent(normalizePlatformEmail(email))}&select=phone_number&limit=1`,
      { method: 'GET', signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return '';
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows) && rows[0]?.phone_number && isValidRealPhone(rows[0].phone_number)) {
      return String(rows[0].phone_number).trim();
    }
  } catch {
    // ignore
  }
  return '';
}

export async function handleSupabaseProxyRequest({ method, headers, body, fallbackDbHelpers }) {
  const cfg = getSupabaseServerConfig();
  const authHeader = headers?.authorization || headers?.Authorization || '';
  const action = String(body?.action || '').trim();

  if (method !== 'POST') {
    return { statusCode: 405, payload: { ok: false, error: 'Method not allowed' } };
  }

  // 1. Test Connection (health check only)
  if (action === 'test_connection') {
    try {
      const res = await fetch(`${cfg.url}/rest/v1/`, {
        method: 'GET',
        headers: buildSupabaseHeaders(cfg.key),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok || res.status === 200 || res.status === 404) {
        return { statusCode: 200, payload: { success: true, message: 'Connected to Supabase endpoint successfully.' } };
      }
      return { statusCode: 200, payload: { success: false, message: `Supabase returned HTTP ${res.status}` } };
    } catch (err) {
      return { statusCode: 200, payload: { success: false, message: err?.message || 'Connection error' } };
    }
  }

  // 2. Check if email exists (non-leaking boolean for signup check)
  if (action === 'check_email_exists') {
    const cleanEmail = normalizePlatformEmail(body?.email);
    if (!cleanEmail) {
      return { statusCode: 400, payload: { ok: false, exists: false } };
    }
    try {
      const lookup = await lookupSupabaseUserRow(cleanEmail);
      if (lookup.ok && lookup.row) {
        return { statusCode: 200, payload: { ok: true, exists: true } };
      }
    } catch {
      // fallback below
    }
    if (fallbackDbHelpers?.hasUser) {
      const existsLocal = Boolean(fallbackDbHelpers.hasUser(cleanEmail));
      return { statusCode: 200, payload: { ok: true, exists: existsLocal } };
    }
    return { statusCode: 200, payload: { ok: true, exists: false } };
  }

  // 3. Resolve Referrer Code for Signup Attribution (minimal safe fields only)
  if (action === 'resolve_referrer') {
    const cleanCode = String(body?.code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { statusCode: 200, payload: { ok: true, referrer: null } };
    }
    if (cleanCode === 'VTM-674343' || cleanCode === 'VTM-635667') {
      return { statusCode: 200, payload: { ok: true, referrer: { email: 'joelndungu1022@gmail.com', accountNumber: '36674343' } } };
    }
    if (cleanCode === 'VTM-MUTWIR' || cleanCode === 'VTM-84A1E1' || cleanCode.startsWith('VTM-MUTW')) {
      return { statusCode: 200, payload: { ok: true, referrer: { email: MASTER_ADMIN_EMAIL, accountNumber: '27330648' } } };
    }
    const suffix = cleanCode.replace(/^VTM-/i, '').trim();
    try {
      if (suffix && /^\d{4,8}$/.test(suffix)) {
        const res = await sbFetch(
          `vtm_registered_users?account_number=like.*${encodeURIComponent(suffix)}&select=email,account_number&limit=5`,
          { method: 'GET', signal: AbortSignal.timeout(4500) }
        );
        if (res.ok) {
          const rows = await res.json().catch(() => []);
          if (Array.isArray(rows) && rows[0]?.email) {
            return {
              statusCode: 200,
              payload: {
                ok: true,
                referrer: {
                  email: String(rows[0].email).trim().toLowerCase(),
                  accountNumber: rows[0].account_number ? String(rows[0].account_number) : undefined,
                },
              },
            };
          }
        }
      }
      const refRes = await sbFetch(
        `vtm_referrals?referrer_code=ilike.${encodeURIComponent(cleanCode)}&select=referrer_email&limit=1`,
        { method: 'GET', signal: AbortSignal.timeout(4500) }
      );
      if (refRes.ok) {
        const refRows = await refRes.json().catch(() => []);
        if (Array.isArray(refRows) && refRows[0]?.referrer_email) {
          return {
            statusCode: 200,
            payload: {
              ok: true,
              referrer: { email: String(refRows[0].referrer_email).trim().toLowerCase() },
            },
          };
        }
      }
      if (suffix) {
        const prefixRes = await sbFetch(
          `vtm_registered_users?email=ilike.${encodeURIComponent(suffix.toLowerCase())}*&select=email,account_number&limit=5`,
          { method: 'GET', signal: AbortSignal.timeout(4500) }
        );
        if (prefixRes.ok) {
          const pRows = await prefixRes.json().catch(() => []);
          if (Array.isArray(pRows) && pRows[0]?.email) {
            return {
              statusCode: 200,
              payload: {
                ok: true,
                referrer: {
                  email: String(pRows[0].email).trim().toLowerCase(),
                  accountNumber: pRows[0].account_number ? String(pRows[0].account_number) : undefined,
                },
              },
            };
          }
        }
      }
    } catch {
      // ignore
    }
    return { statusCode: 200, payload: { ok: true, referrer: null } };
  }

  // 4. Server-Verified Login (never leaks password_hash)
  if (action === 'auth_login') {
    const cleanEmail = normalizePlatformEmail(body?.email);
    const password = String(body?.password || '');
    if (!cleanEmail || !password) {
      return { statusCode: 400, payload: { ok: false, error: 'Email and password are required.' } };
    }
    const isAdmin = isMasterAdminEmail(cleanEmail);

    let sbRow = null;
    let sbErrorStatus = 0;
    try {
      const lookup = await lookupSupabaseUserRow(cleanEmail);
      sbErrorStatus = lookup.status;
      sbRow = lookup.row;
    } catch {
      // fallback below
    }

    const fallbackUser = fallbackDbHelpers?.getUser?.(cleanEmail) || null;
    const fallbackPassword = fallbackDbHelpers?.getPassword?.(cleanEmail) || '';

    if (!sbRow && !fallbackUser) {
      return {
        statusCode: 404,
        payload: { ok: false, code: 'ACCOUNT_NOT_FOUND', error: 'No registered account found for this email. Please create an account first.' },
      };
    }

    let storedPassword = '';
    if (sbRow) {
      storedPassword = parseStoredPasswordAndUid(sbRow.password_hash).password || '';
    } else if (fallbackPassword) {
      storedPassword = fallbackPassword;
    }

    let passwordValid =
      storedPassword.length === 0 ||
      storedPassword === password ||
      storedPassword.trim() === password.trim();

    if (!passwordValid && cfg.anonKey) {
      // Verify against Supabase Auth password grant if password_hash differs
      try {
        const authRes = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: cfg.anonKey,
          },
          body: JSON.stringify({ email: cleanEmail, password }),
          signal: AbortSignal.timeout(5000),
        });
        if (authRes.ok) {
          passwordValid = true;
        }
      } catch {
        // ignore
      }
    }

    if (!passwordValid) {
      return {
        statusCode: 401,
        payload: { ok: false, code: 'INVALID_CREDENTIALS', error: 'Invalid email or password. Please try again.' },
      };
    }

    const profile = sbRow
      ? rowToUserProfile(sbRow, cleanEmail)
      : {
          ...fallbackUser,
          email: cleanEmail,
          id: isAdmin ? MASTER_ADMIN_UID : fallbackUser?.id || deterministicUuidFromEmail(cleanEmail),
          role: isAdmin ? 'admin' : fallbackUser?.role === 'marketer' ? 'marketer' : 'normal',
          isLoggedIn: true,
        };

    // Keep fallback DB synchronized if needed
    if (fallbackDbHelpers?.upsertUser && profile) {
      fallbackDbHelpers.upsertUser(profile, password);
    }

    const sessionToken = signSessionToken(profile);
    return {
      statusCode: 200,
      payload: {
        ok: true,
        profile,
        sessionToken,
        quotaLimited: sbErrorStatus === 402 || sbErrorStatus === 429,
      },
    };
  }

  // 5. Server-Verified Registration (locks existing accounts/phones, prevents admin spoofing)
  if (action === 'auth_register') {
    const incomingProfile = body?.profile || {};
    const cleanEmail = normalizePlatformEmail(incomingProfile.email || body?.email);
    const password = String(body?.password || '');
    if (!cleanEmail || !password || password.length < 6) {
      return { statusCode: 400, payload: { ok: false, error: 'Valid email and password (min 6 characters) are required.' } };
    }
    const isAdmin = isMasterAdminEmail(cleanEmail);

    let existingRow = null;
    try {
      const lookup = await lookupSupabaseUserRow(cleanEmail);
      existingRow = lookup.row;
    } catch {
      // ignore
    }

    if (existingRow) {
      const existingPwd = parseStoredPasswordAndUid(existingRow.password_hash).password || '';
      if (existingPwd && existingPwd !== password && existingPwd.trim() !== password.trim()) {
        return {
          statusCode: 409,
          payload: { ok: false, code: 'ACCOUNT_EXISTS', error: 'An account with this email already exists. Please sign in instead.' },
        };
      }
    }

    let authUid = isAdmin
      ? MASTER_ADMIN_UID
      : existingRow?.uid && isValidUuid(existingRow.uid)
      ? existingRow.uid
      : isValidUuid(incomingProfile.id)
      ? incomingProfile.id
      : deterministicUuidFromEmail(cleanEmail);

    if (!isAdmin && cfg.anonKey && !existingRow) {
      try {
        const signUpRes = await fetch(`${cfg.url}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: cfg.anonKey,
            Authorization: `Bearer ${cfg.anonKey}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            data: {
              display_name: incomingProfile.name,
              name: incomingProfile.name,
              phone: incomingProfile.phoneNumber,
              country_name: incomingProfile.countryName,
              account_number: incomingProfile.accountNumber,
              role: 'normal',
            },
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (signUpRes.ok) {
          const signUpJson = await signUpRes.json().catch(() => null);
          const gotUid = signUpJson?.user?.id || signUpJson?.id;
          if (isValidUuid(gotUid)) {
            authUid = gotUid;
          }
        }
      } catch {
        // ignore
      }
    }

    const incomingPhone = String(incomingProfile.phoneNumber || incomingProfile.phone || '').trim();
    const existingPhone =
      existingRow?.phone_number && isValidRealPhone(existingRow.phone_number)
        ? String(existingRow.phone_number).trim()
        : '';
    const authoritativePhone =
      existingPhone || (isValidRealPhone(incomingPhone) ? incomingPhone : '');

    // Prevent arbitrary privilege escalation on registration
    const authoritativeRole = isAdmin
      ? 'admin'
      : existingRow?.role === 'marketer'
      ? 'marketer'
      : 'normal';

    const nowIso = new Date().toISOString();
    const encodedPasswordHash = `uid:${authUid}|${password}`;
    const upsertRow = {
      email: cleanEmail,
      uid: authUid,
      password_hash: encodedPasswordHash,
      name: isAdmin ? 'mutwiri' : String(incomingProfile.name || existingRow?.name || 'Trader').trim(),
      phone_number: authoritativePhone,
      country_code: String(incomingProfile.countryCode || existingRow?.country_code || '+1'),
      country_name: String(incomingProfile.countryName || existingRow?.country_name || 'United States'),
      account_number: String(incomingProfile.accountNumber || existingRow?.account_number || `${Math.floor(10000000 + Math.random() * 90000000)}`),
      role: authoritativeRole,
      last_login_at: nowIso,
      updated_at: nowIso,
    };

    try {
      const upsertRes = await sbFetch('vtm_registered_users?on_conflict=email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(upsertRow),
        signal: AbortSignal.timeout(6000),
      });
      if (upsertRes.ok) {
        const savedRows = await upsertRes.json().catch(() => []);
        if (Array.isArray(savedRows) && savedRows[0]) {
          existingRow = savedRows[0];
        }
      }
    } catch {
      // ignore
    }

    const finalProfile = {
      id: existingRow?.uid && isValidUuid(existingRow.uid) ? existingRow.uid : authUid,
      name: upsertRow.name,
      email: cleanEmail,
      phoneNumber: authoritativePhone,
      phone: authoritativePhone,
      countryCode: upsertRow.country_code,
      countryName: upsertRow.country_name,
      accountNumber: upsertRow.account_number,
      role: authoritativeRole,
      isLoggedIn: true,
      isNewRegistration: !existingRow,
      createdAt: existingRow?.created_at ? new Date(existingRow.created_at).getTime() : Date.now(),
      referredByCode: incomingProfile.referredByCode || undefined,
    };

    if (fallbackDbHelpers?.upsertUser) {
      fallbackDbHelpers.upsertUser(finalProfile, password);
    }

    const sessionToken = signSessionToken(finalProfile);
    return {
      statusCode: 200,
      payload: {
        ok: true,
        profile: finalProfile,
        sessionToken,
      },
    };
  }

  // =========================================================================
  // ALL REMAINING ACTIONS REQUIRE A VALID HMAC-SIGNED SESSION TOKEN
  // =========================================================================
  const session = verifySessionToken(authHeader);
  if (!session) {
    return {
      statusCode: 401,
      payload: { ok: false, code: 'UNAUTHORIZED', error: 'Valid signed session token required.' },
    };
  }

  const isSessionAdmin = session.role === 'admin' && isMasterAdminEmail(session.email);

  // 6. Server-side password verification for withdrawals (no password_hash sent to client)
  if (action === 'auth_verify_password') {
    const candidatePwd = String(body?.password || '').trim();
    if (!candidatePwd) {
      return { statusCode: 400, payload: { valid: false, error: 'Password is required.' } };
    }
    try {
      const lookup = await lookupSupabaseUserRow(session.email);
      const dbPwd = lookup.row ? parseStoredPasswordAndUid(lookup.row.password_hash).password || '' : '';
      const fallbackPwd = fallbackDbHelpers?.getPassword?.(session.email) || '';
      const storedPwd = dbPwd || fallbackPwd;
      if (!storedPwd || storedPwd === candidatePwd || storedPwd.trim() === candidatePwd) {
        return { statusCode: 200, payload: { valid: true } };
      }
      return {
        statusCode: 200,
        payload: {
          valid: false,
          error: 'Account email and password do not match. Both accounts must use the exact same email and password.',
        },
      };
    } catch {
      return { statusCode: 200, payload: { valid: true } };
    }
  }

  // 7. Scoped Marketer/User Referral Dashboard Aggregation
  if (action === 'fetch_referral_dashboard') {
    const cleanEmail = session.email;
    const acceptedRaw = Array.isArray(body?.acceptedCodes) ? body.acceptedCodes : [];
    const uniqueCodes = Array.from(
      new Set(acceptedRaw.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean))
    );
    try {
      const selfLookup = await lookupSupabaseUserRow(cleanEmail);
      const referrerAccountNumber = selfLookup.row?.account_number
        ? String(selfLookup.row.account_number)
        : undefined;

      const codeSet = new Set(uniqueCodes);
      if (referrerAccountNumber) {
        const digits = referrerAccountNumber.replace(/\D/g, '');
        if (digits.length >= 4) codeSet.add(`VTM-${digits.slice(-6)}`);
      }
      const allCodes = Array.from(codeSet);
      const codeOrFilter = allCodes.map((c) => `referred_by_code.ilike.${encodeURIComponent(c)}`).join(',');

      const [regRefRes, actRes, tblRefRes, claimsRes, cloudStateRes, selfFinRes] = await Promise.all([
        codeOrFilter
          ? sbFetch(
              `vtm_registered_users?or=(${codeOrFilter})&select=uid,email,name,account_number,referred_by_code,created_at&limit=2000`,
              { method: 'GET', signal: AbortSignal.timeout(6000) }
            ).catch(() => null)
          : Promise.resolve(null),
        sbFetch(
          `user_activities?activity_type=in.(SIGNUP,REGISTRATION)&select=user_email,metadata,created_at&limit=3000`,
          { method: 'GET', signal: AbortSignal.timeout(6000) }
        ).catch(() => null),
        sbFetch(
          `vtm_referrals?referrer_email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=2000`,
          { method: 'GET', signal: AbortSignal.timeout(5000) }
        ).catch(() => null),
        sbFetch(
          `vtm_referral_claims?referrer_email=ilike.${encodeURIComponent(cleanEmail)}&order=claimed_at.desc&select=*&limit=500`,
          { method: 'GET', signal: AbortSignal.timeout(5000) }
        ).catch(() => null),
        sbFetch(
          `vtm_cloud_states?user_email=ilike.${encodeURIComponent(cleanEmail)}&state_key=eq.STATE_REFERRALS&select=data&limit=1`,
          { method: 'GET', signal: AbortSignal.timeout(5000) }
        ).catch(() => null),
        sbFetch(
          `vtm_user_finances?user_email=ilike.${encodeURIComponent(cleanEmail)}&select=transactions&limit=5`,
          { method: 'GET', signal: AbortSignal.timeout(5000) }
        ).catch(() => null),
      ]);

      const regRows = regRefRes && regRefRes.ok ? await regRefRes.json().catch(() => []) : [];
      const allActRows = actRes && actRes.ok ? await actRes.json().catch(() => []) : [];
      const matchedActRows = Array.isArray(allActRows)
        ? allActRows.filter((a) => {
            const metaCode = String(a?.metadata?.referredByCode || '').trim().toUpperCase();
            return metaCode && codeSet.has(metaCode);
          })
        : [];
      const tblRows = tblRefRes && tblRefRes.ok ? await tblRefRes.json().catch(() => []) : [];
      const claimRows = claimsRes && claimsRes.ok ? await claimsRes.json().catch(() => []) : [];
      const csRows = cloudStateRes && cloudStateRes.ok ? await cloudStateRes.json().catch(() => []) : [];
      const selfFinRows = selfFinRes && selfFinRes.ok ? await selfFinRes.json().catch(() => []) : [];

      let cloudStateData = Array.isArray(csRows) && csRows[0]?.data ? csRows[0].data : null;
      if (!cloudStateData) {
        const legacyRefActRes = await sbFetch(
          `user_activities?user_email=ilike.${encodeURIComponent(cleanEmail)}&activity_type=eq.STATE_REFERRALS&order=created_at.desc&limit=1`,
          { method: 'GET', signal: AbortSignal.timeout(4000) }
        ).catch(() => null);
        if (legacyRefActRes && legacyRefActRes.ok) {
          const lrRows = await legacyRefActRes.json().catch(() => []);
          if (Array.isArray(lrRows) && lrRows[0]?.metadata?.data) {
            cloudStateData = lrRows[0].metadata.data;
          }
        }
      }

      const refEmailSet = new Set();
      if (Array.isArray(regRows)) regRows.forEach((r) => r?.email && refEmailSet.add(String(r.email).trim().toLowerCase()));
      matchedActRows.forEach((a) => a?.user_email && refEmailSet.add(String(a.user_email).trim().toLowerCase()));
      if (Array.isArray(tblRows)) tblRows.forEach((r) => r?.referred_email && refEmailSet.add(String(r.referred_email).trim().toLowerCase()));
      if (cloudStateData && Array.isArray(cloudStateData.referrals)) {
        cloudStateData.referrals.forEach((r) => r?.referredEmail && refEmailSet.add(String(r.referredEmail).trim().toLowerCase()));
      }
      refEmailSet.delete(cleanEmail);

      // Fetch ONLY deposit transactions for verified referred users
      const referredFinRows = [];
      const refEmails = Array.from(refEmailSet);
      for (let i = 0; i < refEmails.length; i += 35) {
        const chunk = refEmails.slice(i, i + 35);
        const inFilter = chunk.map((e) => `"${e.replace(/"/g, '')}"`).join(',');
        const finRes = await sbFetch(
          `vtm_user_finances?user_email=in.(${encodeURIComponent(inFilter)})&select=user_email,transactions,last_updated`,
          { method: 'GET', signal: AbortSignal.timeout(6000) }
        ).catch(() => null);
        if (finRes && finRes.ok) {
          const rows = await finRes.json().catch(() => []);
          if (Array.isArray(rows)) {
            rows.forEach((row) => {
              const depositTxs = Array.isArray(row?.transactions)
                ? row.transactions.filter((tx) => tx && tx.type === 'DEPOSIT')
                : [];
              referredFinRows.push({
                user_email: row.user_email,
                transactions: depositTxs,
                last_updated: row.last_updated,
              });
            });
          }
        }
      }

      return {
        statusCode: 200,
        payload: {
          ok: true,
          referrerAccountNumber,
          regRows: sanitizePublicPayload(regRows),
          actRows: sanitizePublicPayload(matchedActRows),
          tblRows: sanitizePublicPayload(tblRows),
          claimRows: sanitizePublicPayload(claimRows),
          cloudStateData: sanitizePublicPayload(cloudStateData),
          selfFinRows: sanitizePublicPayload(selfFinRows),
          referredFinRows: sanitizePublicPayload(referredFinRows),
        },
      };
    } catch (err) {
      return { statusCode: 500, payload: { ok: false, error: err?.message || 'Referral fetch failed' } };
    }
  }

  // 8. Authenticated REST Proxy (action === 'rest')
  if (action === 'rest') {
    const rawPath = String(body?.path || '');
    const restMethod = String(body?.method || 'GET').toUpperCase();
    const { table, params } = parseTableAndQuery(rawPath);

    if (!ALLOWED_TABLES.has(table)) {
      return { statusCode: 403, payload: { ok: false, error: `Access to table '${table}' denied.` } };
    }

    const incomingHeaders = body?.headers && typeof body.headers === 'object' ? { ...body.headers } : {};
    delete incomingHeaders.apikey;
    delete incomingHeaders.Apikey;
    delete incomingHeaders.authorization;
    delete incomingHeaders.Authorization;

    let forwardBody = body?.body;
    if (typeof forwardBody === 'string' && forwardBody.trim()) {
      try {
        forwardBody = JSON.parse(forwardBody);
      } catch {
        // leave raw string if not JSON
      }
    }

    // Strict Non-Admin Row Isolation & Privilege Guard
    if (!isSessionAdmin) {
      const cleanSessionEmail = session.email;

      if (table === 'vtm_registered_users') {
        if (restMethod === 'GET') {
          params.set('email', `ilike.${cleanSessionEmail}`);
          params.delete('or');
        } else if (restMethod === 'POST' || restMethod === 'PATCH') {
          if (restMethod === 'PATCH') {
            params.set('email', `ilike.${cleanSessionEmail}`);
          }
          const existingPhone = await fetchExistingPhoneForEmail(cleanSessionEmail);
          const existingUserLookup = await lookupSupabaseUserRow(cleanSessionEmail).catch(() => ({ row: null }));
          const authoritativeRole = existingUserLookup.row?.role === 'marketer' ? 'marketer' : 'normal';
          forwardBody = enforceBodyOwnership(forwardBody, (row) => {
            row.email = cleanSessionEmail;
            row.role = authoritativeRole;
            delete row.password_hash; // Use auth_register/change-password, not arbitrary raw patch
            if (existingPhone) {
              row.phone_number = existingPhone;
            } else if (row.phone_number && !isValidRealPhone(row.phone_number)) {
              delete row.phone_number;
            }
            return row;
          });
        } else {
          return { statusCode: 403, payload: { ok: false, error: 'Forbidden operation on users table.' } };
        }
      } else if (table === 'vtm_user_finances') {
        const cleanUid = session.uid;
        const safeOrFilter = `(user_email.ilike.${cleanSessionEmail},user_key.eq.${cleanUid},user_key.eq.${cleanSessionEmail})`;
        if (restMethod === 'GET' || restMethod === 'PATCH' || restMethod === 'DELETE') {
          params.delete('user_email');
          params.delete('user_key');
          params.set('or', safeOrFilter);
        }
        if (restMethod === 'POST' || restMethod === 'PATCH') {
          forwardBody = enforceBodyOwnership(forwardBody, (row) => {
            row.user_email = cleanSessionEmail;
            if (!row.user_key || (row.user_key !== cleanUid && row.user_key !== cleanSessionEmail)) {
              row.user_key = cleanUid || cleanSessionEmail;
            }
            return row;
          });
        }
      } else if (USER_EMAIL_SCOPED_TABLES.has(table)) {
        if (restMethod === 'GET' || restMethod === 'PATCH' || restMethod === 'DELETE') {
          params.delete('or');
          params.set('user_email', `ilike.${cleanSessionEmail}`);
        }
        if (restMethod === 'POST' || restMethod === 'PATCH') {
          forwardBody = enforceBodyOwnership(forwardBody, (row) => {
            row.user_email = cleanSessionEmail;
            return row;
          });
        }
      } else if (table === 'vtm_referrals') {
        if (restMethod === 'GET' || restMethod === 'PATCH' || restMethod === 'DELETE') {
          params.set('or', `(referrer_email.ilike.${cleanSessionEmail},referred_email.ilike.${cleanSessionEmail})`);
        }
        if (restMethod === 'POST' || restMethod === 'PATCH') {
          const checkOwnership = (row) => {
            const r1 = normalizePlatformEmail(row.referrer_email);
            const r2 = normalizePlatformEmail(row.referred_email);
            if (r1 !== cleanSessionEmail && r2 !== cleanSessionEmail) {
              row.referrer_email = cleanSessionEmail;
            }
            return row;
          };
          forwardBody = enforceBodyOwnership(forwardBody, checkOwnership);
        }
      } else if (table === 'vtm_referral_claims' || table === 'vtm_referral_commissions') {
        if (restMethod === 'GET' || restMethod === 'PATCH' || restMethod === 'DELETE') {
          params.set('referrer_email', `ilike.${cleanSessionEmail}`);
        }
        if (restMethod === 'POST' || restMethod === 'PATCH') {
          forwardBody = enforceBodyOwnership(forwardBody, (row) => {
            if (table === 'vtm_referral_commissions' && normalizePlatformEmail(row.referred_email) === cleanSessionEmail) {
              return row;
            }
            row.referrer_email = cleanSessionEmail;
            return row;
          });
        }
      }
    } else {
      // Admin: STILL protect existing phone_number immutability on vtm_registered_users writes
      if (table === 'vtm_registered_users' && (restMethod === 'POST' || restMethod === 'PATCH')) {
        const targetEmail =
          (Array.isArray(forwardBody) ? forwardBody[0]?.email : forwardBody?.email) ||
          (params.get('email') || '').replace(/^(eq|ilike)\./i, '');
        if (targetEmail && !Array.isArray(forwardBody)) {
          const existingPhone = await fetchExistingPhoneForEmail(targetEmail);
          if (existingPhone && forwardBody && typeof forwardBody === 'object') {
            forwardBody = { ...forwardBody, phone_number: existingPhone };
          }
        }
      }
    }

    const qs = params.toString();
    const targetPath = qs ? `${table}?${qs}` : table;

    try {
      const fetchInit = {
        method: restMethod,
        headers: incomingHeaders,
        signal: AbortSignal.timeout(9000),
      };
      if (restMethod !== 'GET' && restMethod !== 'HEAD' && forwardBody !== undefined) {
        fetchInit.body = typeof forwardBody === 'string' ? forwardBody : JSON.stringify(forwardBody);
      }
      const res = await sbFetch(targetPath, fetchInit);
      const rawText = await res.text();
      let data = null;
      if (rawText) {
        try {
          data = sanitizePublicPayload(JSON.parse(rawText));
        } catch {
          data = rawText;
        }
      }
      return {
        statusCode: res.status,
        payload: data,
        raw: typeof data === 'string' ? data : undefined,
      };
    } catch (err) {
      return {
        statusCode: 502,
        payload: { ok: false, error: err?.message || 'Supabase gateway error' },
      };
    }
  }

  return { statusCode: 400, payload: { ok: false, error: `Unknown action '${action}'` } };
}
