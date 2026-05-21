/**
 * src/lib/orderUtils.ts
 * Generates collision-resistant order IDs.
 * Format: RE-{YYYYMMDD}-{6-char random hex uppercase}
 * Example: RE-20240115-A3F8C2
 */
export function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase().padEnd(6, '0');
  return `RE-${date}-${rand}`;
}