'use client';

import { useUIStore } from '@/store/uiStore';

interface Props { onClose: () => void; }

export default function CheckoutOverlayTrigger({ onClose }: Props) {
  const { openCheckout } = useUIStore();

  const handleCheckout = () => {
    onClose();
    openCheckout();
  };

  return (
    <button className="cart-checkout-btn" onClick={handleCheckout}>
      Proceed to Checkout
    </button>
  );
}
