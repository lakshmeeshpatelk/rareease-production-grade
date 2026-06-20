/**
 * src/lib/orderUtils.ts
 *
 * Generates collision-resistant, cryptographically unpredictable order IDs.
 *
 * FIX: Replaced Math.random() with crypto.randomBytes().
 * Math.random() is a pseudo-random number generator — its output is
 * statistically predictable and NOT safe for security-sensitive identifiers.
 * With only 6 hex characters (16^6 = ~16M combinations per day), an attacker
 * who knows approximate order timing could enumerate order IDs and use the
 * order tracking endpoint to read other customers' addresses.
 *
 * crypto.randomBytes(4) gives 32 bits of cryptographic entropy (~4 billion
 * combinations) and cannot be predicted by an attacker.
 *
 * Format: RE-{YYYYMMDD}-{8-char random hex uppercase}
 * Example: RE-20240115-A3F8C2D9
 */

import crypto from 'crypto';

export function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `RE-${date}-${rand}`;
}