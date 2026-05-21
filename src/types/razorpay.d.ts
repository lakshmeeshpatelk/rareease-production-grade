// Type declarations for the Razorpay JS SDK loaded via CDN script tag
// CDN URL: https://checkout.razorpay.com/v1/checkout.js
// API Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
}

interface RazorpayFailureResponse {
  error: {
    code:        string;
    description: string;
    source:      string;
    step:        string;
    reason:      string;
    metadata?: {
      order_id:   string;
      payment_id: string;
    };
  };
}

interface RazorpayOptions {
  key:          string;
  order_id:     string;
  amount:       number;   // paise
  currency:     string;
  name?:        string;
  description?: string;
  image?:       string;
  prefill?: {
    name?:    string;
    email?:   string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  /** Called on successful payment — signature must be verified server-side */
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
    escape?: boolean;
    animation?: boolean;
  };
}

interface RazorpayInstance {
  open(): void;
  close(): void;
  on(event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void): void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export {};
