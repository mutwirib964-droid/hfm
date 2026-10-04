import { PriceAlert, Instrument } from '../types';

const STORAGE_PRICE_ALERTS_KEY = 'vtm_price_alerts';
const STORAGE_PRICE_ALERTS_UPDATED_KEY = 'vtm_price_alerts_updated_at';

function getAlertsKey(userEmail?: string | null): string {
  if (!userEmail) return STORAGE_PRICE_ALERTS_KEY;
  return `${STORAGE_PRICE_ALERTS_KEY}_${userEmail.trim().toLowerCase()}`;
}

function getAlertsUpdatedKey(userEmail?: string | null): string {
  if (!userEmail) return STORAGE_PRICE_ALERTS_UPDATED_KEY;
  return `${STORAGE_PRICE_ALERTS_UPDATED_KEY}_${userEmail.trim().toLowerCase()}`;
}

/**
 * Load stored price alerts from localStorage
 */
export function loadPriceAlerts(userEmail?: string | null): PriceAlert[] {
  try {
    const userKey = getAlertsKey(userEmail);
    const raw = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_PRICE_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load price alerts from storage', err);
    return [];
  }
}

export function getPriceAlertsUpdatedAt(userEmail?: string | null): number {
  try {
    const raw =
      localStorage.getItem(getAlertsUpdatedKey(userEmail)) ||
      localStorage.getItem(STORAGE_PRICE_ALERTS_UPDATED_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Persist price alerts to localStorage
 */
export function savePriceAlerts(
  alerts: PriceAlert[],
  userEmail?: string | null,
  updatedAt?: number
): void {
  try {
    const ts = updatedAt ?? Date.now();
    const serialized = JSON.stringify(alerts);
    localStorage.setItem(STORAGE_PRICE_ALERTS_KEY, serialized);
    localStorage.setItem(STORAGE_PRICE_ALERTS_UPDATED_KEY, String(ts));
    if (userEmail) {
      localStorage.setItem(getAlertsKey(userEmail), serialized);
      localStorage.setItem(getAlertsUpdatedKey(userEmail), String(ts));
    }
  } catch (err) {
    console.error('Failed to save price alerts to storage', err);
  }
}

/**
 * Play a high-precision audio chime for triggered price alerts using Web Audio API
 */
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Tone 1: High crisp alert chime (Sine Wave, 880Hz to 1320Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.28);

    // Tone 2: Harmonic confirmation chime (1760Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.42);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

/**
 * Calculate distance in pips and percentage between market price and alert target
 */
export function calculateAlertDistance(
  inst: Instrument | undefined,
  alert: PriceAlert
): {
  currentPrice: number;
  difference: number;
  pips: number;
  percent: number;
  isHit: boolean;
} {
  if (!inst) {
    return {
      currentPrice: alert.initialPrice,
      difference: 0,
      pips: 0,
      percent: 0,
      isHit: false,
    };
  }

  const currentPrice = alert.targetType === 'BID' ? inst.bid : inst.ask;
  const difference = alert.targetPrice - currentPrice;

  // Pip calculation depends on asset decimals:
  // For 5 decimals (e.g. EURUSD), 1 pip = 0.0001 (10^4)
  // For 3 decimals (e.g. USDJPY), 1 pip = 0.01 (10^2)
  // For Gold (XAUUSD 2 decimals), 1 pip = 0.1 or 0.01
  const pipMultiplier = inst.decimals >= 4 ? 10000 : inst.decimals === 3 ? 100 : inst.decimals === 2 ? 10 : 1;
  const pips = Math.abs(difference) * pipMultiplier;
  const percent = currentPrice > 0 ? (difference / currentPrice) * 100 : 0;

  let isHit = false;
  if (alert.condition === 'ABOVE_OR_EQUAL') {
    isHit = currentPrice >= alert.targetPrice;
  } else {
    isHit = currentPrice <= alert.targetPrice;
  }

  return {
    currentPrice,
    difference,
    pips,
    percent,
    isHit,
  };
}
