'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Puma-sourced measurements adapted for Rare Ease oversized streetwear
const MEN = [
  { size: 'S',   chest: '33–36"', chestCm: '84–92 cm',  waist: '30–32"', waistCm: '76–82 cm',  shoulder: '17.5"' },
  { size: 'M',   chest: '36–39"', chestCm: '92–100 cm', waist: '32–34"', waistCm: '82–88 cm',  shoulder: '18.5"' },
  { size: 'L',   chest: '39–42"', chestCm: '100–108 cm',waist: '34–37"', waistCm: '88–96 cm',  shoulder: '19.5"' },
  { size: 'XL',  chest: '42–45"', chestCm: '108–116 cm',waist: '37–41"', waistCm: '96–104 cm', shoulder: '20.5"' },
  { size: 'XXL', chest: '45–48"', chestCm: '116–124 cm',waist: '41–45"', waistCm: '104–114 cm',shoulder: '21.5"' },
];

const WOMEN = [
  { size: 'S',   bust: '33–35"',  bustCm: '84–90 cm',   waist: '26–28"', waistCm: '68–74 cm',  hip: '35–37"',  hipCm: '89–94 cm'  },
  { size: 'M',   bust: '36–38"',  bustCm: '91–98 cm',   waist: '29–31"', waistCm: '75–82 cm',  hip: '38–40"',  hipCm: '96–102 cm' },
  { size: 'L',   bust: '39–41"',  bustCm: '99–106 cm',  waist: '32–34"', waistCm: '83–90 cm',  hip: '41–43"',  hipCm: '104–109 cm'},
  { size: 'XL',  bust: '42–44"',  bustCm: '107–114 cm', waist: '35–37"', waistCm: '91–98 cm',  hip: '44–46"',  hipCm: '112–117 cm'},
  { size: 'XXL', bust: '45–47"',  bustCm: '115–122 cm', waist: '38–40"', waistCm: '99–106 cm', hip: '47–49"',  hipCm: '119–124 cm'},
];

export default function SizeGuide({ gender = 'men' }: { gender?: 'men' | 'women' }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'men' | 'women'>(gender);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button className="sg-trigger" onClick={() => setOpen(true)}>
        Size Guide
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="sg-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="sg-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="sg-handle-wrap">
                <div className="sg-handle" />
              </div>

              {/* Header */}
              <div className="sg-header">
                <div>
                  <div className="sg-header-label">Measurements</div>
                  <div className="sg-header-title">Size Guide</div>
                </div>
                <button className="sg-close" onClick={() => setOpen(false)}>✕</button>
              </div>

              {/* Gender tabs */}
              <div className="sg-tabs">
                <button
                  className={`sg-tab${tab === 'men' ? ' active' : ''}`}
                  onClick={() => setTab('men')}
                >Men&apos;s</button>
                <button
                  className={`sg-tab${tab === 'women' ? ' active' : ''}`}
                  onClick={() => setTab('women')}
                >Women&apos;s</button>
              </div>

              {/* Unit toggle */}
              <div className="sg-unit-toggle">
                <button className={`sg-unit-btn${unit === 'in' ? ' active' : ''}`} onClick={() => setUnit('in')}>Inches</button>
                <button className={`sg-unit-btn${unit === 'cm' ? ' active' : ''}`} onClick={() => setUnit('cm')}>CM</button>
              </div>

              {/* Model note */}
              <div className="sg-model-note">
                {tab === 'men'
                  ? <>Our model is <strong>6&apos;1&quot; (185cm)</strong> and wears size <strong>M</strong>. All pieces run with a relaxed, oversized fit.</>
                  : <>Our model is <strong>5&apos;7&quot; (170cm)</strong> and wears size <strong>S</strong>. All pieces run with an oversized silhouette — size down for a closer fit.</>
                }
              </div>

              {/* Source credit */}
              <div className="sg-source">Size data sourced from Puma India size guide</div>

              {/* Table */}
              {tab === 'men' ? (
                <div className="sg-table-wrap">
                  <div className="sg-table-head sg-row-men">
                    {['Size','Chest','Waist','Shoulder'].map(h => (
                      <div key={h} className="sg-th">{h}</div>
                    ))}
                  </div>
                  {MEN.map((row, i) => (
                    <div key={row.size} className={`sg-row sg-row-men${i % 2 ? ' sg-row-alt' : ''}`}>
                      <div className="sg-td sg-td-size">{row.size}</div>
                      <div className="sg-td">{unit === 'in' ? row.chest : row.chestCm}</div>
                      <div className="sg-td">{unit === 'in' ? row.waist : row.waistCm}</div>
                      <div className="sg-td">{row.shoulder}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sg-table-wrap">
                  <div className="sg-table-head sg-row-women">
                    {['Size','Bust','Waist','Hip'].map(h => (
                      <div key={h} className="sg-th">{h}</div>
                    ))}
                  </div>
                  {WOMEN.map((row, i) => (
                    <div key={row.size} className={`sg-row sg-row-women${i % 2 ? ' sg-row-alt' : ''}`}>
                      <div className="sg-td sg-td-size">{row.size}</div>
                      <div className="sg-td">{unit === 'in' ? row.bust : row.bustCm}</div>
                      <div className="sg-td">{unit === 'in' ? row.waist : row.waistCm}</div>
                      <div className="sg-td">{unit === 'in' ? row.hip : row.hipCm}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fit tips */}
              <div className="sg-tips">
                <div className="sg-tips-title">Fit Tips</div>
                {[
                  'Measure chest / bust at the widest point, keeping the tape level.',
                  tab === 'men'
                    ? 'All pieces are oversized — size down one if you prefer a regular street fit.'
                    : 'All pieces run oversized — size down for a relaxed (not extreme) oversized silhouette.',
                  'Cotton may shrink 1–2 cm after first wash. Cold wash recommended.',
                  'When in between sizes, size up for max comfort.',
                ].map((tip, i) => (
                  <div key={i} className="sg-tip">
                    <span className="sg-tip-dot">·</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>

              <div style={{ height: 32 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
