'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useOverlayHistory } from '@/lib/useOverlayHistory';
import { useUIStore } from '@/store/uiStore';

type PageType = 'privacy' | 'terms' | 'returns' | 'shipping';

interface Props { type: PageType; }

const CONTENT: Record<PageType, { title: string; date: string; sections: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    date: 'Effective: 1 January 2025',
    sections: [
      {
        heading: 'Overview',
        body: 'This Privacy Policy ("Policy") relates to the manner Rare Ease ("we", "us", "our") in which we use, handle and process the data that you provide us in connection with using the products or services we offer. By using this website or by availing goods or services offered by us, you agree to the terms and conditions of this Policy, and consent to our use, storage, disclosure, and transfer of your information or data in the manner described in this Policy. We are committed to ensuring that your privacy is protected in accordance with applicable laws and regulations. Rare Ease may change this Policy periodically and we urge you to check this page for the latest version of the Policy in order to keep yourself updated.',
      },
      {
        heading: 'What Data Is Being Collected',
        body: 'Personal information as contemplated under our Policy may include sensitive personal data or information as identified under the prevailing applicable laws and shall include the following: (i) password; (ii) addresses, phone numbers, and emails; (iii) any detail relating to the above clauses as provided to us for providing service; (iv) any of the information received under the above clauses by us for processing, stored, or processed by us; and (v) any such additional information that you may voluntarily disclose to us for the purposes of improving, enhancing and customizing your shopping experience. All personal information that we collect about you will be recorded, used, and protected by us. We may supplement the information you provide with other information that we obtain from our dealings with you or from other organizations, such as our sponsors and partners.',
      },
      {
        heading: 'How We Use Your Data',
        body: 'We use your data for the following purposes: (i) to administer and provide products and services you purchase, request or have expressed an interest in; (ii) processing of payments when you place an order on our website; (iii) to enable us to administer any competitions or other offers/promotions which you enter into; (iv) for fraud screening and prevention purposes; (v) for crime prevention and detection purposes; (vi) for marketing purposes of Rare Ease products; (vii) for record-keeping purposes; (viii) to carry out market research so that we can improve the products and services we offer; (ix) to create an individual profile for you so that we can understand and respect your preferences and offer products of your interest; (x) feedback provided by you as part of customer survey either in writing or on call including voice recordings for quality and training purposes; (xi) for data anonymization.',
      },
      {
        heading: 'Payment Security',
        body: 'Notwithstanding anything under this Policy, as required under applicable Indian laws, we will not be storing any credit card, debit card or any other similar card data of yours. All data or information collected from you will be strictly in accordance with applicable laws and guidelines. We do not store any payment information on our servers. All payments are processed using Cashfree Payments. Your financial information is transmitted directly to Cashfree using industry-standard TLS encryption.',
      },
      {
        heading: 'Consent to Contact Over SMS/Call',
        body: 'If you have provided Rare Ease with your phone number, you acknowledge and accept that Rare Ease may call you and/or send SMS to inform you about your order and/or any offers. By providing the contact number, you expressly consent to Rare Ease contacting you for the said purposes even if your number is registered with the National Do Not Call Registry / registered for DND.',
      },
      {
        heading: 'Information We Collect',
        body: 'Information You Give Us: The website receives and stores any information you enter on our website or give us in any other way including personal information. You can choose not to provide certain information but then you might not be able to take advantage of many of our features and the shopping experience may not be optimized for you. Rare Ease uses the information that you provide for purposes such as responding to your requests, customizing future shopping for you, improving our platform, and communicating with you. Automatic Information: Rare Ease receives and stores certain types of information whenever you interact with us. We use cookies and obtain certain types of information when your web browser accesses the website. Rare Ease may also receive/store information about your location and your mobile device, including a unique identifier for your device.',
      },
      {
        heading: 'How We Use Cookies',
        body: 'Cookies are alphanumeric identifiers that we transfer to your computer\'s hard drive through your web browser to enable our systems to recognize your browser and provide features such as personalized recommendations and storage of items in your Shopping Cart between visits. We also use cookies to allow you to enter your password less frequently during a session. If you block or otherwise reject our cookies, you will not be able to add items to your Shopping Cart, proceed to Checkout, or use any website products and services that require you to sign in. We use cookies from third-party partners for marketing and analytical purposes.',
      },
      {
        heading: 'Data Sharing',
        body: 'We do not sell, rent, share or otherwise disclose your personal information to any third party except as set out in this Privacy Policy. We share information on a limited basis with service providers we use to provide services on our behalf, such as sending postal mail and email, analyzing data, providing marketing assistance, and providing customer service. We may disclose personal information when we believe it is appropriate to enforce or apply our Terms & Conditions and/or protect the rights, property, or safety of the website, our users, or others, or as otherwise required or permitted by applicable law.',
      },
      {
        heading: 'Your Rights Relating to Your Data',
        body: 'Right to Review: You can review the data provided by you and request us to correct or amend such data (to the extent feasible, as determined by us). Withdrawal of Consent: You can choose not to provide your data, at any time while availing our goods or services or otherwise withdraw your consent provided to us earlier, in writing to our email ID: rareeaseofficial@gmail.com. In the event you choose to not provide or later withdraw your consent, we may not be able to provide you with our services or goods. Please note that these rights are subject to our compliance with applicable laws.',
      },
      {
        heading: 'How Long We Retain Your Data',
        body: 'We may retain your information or data (i) for as long as we are providing goods and services to you; and (ii) as permitted under applicable law, we may also retain your data or information even after you terminate the business relationship with us. However, we will process such information or data in accordance with applicable laws and this Policy.',
      },
      {
        heading: 'Data Security',
        body: 'We will use commercially reasonable and legally required precautions to preserve the integrity and security of your information and data.',
      },
      {
        heading: 'Fraud Protection',
        body: 'Keep track of your Order ID — it appears in all communications regarding your order from the confirmation stage to dispatch. When making a cash on delivery payment, please confirm that the Order ID you have matches that of the delivery agent\'s. Never pay the delivery agent or any courier business in cash or by any online method for prepaid orders. Never share your Delivery OTP to a delivery agent over the phone. Share the Delivery Cancellation OTP with the delivery agent only if you wish to cancel the order.',
      },
      {
        heading: 'Queries / Grievance Officer',
        body: 'For any queries, questions or grievances about this Policy, please contact us at rareeaseofficial@gmail.com. We will respond within 30 days.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    date: 'Effective: 1 January 2025',
    sections: [
      { heading: '1. Acceptance of Terms', body: 'By accessing rareease.com and placing an order, you agree to these Terms & Conditions in full. We reserve the right to update these terms; continued use after changes constitutes acceptance.' },
      { heading: '2. Products & Pricing', body: 'All prices are in Indian Rupees (INR) and inclusive of applicable GST. We reserve the right to change prices at any time. Product descriptions are provided in good faith; minor variations in colour may occur due to screen calibration differences.' },
      { heading: '3. Order Acceptance', body: 'An order confirmation email does not constitute acceptance of your order. We reserve the right to cancel any order for reasons including stock unavailability, payment failure, suspected fraud, or pricing errors. In such cases, a full refund will be issued.' },
      { heading: '4. Payment', body: 'We accept all major credit/debit cards, UPI, net banking, and wallets via Cashfree Payments. Payment must be received in full before dispatch.' },
      { heading: '5. Intellectual Property', body: 'All content on this website is the exclusive property of Rare Ease and protected by copyright law. Unauthorised reproduction is strictly prohibited.' },
      { heading: '6. Limitation of Liability', body: 'Rare Ease\'s liability is limited to the value of the order in question. We are not liable for indirect, incidental, or consequential damages.' },
      { heading: '7. Governing Law', body: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Bengaluru, Karnataka.' },
    ],
  },
  returns: {
    title: 'Return, Refund & Cancellation Policy',
    date: 'Effective: 1 January 2025',
    sections: [
      {
        heading: 'Overview',
        body: 'Rare Ease believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Please read the following carefully to understand our exchange, cancellation, and refund terms.',
      },
      {
        heading: 'Exchange Grace Period',
        body: 'Unhappy with your pick? Worry not! Within 48 hours of delivery, you may swap for a new piece in case of damage, wrong item, or size issue. Kindly note that any custom or personalised pieces are carefully crafted to meet your individual needs and preferences, making them unique to you. As such, we are unable to accommodate exchanges on custom orders — but we\'re confident you\'ll treasure your one-of-a-kind creation!',
      },
      {
        heading: 'Eligibility Criteria',
        body: 'To be eligible for an exchange, items must be returned in their original condition — tags intact, unworn, unused, unwashed, and with all original packaging materials intact. Items that do not meet these conditions will not be approved for exchange.',
      },
      {
        heading: 'Time Limit',
        body: 'You must initiate an exchange within 48 hours of receiving your order. After this grace period, no exchanges are possible under any circumstances.',
      },
      {
        heading: 'Shipping Costs',
        body: 'Rare Ease covers return shipping costs if the exchange is required due to our mistake — such as a wrong item dispatched or a manufacturing defect. For size exchanges or any other reason not covered above, the shipping cost is borne by the customer.',
      },
      {
        heading: 'Cancellation Policy',
        body: 'Orders can be cancelled within 2 working days of placing the order. Once you have received a confirmation from our production team via email, the order cannot be cancelled. No cancellations will be accepted after production has commenced.',
      },
      {
        heading: 'How to Initiate an Exchange',
        body: 'To request an exchange, reach out to our customer care at rareeaseofficial@gmail.com. Please share clear photo and video proof of the issue along with your order number. Once approved — usually within 10 days — your replacement item will be dispatched. If any of the above conditions are not fulfilled, we will not be able to approve your exchange request.',
      },
      {
        heading: 'Damaged or Defective Items',
        body: 'In case of receipt of damaged or defective items, please report the same to our Customer Service team on the same day of receipt. The request will be entertained once our team has reviewed and verified the issue. If you feel that the product received is not as shown on the site or does not meet your expectations, you must bring it to the notice of our customer service on the same day of receiving the product. Our Customer Service team, after reviewing your complaint, will take an appropriate decision.',
      },
      {
        heading: 'Important Notes',
        body: 'Rare Ease does not accept general returns. Rare Ease is not liable for any customer-induced product damage. No refund is available except in cases where Rare Ease is at fault (wrong item, manufacturing defect). Order processing takes 2 working days from the date of ordering. Please account for this when planning for time-sensitive deliveries.',
      },
    ],
  },
  shipping: {
    title: 'Shipping & Delivery Policy',
    date: 'Effective: 1 January 2025',
    sections: [
      {
        heading: 'Overview',
        body: 'Embark on a seamless shopping experience with Rare Ease, where timely delivery and enticing offers await you!',
      },
      {
        heading: 'Shipping Chronicles',
        body: 'Orders will be dispatched within 24 hours and will be delivered within: Minimum time 4 days. Maximum time 8 days. Prepaid pioneers, revel in the joy of your package arriving in just 7 to 10 Working days.',
      },
      {
        heading: 'Elevate the Experience',
        body: 'Bask in the luxury of free shipping pan India.',
      },
      {
        heading: 'Prepaid Perks',
        body: 'If you\'re venturing into the realm of prepaid orders, there\'s an extra treat for you — relish an exclusive 5% discount. Consider it our token of appreciation for your trust and swiftness.',
      },
      {
        heading: 'Delivery Responsibility',
        body: 'Rare Ease is not liable for any delay in delivery by the courier company / postal authorities and only guarantees to hand over the consignment to the courier company or postal authorities within 6-7 days from the date of the order and payment or as per the delivery date agreed at the time of order confirmation. Delivery of all orders will be to the address provided by the buyer. Delivery of our services will be confirmed on your mail ID as specified during registration.',
      },
      {
        heading: 'Our Promise',
        body: 'At Rare Ease, we understand that time is of the essence, and we strive to ensure your orders reach you promptly, wrapped in the care and quality that define our brand. Let the journey of your chosen products commence, and we\'ll ensure it\'s a voyage to remember!',
      },
    ],
  },
};

export default function StaticPageOverlay({ type }: Props) {
  const {
    isPrivacyOpen,  closePrivacy,
    isTermsOpen,    closeTerms,
    isReturnsOpen,  closeReturns,
    isShippingOpen, closeShipping,
  } = useUIStore();

  const isOpen =
    type === 'privacy'  ? isPrivacyOpen  :
    type === 'terms'    ? isTermsOpen    :
    type === 'returns'  ? isReturnsOpen  :
    isShippingOpen;

  const close =
    type === 'privacy'  ? closePrivacy  :
    type === 'terms'    ? closeTerms    :
    type === 'returns'  ? closeReturns  :
    closeShipping;

  const content = CONTENT[type];

  useEscapeKey(close, isOpen);
  useOverlayHistory(isOpen, close);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="static-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={content.title}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <button className="static-close-btn" onClick={close}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <div className="static-content">
            <h1>{content.title}</h1>
            <p className="effective-date">{content.date}</p>
            {content.sections.map((section, i) => (
              <div key={section.heading} style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  marginBottom: 0,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.2em',
                    flexShrink: 0,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 style={{ margin: 0 }}>{section.heading}</h2>
                </div>
                <p style={{ paddingLeft: 32 }}>{section.body}</p>
              </div>
            ))}
            <div style={{
              marginTop: 60, paddingTop: 32,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
              lineHeight: 1.8,
            }}>
              For questions, contact{' '}
              <a href="mailto:rareeaseofficial@gmail.com" style={{ color: 'var(--sage)', textDecoration: 'none' }}>
                rareeaseofficial@gmail.com
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}