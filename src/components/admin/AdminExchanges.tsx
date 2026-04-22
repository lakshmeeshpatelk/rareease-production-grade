'use client';
import { useState, useEffect } from 'react';
import { ExchangeRequest } from '@/lib/adminData';
import { formatPrice } from '@/lib/utils';
import { useAdminStore } from '@/store/adminStore';

const SIZES = ['XS','S','M','L','XL','XXL'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function hoursAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.round(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h/24)}d ago`;
}

export default function AdminExchanges() {
  const { exchanges: requests, loadExchanges, updateExchangeStatus } = useAdminStore();
  const [filter, setFilter] = useState<'all'|'pending'|'approved'|'rejected'|'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all'|'exchange'|'cancellation'>('all');
  const [selected, setSelected] = useState<ExchangeRequest | null>(null);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => { loadExchanges(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = requests.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter;
    const matchType   = typeFilter === 'all' || r.type === typeFilter;
    return matchStatus && matchType;
  });

  const pending   = requests.filter(r => r.status === 'pending').length;
  const approved  = requests.filter(r => r.status === 'approved').length;
  const completed = requests.filter(r => r.status === 'completed').length;
  const exchanges = requests.filter(r => r.type === 'exchange').length;
  const cancels   = requests.filter(r => r.type === 'cancellation').length;

  const updateStatus = async (id: string, status: ExchangeRequest['status']) => {
    await updateExchangeStatus(id, status);
    if (selected?.id === id) setSelected(p => p ? { ...p, status } : null);
  };

  const saveNote = async (id: string) => {
    if (!noteInput.trim()) return;
    await updateExchangeStatus(id, selected?.status ?? 'pending', noteInput.trim());
    if (selected?.id === id) setSelected(p => p ? { ...p, adminNote: noteInput.trim() } : null);
    setNoteInput('');
  };

  const openDetail = (r: ExchangeRequest) => {
    setSelected(r);
    setNoteInput(r.adminNote ?? '');
  };

  const statusColor: Record<string,string> = {
    pending:'processing', approved:'active', rejected:'cancelled', completed:'delivered',
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Requests', value: requests.length },
          { label:'Pending', value: pending, warn: pending > 0 },
          { label:'Approved', value: approved, sage: true },
          { label:'Completed', value: completed },
          { label:'Exchanges / Cancels', value: `${exchanges} / ${cancels}` },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--adm-surface)', border:`1px solid ${s.warn ? 'rgba(244,162,90,0.3)' : 'var(--adm-border)'}`, padding:'14px 16px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--adm-muted)', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:'0.04em', color: s.warn ? 'var(--adm-orange)' : s.sage ? 'var(--adm-sage)' : 'var(--adm-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Policy reminder */}
      <div style={{ padding:'10px 16px', background:'rgba(195,206,148,0.06)', border:'1px solid rgba(195,206,148,0.2)', marginBottom:16, fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>
        📋 <strong style={{color:'rgba(255,255,255,0.6)'}}>Policy:</strong> Exchange within 48hrs of delivery — damage / wrong item / size only. No general returns. Cancellation within 2 working days before production.
      </div>

      {/* Toolbar */}
      <div className="adm-toolbar" style={{ flexWrap:'wrap', gap:8 }}>
        {(['all','pending','approved','rejected','completed'] as const).map(f => (
          <button key={f} className={`adm-act-btn${filter === f ? ' adm-act-btn--sage' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pending > 0 && <span className="adm-nav-badge" style={{position:'static',marginLeft:6}}>{pending}</span>}
          </button>
        ))}
        <div style={{ flex:1 }} />
        {(['all','exchange','cancellation'] as const).map(t => (
          <button key={t} className={`adm-act-btn${typeFilter === t ? ' adm-act-btn--sage' : ''}`} onClick={() => setTypeFilter(t)}>
            {t === 'all' ? 'All Types' : t === 'cancellation' ? 'Return / Cancel' : 'Exchange'}
          </button>
        ))}
      </div>

      {/* Request cards */}
      {visible.length === 0 && (
        <div className="adm-empty">
          <div className="adm-empty-icon">✓</div>
          <div className="adm-empty-text">No requests found</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {visible.map(r => (
          <div key={r.id} style={{ background:'var(--adm-surface)', border:`1px solid ${r.status === 'pending' ? 'rgba(244,162,90,0.25)' : 'var(--adm-border)'}`, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:14, flexWrap:'wrap' }}>

              {/* Left: info */}
              <div style={{ flex:1, minWidth:220 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:15, letterSpacing:'0.06em', color:'rgba(255,255,255,0.7)' }}>#{r.orderId}</span>
                  <span className={`adm-badge adm-badge--${r.type === 'exchange' ? 'processing' : 'shipped'}`}>{r.type === 'cancellation' ? 'Return/Cancel' : 'Exchange'}</span>
                  <span className={`adm-badge adm-badge--${statusColor[r.status]}`}>{r.status}</span>
                  {!r.withinWindow && <span className="adm-badge adm-badge--cancelled">Out of window</span>}
                </div>

                <div style={{ fontSize:13, fontWeight:600, color:'var(--adm-text)', marginBottom:2 }}>{r.customer}</div>
                <div style={{ fontSize:11, color:'var(--adm-muted)', marginBottom:8 }}>{r.email} · {r.phone}</div>

                <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginBottom:4 }}>
                  <strong style={{ color:'rgba(255,255,255,0.7)' }}>Reason:</strong> {r.reasonLabel}
                  {r.shippingBy === 'rareease' && <span style={{ marginLeft:8, fontSize:10, color:'var(--adm-sage)', fontWeight:700 }}>· Shipping covered by us</span>}
                </div>

                <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>
                  Items: {r.items.map(i => `${i.name} (${i.size})`).join(', ')}
                  {r.wantSize && <span style={{ color:'var(--adm-sage)', marginLeft:6 }}>→ wants size {r.wantSize}</span>}
                </div>

                {r.proofNote && (
                  <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(195,206,148,0.06)', border:'1px solid rgba(195,206,148,0.15)', fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>
                    📎 {r.proofNote}
                  </div>
                )}
                {r.adminNote && (
                  <div style={{ marginTop:6, padding:'8px 10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>
                    📝 {r.adminNote}
                  </div>
                )}
              </div>

              {/* Right: meta + actions */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                <div style={{ fontSize:11, color:'var(--adm-dim)', textAlign:'right' }}>
                  Requested {hoursAgo(r.requestedAt)}
                  {r.deliveredAt && <div>Delivered {fmtDate(r.deliveredAt)}</div>}
                </div>

                <div style={{ display:'flex', gap:6 }}>
                  <button className="adm-act-btn adm-act-btn--sage" onClick={() => openDetail(r)}>Details</button>
                  {r.status === 'pending' && (
                    <>
                      <button className="adm-act-btn adm-act-btn--green" onClick={() => updateStatus(r.id, 'approved')}>Approve</button>
                      <button className="adm-act-btn adm-act-btn--red"   onClick={() => updateStatus(r.id, 'rejected')}>Reject</button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button className="adm-act-btn adm-act-btn--sage" onClick={() => updateStatus(r.id, 'completed')}>Mark Complete</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="adm-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="adm-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <div>
                <span className="adm-modal-title">{selected.type === 'exchange' ? 'EXCHANGE' : 'RETURN / CANCEL'} · {selected.id}</span>
                <div style={{ fontSize:10, color:'var(--adm-muted)', marginTop:2 }}>Order #{selected.orderId}</div>
              </div>
              <button className="adm-act-btn adm-act-btn--icon" onClick={() => setSelected(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="adm-modal-body">
              {/* Status + window */}
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                <span className={`adm-badge adm-badge--${statusColor[selected.status]}`}>{selected.status}</span>
                <span className={`adm-badge adm-badge--${selected.withinWindow ? 'active' : 'cancelled'}`}>
                  {selected.withinWindow ? '✓ Within window' : '✗ Window expired'}
                </span>
                <span className={`adm-badge adm-badge--${selected.shippingBy === 'rareease' ? 'active' : 'processing'}`}>
                  Shipping: {selected.shippingBy === 'rareease' ? 'We cover it' : 'Customer pays'}
                </span>
              </div>

              {/* Customer info */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                {[['Customer', selected.customer], ['Email', selected.email], ['Phone', selected.phone], ['Reason', selected.reasonLabel]].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:8 }}>Items</div>
                {selected.items.map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontSize:13 }}>{item.name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>
                        Size {item.size} × {item.qty}
                        {selected.wantSize && <span style={{ color:'var(--adm-sage)', marginLeft:8 }}>→ wants {selected.wantSize}</span>}
                      </div>
                    </div>
                    <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:15, color:'rgba(255,255,255,0.6)' }}>{formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>

              {/* Proof note */}
              {selected.proofNote && (
                <div style={{ marginBottom:16, padding:'10px 12px', background:'rgba(195,206,148,0.06)', border:'1px solid rgba(195,206,148,0.2)', fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
                  📎 Proof note: {selected.proofNote}
                </div>
              )}

              {/* Timeline */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:8 }}>Timeline</div>
                {([
                  selected.deliveredAt ? { label:'Delivered', time: fmtDate(selected.deliveredAt) } : null,
                  { label:'Request received', time: fmtDate(selected.requestedAt) },
                ] as ({ label: string; time: string } | null)[])
                  .filter((ev): ev is { label: string; time: string } => ev !== null)
                  .map((ev, i) => (
                  <div key={i} style={{ display:'flex', gap:10, marginBottom:6 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'rgba(195,206,148,0.4)', marginTop:5, flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>{ev.label}</div>
                      <div style={{ fontSize:10, color:'var(--adm-dim)' }}>{ev.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin note */}
              <div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:6 }}>Admin Note</div>
                <textarea
                  className="adm-field-textarea"
                  rows={2}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Add a note about this request..."
                />
                <button className="adm-act-btn adm-act-btn--sage" style={{ marginTop:6 }} onClick={() => saveNote(selected.id)}>Save Note</button>
              </div>
            </div>

            <div className="adm-modal-footer">
              {selected.status === 'pending' && (
                <>
                  <button className="adm-act-btn adm-act-btn--green" style={{ flex:1 }} onClick={() => { updateStatus(selected.id, 'approved'); setSelected(null); }}>Approve</button>
                  <button className="adm-act-btn adm-act-btn--red"   style={{ flex:1 }} onClick={() => { updateStatus(selected.id, 'rejected'); setSelected(null); }}>Reject</button>
                </>
              )}
              {selected.status === 'approved' && (
                <button className="adm-act-btn adm-act-btn--sage" style={{ flex:1 }} onClick={() => { updateStatus(selected.id, 'completed'); setSelected(null); }}>Mark Complete</button>
              )}
              <button className="adm-header-btn" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
