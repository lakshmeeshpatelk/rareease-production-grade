'use client';


import Image from 'next/image';


import { useUIStore } from '@/store/uiStore';

export default function Footer() {
  const { openPrivacy, openTerms, openReturns, openShipping, openContact, openEnquiry } = useUIStore();

  return (
    <footer className="footer-m">
      {/* Logo */}
      <div className="footer-m-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image src="/logo-text.svg" alt="Rare Ease" className="footer-logo-img" width={160} height={28} />
        <p className="footer-m-tagline">
          Premium streetwear for those who exist between worlds.<br />
          Crafted in India. Worn everywhere.
        </p>

        {/* Social */}
        <div className="footer-m-social">

          {/* Instagram — official gradient logo */}
          <a href="https://www.instagram.com/rareeaseofficial?igsh=MWxtZHluYmxlYWNtYw==" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Instagram">
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ig-bg" cx="30%" cy="107%" r="150%">
                  <stop offset="0%" stopColor="#ffd676"/>
                  <stop offset="20%" stopColor="#f86f3f"/>
                  <stop offset="45%" stopColor="#e1306c"/>
                  <stop offset="70%" stopColor="#833ab4"/>
                  <stop offset="100%" stopColor="#4060b0"/>
                </radialGradient>
              </defs>
              {/* Background rounded square */}
              <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#ig-bg)"/>
              {/* Camera body outline */}
              <rect x="6" y="6" width="12" height="12" rx="3.5" fill="none" stroke="white" strokeWidth="1.6"/>
              {/* Lens circle */}
              <circle cx="12" cy="12" r="3.2" fill="none" stroke="white" strokeWidth="1.6"/>
              {/* Flash dot */}
              <circle cx="16.5" cy="7.5" r="0.9" fill="white"/>
            </svg>
          </a>

          {/* WhatsApp — official green logo */}
          <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919999999999'}?text=Hi%2C%20I%20need%20help%20with%20my%20Rare%20Ease%20order`} target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="WhatsApp">
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {/* Green circle background */}
              <circle cx="12" cy="12" r="11" fill="#25D366"/>
              {/* Official WhatsApp handset path */}
              <path
                fill="white"
                d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.3-.345.451-.523.146-.181.194-.3.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.796.375-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"
              />
              {/* Tail of speech bubble */}
              <path
                fill="#25D366"
                d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.413A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 01-4.055-1.107l-.29-.173-3.018.857.844-3.072-.19-.3A7.963 7.963 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"
              />
            </svg>
          </a>

        </div>

        {/* Email */}
        <a
          href="mailto:rareeaseofficial@gmail.com"
          className="footer-m-email"
          rel="noopener noreferrer"
        >
          rareeaseofficial@gmail.com
        </a>
      </div>

      {/* Link groups */}
      <div className="footer-m-links">
<div className="footer-m-group">
          <div className="footer-m-group-title">Support</div>
          <button className="footer-m-link" onClick={openContact}>Contact Us</button>
          <button className="footer-m-link" onClick={openEnquiry}>Custom Enquiry</button>
          <button className="footer-m-link" onClick={openShipping}>Shipping Policy</button>
        </div>

        <div className="footer-m-group">
          <div className="footer-m-group-title">Our Policies</div>
          <button className="footer-m-link" onClick={openPrivacy}>Privacy Policy</button>
          <button className="footer-m-link" onClick={openTerms}>Terms of Service</button>
          <button className="footer-m-link" onClick={openReturns}>Return, Refund & Cancellation Policy</button>
        </div>
      </div>

      {/* Bottom */}
      <div className="footer-m-bottom">
        © 2026 Rare Ease. All rights reserved. Made with care in India
      </div>
    </footer>
  );
}
