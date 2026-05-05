// Type declarations for the Cashfree JS SDK loaded via CDN script tag
// CDN URL: https://sdk.cashfree.com/js/v3/cashfree.js
// API Docs: https://docs.cashfree.com/docs/web-sdk-javascript

interface CashfreePaymentDetails {
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  cf_payment_id?: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_message?: string;
  order_id?: string;
}

interface CashfreeCheckoutResult {
  paymentDetails?: CashfreePaymentDetails;
  error?: { message: string; type?: string };
  redirect?: boolean;
}

interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  /** "_modal" opens an in-page modal; "_self" redirects current tab */
  redirectTarget?: '_modal' | '_self' | '_blank';
}

interface CashfreeInstance {
  /** Returns a Promise that resolves when the modal closes */
  checkout(options: CashfreeCheckoutOptions): Promise<CashfreeCheckoutResult>;
}

interface CashfreeConstructorOptions {
  mode: 'sandbox' | 'production';
}

declare global {
  interface Window {
    Cashfree: new (options: CashfreeConstructorOptions) => CashfreeInstance;
  }
}

export {};