'use client';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';

export default function AdminReviews() {
  const { reviews, loadReviews, approveReview, deleteReview, loading } = useAdminStore();
  const [filter, setFilter] = useState<'all'|'pending'|'approved'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => { loadReviews(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = reviews.filter(r => {
    const matchF = filter === 'all' || (filter === 'pending' ? !r.approved : r.approved);
    const q = query.toLowerCase();
    const matchQ = !q || r.productName.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q);
    return matchF && matchQ;
  });

  const pending  = reviews.filter(r => !r.approved).length;
  const approved = reviews.filter(r => r.approved).length;

  return (
    <div>
      {/* Summary */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[
          { label:'Total Reviews', value: reviews.length },
          { label:'Pending Approval', value: pending, warn: pending > 0 },
          { label:'Approved', value: approved },
        ].map(s => (
          <div key={s.label} style={{background:'var(--adm-surface)',border:`1px solid ${s.warn ? 'rgba(244,162,90,0.25)' : 'var(--adm-border)'}`,padding:'14px 20px',flex:1}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--adm-muted)',marginBottom:6}}>{s.label}</div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:'0.04em',color:s.warn ? 'var(--adm-orange)' : 'var(--adm-text)'}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input className="adm-search-input" placeholder="Search by product or customer…" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} />
        </div>
        {(['all','pending','approved'] as const).map(f => (
          <button key={f} className={`adm-act-btn${filter === f ? ' adm-act-btn--sage' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pending > 0 && <span className="adm-nav-badge" style={{position:'static',marginLeft:6}}>{pending}</span>}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="adm-empty">
          <div className="adm-empty-icon">★</div>
          <div className="adm-empty-text">{filter === 'pending' ? 'No pending reviews' : 'No reviews found'}</div>
        </div>
      )}

      {visible.map(r => (
        <div className="adm-review-card" key={r.id}>
          <div>
            <div className="adm-review-meta">
              <div className="adm-stars">
                {[1,2,3,4,5].map(i => <span key={i} className={`adm-star${i <= r.rating ? ' lit' : ''}`}>★</span>)}
              </div>
              <span>{r.customer}</span>
              {r.verified && <span className="adm-badge adm-badge--active" style={{padding:'2px 6px'}}>Verified</span>}
              <span style={{marginLeft:'auto'}}>{r.createdAt}</span>
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:8,fontWeight:600}}>{r.productName}</div>
            <div className="adm-review-body">{r.body}</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end',justifyContent:'flex-start',flexShrink:0}}>
            <span className={`adm-badge adm-badge--${r.approved ? 'approved' : 'unapproved'}`}>
              {r.approved ? 'Approved' : 'Pending'}
            </span>
            {!r.approved && (
              <button className="adm-act-btn adm-act-btn--green" onClick={() => approveReview(r.id)}>
                Approve
              </button>
            )}
            <button className="adm-act-btn adm-act-btn--red" onClick={() => deleteReview(r.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
