import crypto from 'crypto';

export function getAdminEnvConfig() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const uid = (process.env.ADMIN_UID || '').trim();
  const rawAliases = (process.env.ADMIN_EMAIL_ALIASES || '').trim();
  const aliases = new Set(
    [
      email,
      ...rawAliases
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ].filter(Boolean)
  );
  return { email, uid, aliases };
}

export const MASTER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
export const MASTER_ADMIN_UID = (process.env.ADMIN_UID || '').trim();

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
  const { aliases } = getAdminEnvConfig();
  return aliases.size > 0 && aliases.has(clean);
}

export function normalizePlatformEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  const { email: adminEmail } = getAdminEnvConfig();
  return adminEmail && isMasterAdminEmail(clean) ? adminEmail : clean;
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

function cleanEnvSecret(val) {
  return String(val || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

export function getSupabaseServerConfig() {
  const url = cleanEnvSecret(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = cleanEnvSecret(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      ''
  );
  const anonKey = cleanEnvSecret(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');
  const key = serviceKey || anonKey;
  return {
    url,
    key,
    anonKey,
    isServiceRole: Boolean(serviceKey),
    isConfigured: Boolean(url && key && !url.includes('your-project.supabase.co')),
  };
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

export function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPasswordAgainstStored(candidate, storedHash) {
  const pwd = String(candidate || '');
  const raw = String(storedHash || '');
  if (!pwd || !raw) return { valid: false, needsUpgrade: false };

  if (raw.startsWith('scrypt:')) {
    const parts = raw.split(':');
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      return { valid: false, needsUpgrade: false };
    }
    try {
      const derived = crypto.scryptSync(pwd, parts[1], 64);
      const expected = Buffer.from(parts[2], 'hex');
      if (derived.length === expected.length && crypto.timingSafeEqual(derived, expected)) {
        return { valid: true, needsUpgrade: false };
      }
      const trimmedDerived = crypto.scryptSync(pwd.trim(), parts[1], 64);
      if (
        pwd.trim() !== pwd &&
        trimmedDerived.length === expected.length &&
        crypto.timingSafeEqual(trimmedDerived, expected)
      ) {
        return { valid: true, needsUpgrade: false };
      }
      return { valid: false, needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  const parsedLegacy = parseStoredPasswordAndUid(raw).password || '';
  if (!parsedLegacy) {
    return { valid: false, needsUpgrade: false };
  }
  const match = parsedLegacy === pwd || parsedLegacy.trim() === pwd.trim();
  return { valid: match, needsUpgrade: match };
}

export function signSessionToken(user) {
  const email = normalizePlatformEmail(user.email);
  const { uid: adminUid } = getAdminEnvConfig();
  const isAdmin = isMasterAdminEmail(email) || user.role === 'admin';
  const role = isAdmin
    ? 'admin'
    : user.role === 'marketer'
    ? 'marketer'
    : 'normal';
  const uid = isAdmin && isValidUuid(adminUid)
    ? adminUid
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
    const { uid: adminUid } = getAdminEnvConfig();
    const isAdmin = isMasterAdminEmail(email) || payload.role === 'admin';
    const role = isAdmin
      ? 'admin'
      : payload.role === 'marketer'
      ? 'marketer'
      : 'normal';
    const uid = isAdmin && isValidUuid(adminUid)
      ? adminUid
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
  const { uid: adminUid } = getAdminEnvConfig();
  const isAdmin = isMasterAdminEmail(email) || row?.role === 'admin';
  const parsedHash = parseStoredPasswordAndUid(row?.password_hash);
  let resolvedUid = isAdmin && isValidUuid(adminUid)
    ? adminUid
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
    name: row?.name || (isAdmin ? 'Admin' : 'Trader'),
    email,
    phoneNumber: row?.phone_number || '',
    phone: row?.phone_number || '',
    countryCode: row?.country_code || '+1',
    countryName: row?.country_name || 'United States',
    accountNumber: row?.account_number || '',
    role: safeRole,
    isLoggedIn: true,
    createdAt: row?.created_at ? new Date(row.created_at).getTime() : Date.now(),
    referredByCode: row?.referred_by_code || undefined,
  };
}

async function sbFetch(pathAndQuery, init = {}) {
  const cfg = getSupabaseServerConfig();
  if (!cfg.isConfigured) {
    return new Response(JSON.stringify({ error: 'Database is not configured on the server.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const extraHeaders = init.headers || {};
  return fetch(`${cfg.url}/rest/v1/${pathAndQuery.replace(/^\/+/, '')}`, {
    ...init,
    headers: buildSupabaseHeaders(cfg.key, extraHeaders),
  });
}

async function lookupSupabaseUserRow(cleanEmail) {
  const email = normalizePlatformEmail(cleanEmail);
  const { aliases } = getAdminEnvConfig();
  const isAdmin = isMasterAdminEmail(email);
  const queryFilter =
    isAdmin && aliases.size > 1
      ? `or=(${Array.from(aliases).map((e) => `email.ilike.${encodeURIComponent(e)}`).join(',')})`
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
    if (!cfg.isConfigured) {
      return { statusCode: 200, payload: { success: false, message: 'Database is not configured on the server.' } };
    }
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
    const { uid: adminUid } = getAdminEnvConfig();

    let sbRow = null;
    let sbLookupOk = false;
    let sbErrorStatus = 0;
    try {
      const lookup = await lookupSupabaseUserRow(cleanEmail);
      sbLookupOk = Boolean(lookup.ok);
      sbErrorStatus = lookup.status;
      sbRow = lookup.row;
    } catch {
      sbLookupOk = false;
    }

    const fallbackUser = fallbackDbHelpers?.getUser?.(cleanEmail) || null;
    const fallbackPassword = fallbackDbHelpers?.getPassword?.(cleanEmail) || '';

    if (!sbRow && !fallbackUser) {
      if (!cfg.isConfigured) {
        return {
          statusCode: 503,
          payload: {
            ok: false,
            code: 'DATABASE_NOT_CONFIGURED',
            error: 'Server database connection is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and redeploy.',
          },
        };
      }
      if (!sbLookupOk) {
        if (sbErrorStatus === 401 || sbErrorStatus === 403) {
          return {
            statusCode: 503,
            payload: {
              ok: false,
              code: 'DATABASE_AUTH_ERROR',
              error: `Database authentication failed (HTTP ${sbErrorStatus}). Verify SUPABASE_SERVICE_ROLE_KEY in your Production environment variables and trigger a fresh deploy.`,
            },
          };
        }
        return {
          statusCode: 503,
          payload: {
            ok: false,
            code: 'DATABASE_UNAVAILABLE',
            error: 'Unable to reach the account database right now. Please try again shortly.',
          },
        };
      }
      if (!cfg.isServiceRole) {
        return {
          statusCode: 503,
          payload: {
            ok: false,
            code: 'SERVICE_KEY_REQUIRED',
            error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to your Production environment variables and redeploy.',
          },
        };
      }
      return {
        statusCode: 404,
        payload: { ok: false, code: 'ACCOUNT_NOT_FOUND', error: 'No registered account found for this email. Please create an account first.' },
      };
    }

    const rawStoredHash = sbRow ? String(sbRow.password_hash || '') : String(fallbackPassword || '');
    const verification = verifyPasswordAgainstStored(password, rawStoredHash);
    let passwordValid = verification.valid;
    const needsHashUpgrade = Boolean(sbRow && verification.needsUpgrade);

    if (!passwordValid && cfg.isConfigured && cfg.anonKey) {
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

    const isAdmin = isMasterAdminEmail(cleanEmail) || sbRow?.role === 'admin' || fallbackUser?.role === 'admin';
    const profile = sbRow
      ? rowToUserProfile(sbRow, cleanEmail)
      : {
          ...fallbackUser,
          email: cleanEmail,
          id: isAdmin && isValidUuid(adminUid) ? adminUid : fallbackUser?.id || deterministicUuidFromEmail(cleanEmail),
          role: isAdmin ? 'admin' : fallbackUser?.role === 'marketer' ? 'marketer' : 'normal',
          isLoggedIn: true,
        };

    // Transparently upgrade legacy plaintext/uid-prefixed password_hash to scrypt on successful login
    if (needsHashUpgrade && cfg.isConfigured) {
      sbFetch(`vtm_registered_users?email=ilike.${encodeURIComponent(sbRow.email || cleanEmail)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password_hash: hashPasswordScrypt(password),
          last_login_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => {});
    }

    // Keep fallback DB synchronized if needed (stored hashed)
    if (fallbackDbHelpers?.upsertUser && profile) {
      fallbackDbHelpers.upsertUser(profile, hashPasswordScrypt(password));
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
    const { uid: adminUid } = getAdminEnvConfig();
    const isAdmin = isMasterAdminEmail(cleanEmail);

    let existingRow = null;
    try {
      const lookup = await lookupSupabaseUserRow(cleanEmail);
      existingRow = lookup.row;
    } catch {
      // ignore
    }

    if (existingRow) {
      const regPwdCheck = verifyPasswordAgainstStored(password, existingRow.password_hash);
      if (!regPwdCheck.valid) {
        return {
          statusCode: 409,
          payload: { ok: false, code: 'ACCOUNT_EXISTS', error: 'An account with this email already exists. Please sign in instead.' },
        };
      }
    }

    let authUid = isAdmin && isValidUuid(adminUid)
      ? adminUid
      : existingRow?.uid && isValidUuid(existingRow.uid)
      ? existingRow.uid
      : isValidUuid(incomingProfile.id)
      ? incomingProfile.id
      : deterministicUuidFromEmail(cleanEmail);

    if (!isAdmin && cfg.isConfigured && cfg.anonKey && !existingRow) {
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
    const authoritativeRole = isAdmin || existingRow?.role === 'admin'
      ? 'admin'
      : existingRow?.role === 'marketer'
      ? 'marketer'
      : 'normal';

    const nowIso = new Date().toISOString();
    const hashedPassword = hashPasswordScrypt(password);
    const upsertRow = {
      email: cleanEmail,
      uid: authUid,
      password_hash: hashedPassword,
      name: String(incomingProfile.name || existingRow?.name || (isAdmin ? 'Admin' : 'Trader')).trim(),
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
      fallbackDbHelpers.upsertUser(finalProfile, hashedPassword);
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

  const isSessionAdmin = session.role === 'admin' || isMasterAdminEmail(session.email);

  // 6. Server-side password verification for withdrawals (no password_hash sent to client)
  if (action === 'auth_verify_password') {
    const candidatePwd = String(body?.password || '').trim();
    if (!candidatePwd) {
      return { statusCode: 400, payload: { valid: false, error: 'Password is required.' } };
    }
    try {
      const lookup = await lookupSupabaseUserRow(session.email);
      const dbHash = lookup.row ? String(lookup.row.password_hash || '') : '';
      const fallbackPwd = fallbackDbHelpers?.getPassword?.(session.email) || '';
      const storedHash = dbHash || fallbackPwd;
      const check = verifyPasswordAgainstStored(candidatePwd, storedHash);
      if (check.valid) {
        return { statusCode: 200, payload: { valid: true } };
      }
      if (cfg.isConfigured && cfg.anonKey) {
        try {
          const authRes = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: cfg.anonKey,
            },
            body: JSON.stringify({ email: session.email, password: candidatePwd }),
            signal: AbortSignal.timeout(4000),
          });
          if (authRes.ok) {
            return { statusCode: 200, payload: { valid: true } };
          }
        } catch {
          // ignore
        }
      }
      return {
        statusCode: 200,
        payload: {
          valid: false,
          error: 'Account email and password do not match. Both accounts must use the exact same email and password.',
        },
      };
    } catch {
      return {
        statusCode: 503,
        payload: {
          valid: false,
          error: 'Unable to verify account credentials right now. Please try again.',
        },
      };
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
