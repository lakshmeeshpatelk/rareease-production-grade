// Type declarations for the Cashfree JS SDK loaded via CDN script tag
// CDN URL: https://sdk.cashfree.com/js/v3/cashfree.js

interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  /** "_modal" opens an in-page modal, "_self" redirects current tab */
  redirectTarget?: '_modal' | '_self' | '_blank';
  onSuccess?: (data?: unknown) => void;
  onFailure?: (data?: unknown) => void;
  onClose?:   () => void;
}

interface CashfreeInstance {
  checkout(options: CashfreeCheckoutOptions): void;
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
