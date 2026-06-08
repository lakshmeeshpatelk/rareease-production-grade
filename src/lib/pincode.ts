/**
 * India Post Pincode Lookup
 * Uses the free api.postalpincode.in API to validate pincodes and auto-fill city/state.
 */

export type PincodeResult =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; district: string; state: string }
  | { status: 'invalid'; error: string };

const CACHE_KEY_PREFIX = 're_pincode_';
const memCache = new Map<string, PincodeResult>();

function readCache(pincode: string): PincodeResult | null {
  if (memCache.has(pincode)) return memCache.get(pincode)!;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + pincode);
    if (raw) {
      const result = JSON.parse(raw) as PincodeResult;
      memCache.set(pincode, result);
      return result;
    }
  } catch { /* sessionStorage unavailable (SSR or private mode) */ }
  return null;
}

function writeCache(pincode: string, result: PincodeResult) {
  memCache.set(pincode, result);
  try { sessionStorage.setItem(CACHE_KEY_PREFIX + pincode, JSON.stringify(result)); } catch { /* ignore */ }
}

export async function checkPincode(pincode: string): Promise<PincodeResult> {
  if (!/^\d{6}$/.test(pincode)) {
    return { status: 'invalid', error: 'Enter a valid 6-digit pincode' };
  }

  const cached = readCache(pincode);
  if (cached) return cached;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    const first = data?.[0];
    if (first?.Status === 'Success' && Array.isArray(first.PostOffice) && first.PostOffice.length > 0) {
      const po = first.PostOffice[0];
      const result: PincodeResult = {
        status: 'valid',
        district: po.District ?? po.Division ?? po.Name ?? '',
        state: po.State ?? '',
      };
      writeCache(pincode, result);
      return result;
    }
    const result: PincodeResult = { status: 'invalid', error: 'Pincode not found' };
    writeCache(pincode, result);
    return result;
  } catch {
    // On network failure, don't block the user — treat as idle so they can proceed
    return { status: 'idle' };
  }
}
