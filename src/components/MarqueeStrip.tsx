'use client';

const ITEMS = [
  'Street Core', '✦', 'Wear The Rare', '✦',
  'Feel The Ease', '✦', 'Crafted In India', '✦',
  'SS25 Now Live', '✦', 'New Drops Weekly', '✦',
  'Premium GSM', '✦', 'Oversized Fits', '✦',
];

export default function MarqueeStrip() {
  const track = [...ITEMS, ...ITEMS, ...ITEMS];
  return (
    <div className="mq-root" aria-hidden>
      <div className="mq-track">
        {track.map((item, i) => (
          <span key={i} className="mq-item">{item}</span>
        ))}
      </div>
    </div>
  );
}
