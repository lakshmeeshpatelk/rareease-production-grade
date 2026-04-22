'use client';
import { useState, useRef, useEffect } from 'react';
import { AdminOrder } from '@/lib/adminData';
import { formatPrice } from '@/lib/utils';
import { useAdminStore } from '@/store/adminStore';

const STATUSES = ['all','pending','processing','shipped','delivered','cancelled'] as const;
const COURIERS = ['Shiprocket','DTDC','Delhivery','BlueDart','Ecom Express','India Post','Other'];
const DATE_RANGES = ['all','today','7d','30d','custom'] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function inRange(iso: string, range: string, from: string, to: string): boolean {
  const d = new Date(iso).getTime();
  const now = Date.now();
  if (range === 'today') return d >= new Date().setHours(0,0,0,0);
  if (range === '7d')    return d >= now - 7 * 86400000;
  if (range === '30d')   return d >= now - 30 * 86400000;
  if (range === 'custom') {
    const f = from ? new Date(from).getTime() : 0;
    const t = to   ? new Date(to).getTime() + 86400000 : Infinity;
    return d >= f && d <= t;
  }
  return true;
}

// ── Print invoice ─────────────────────────────────────────────────
function printInvoice(order: AdminOrder) {
  const win = window.open('', '_blank');
  if (!win) return;
  const rows = order.items.map(i => `<tr><td>${i.name} (${i.size})</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">₹${(i.price).toLocaleString('en-IN')}</td><td style="text-align:right">₹${(i.price*i.qty).toLocaleString('en-IN')}</td></tr>`).join('');
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice #${order.id}</title><style>
    body{font-family:sans-serif;padding:32px;color:#111;max-width:600px;margin:0 auto}
    h1{font-size:28px;letter-spacing:.08em;margin:0 0 4px}
    .sub{font-size:12px;color:#888;margin-bottom:24px}
    .meta{display:flex;justify-content:space-between;margin-bottom:24px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{border-bottom:2px solid #111;padding:8px 4px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.08em}
    td{padding:10px 4px;border-bottom:1px solid #e5e5e5;font-size:13px}
    .total{text-align:right;font-size:16px;font-weight:700;padding-top:8px}
    .addr{font-size:12px;color:#555;line-height:1.6}
    .badge{display:inline-block;padding:2px 10px;border:1px solid #ccc;font-size:11px;border-radius:2px;text-transform:uppercase;letter-spacing:.08em}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>RARE EASE</h1><div class="sub">TAX INVOICE / PACKING SLIP</div>
    <div class="meta">
      <div><strong>Order:</strong> #${order.id}<br><strong>Date:</strong> ${fmtDate(order.createdAt)}<br><strong>Method:</strong> <span class="badge">${order.paymentMethod}</span>&nbsp;<span class="badge">${order.payment}</span></div>
      <div style="text-align:right"><strong>Ship to:</strong><div class="addr">${order.customer}<br>${order.phone}<br>${order.address}</div></div>
    </div>
    ${order.trackingNumber ? `<div style="margin-bottom:16px;font-size:12px"><strong>Tracking:</strong> ${order.courier ? order.courier+' — ' : ''}${order.trackingNumber}</div>` : ''}
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="total">Total: ₹${order.total.toLocaleString('en-IN')}</div>
    <div style="margin-top:32px;font-size:11px;color:#bbb;text-align:center">Rare Ease · rareeaseofficial@gmail.com · rareease.com</div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`);
  win.document.close();
}

export default function AdminOrders() {
  const { orders, loadOrders, updateOrderStatus, loading } = useAdminStore();
  const [filter,    setFilter]    = useState('all');
  const [query,     setQuery]     = useState('');
  const [dateRange, setDateRange] = useState<typeof DATE_RANGES[number]>('all');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [selected,  setSelected]  = useState<AdminOrder | null>(null);
  const [tracking,  setTracking]  = useState('');
  const [courier,   setCourier]   = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [bulkSel,   setBulkSel]   = useState<Set<string>>(new Set());

  useEffect(() => { loadOrders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = orders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter;
    const q = query.toLowerCase();
    const matchQuery = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.city.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.phone.includes(q);
    const matchDate = inRange(o.createdAt, dateRange, dateFrom, dateTo);
    return matchFilter && matchQuery && matchDate;
  });

  const allBulkSelected = visible.length > 0 && visible.every(o => bulkSel.has(o.id));
  const toggleBulk = (id: string) => setBulkSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllBulk = () => setBulkSel(allBulkSelected ? new Set() : new Set(visible.map(o => o.id)));

  const [srPushing, setSrPushing] = useState(false);
  const [srMsg,     setSrMsg]     = useState('');

  const bulkUpdateStatus = async (status: AdminOrder['status']) => {
    await Promise.all([...bulkSel].map(id => updateOrderStatus(id, status)));
    setBulkSel(new Set());
  };

  const updateStatus = async (id: string, status: AdminOrder['status']) => {
    await updateOrderStatus(id, status);
    if (selected?.id === id) setSelected(p => p ? { ...p, status } : null);
  };

  const saveTracking = async () => {
    if (!selected) return;
    await updateOrderStatus(selected.id, selected.status, { tracking_number: tracking, courier });
    setSelected(p => p ? { ...p, trackingNumber: tracking, courier } : null);
  };

  const saveNote = async () => {
    if (!selected) return;
    await updateOrderStatus(selected.id, selected.status, { notes: noteInput });
    setSelected(p => p ? { ...p, notes: noteInput } : null);
  };

  const pushToShiprocket = async () => {
    if (!selected) return;
    setSrPushing(true); setSrMsg('');
    try {
      const res = await fetch('/api/admin/shiprocket/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selected.id }),
      });
      const data = await res.json() as { awb_code?: string; courier_name?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Push failed');
      setSrMsg(`✓ Pushed to Shiprocket${data.awb_code ? ` — AWB: ${data.awb_code}` : ''}`);
      if (data.awb_code) setSelected(p => p ? { ...p, trackingNumber: data.awb_code ?? '', courier: data.courier_name ?? '' } : null);
    } catch (e) {
      setSrMsg(`✕ ${e instanceof Error ? e.message : 'Error pushing to Shiprocket'}`);
    } finally {
      setSrPushing(false);
    }
  };

  const openDetail = (o: AdminOrder) => {
    setSelected(o);
    setTracking(o.trackingNumber ?? '');
    setCourier(o.courier ?? '');
    setNoteInput(o.notes ?? '');
    setSrMsg('');
  };

  const exportCSV = () => {
    const header = 'Order ID,Customer,Email,City,Items,Total,Payment,Status,Tracking,Courier,Date';
    const rows = visible.map(o =>
      `"${o.id}","${o.customer}","${o.email}","${o.city}","${o.items.map(i=>`${i.name} (${i.size})×${i.qty}`).join('; ')}",${o.total},"${o.paymentMethod}","${o.payment}","${o.status}","${o.trackingNumber??''}","${o.courier??''}","${new Date(o.createdAt).toLocaleDateString('en-IN')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='rareease-orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="adm-toolbar" style={{ flexWrap:'wrap', gap:8 }}>
        <div className="adm-search-wrap">
          <span className="adm-search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
          <input className="adm-search-input" placeholder="Search ID, customer, email, city…" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} />
        </div>
        <select className="adm-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select className="adm-filter-select" value={dateRange} onChange={e => setDateRange(e.target.value as typeof DATE_RANGES[number])}>
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
        {dateRange === 'custom' && (
          <>
            <input type="date" className="adm-filter-select" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{padding:'6px 10px'}} />
            <input type="date" className="adm-filter-select" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{padding:'6px 10px'}} />
          </>
        )}
        <button className="adm-header-btn" onClick={exportCSV} style={{ marginLeft:'auto' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      {/* Bulk actions bar */}
      {bulkSel.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(195,206,148,0.07)', border:'1px solid rgba(195,206,148,0.2)', marginBottom:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--adm-sage)', letterSpacing:'0.1em' }}>{bulkSel.size} selected</span>
          <div style={{ width:1, height:16, background:'rgba(255,255,255,0.1)' }} />
          {(['processing','shipped','delivered','cancelled'] as AdminOrder['status'][]).map(s => (
            <button key={s} className="adm-act-btn" onClick={() => bulkUpdateStatus(s)}>
              → {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
          <button className="adm-act-btn" style={{ marginLeft:'auto' }} onClick={() => setBulkSel(new Set())}>✕ Clear</button>
        </div>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>
                <input type="checkbox" checked={allBulkSelected} onChange={toggleAllBulk}
                  style={{ accentColor:'var(--adm-sage)', width:14, height:14, cursor:'pointer' }} />
              </th>
              <th>Order ID</th><th>Customer</th><th>City</th><th>Items</th>
              <th>Total</th><th>Payment</th><th>Status</th><th>Tracking</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={11} style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.2)'}}>No orders found</td></tr>
            )}
            {visible.map(o => (
              <tr key={o.id} style={{ background: bulkSel.has(o.id) ? 'rgba(195,206,148,0.04)' : undefined }}>
                <td><input type="checkbox" checked={bulkSel.has(o.id)} onChange={() => toggleBulk(o.id)} style={{ accentColor:'var(--adm-sage)', width:14, height:14, cursor:'pointer' }} /></td>
                <td><span style={{ fontFamily:'Bebas Neue,sans-serif', letterSpacing:'0.05em', color:'rgba(255,255,255,0.7)' }}>#{o.id}</span></td>
                <td style={{ fontWeight:600 }}>{o.customer}</td>
                <td className="muted">{o.city}</td>
                <td className="muted">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                <td><span style={{ fontFamily:'Bebas Neue,sans-serif', letterSpacing:'0.05em' }}>{formatPrice(o.total)}</span></td>
                <td>
                  <span className={`adm-badge adm-badge--${o.paymentMethod === 'COD' ? 'processing' : 'active'}`} style={{ marginRight:4 }}>{o.paymentMethod}</span>
                  <span className={`adm-badge adm-badge--${o.payment}`}>{o.payment}</span>
                </td>
                <td><span className={`adm-badge adm-badge--${o.status}`}>{o.status}</span></td>
                <td className="muted" style={{ fontSize:11 }}>
                  {o.trackingNumber ? <span style={{ color:'var(--adm-sage)' }}>{o.courier ? `${o.courier}` : ''} ✓</span> : <span style={{ color:'var(--adm-dim)' }}>—</span>}
                </td>
                <td className="muted">{fmtDate(o.createdAt)}</td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-act-btn adm-act-btn--sage" onClick={() => openDetail(o)}>View</button>
                    <select className="adm-filter-select" style={{ padding:'4px 8px', fontSize:10 }} value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value as AdminOrder['status'])}>
                      {['pending','processing','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="adm-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="adm-modal" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <span className="adm-modal-title">ORDER #{selected.id}</span>
              <div style={{ display:'flex', gap:8 }}>
                <button className="adm-act-btn" onClick={() => printInvoice(selected)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print Invoice
                </button>
                <button className="adm-act-btn adm-act-btn--icon" onClick={() => setSelected(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            <div className="adm-modal-body">
              {/* Customer info */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                {[['Customer',selected.customer],['Email',selected.email],['Phone',selected.phone],['City',selected.city]].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:3 }}>Delivery Address</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>{selected.address}</div>
              </div>

              {/* Items */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:8 }}>Order Items</div>
                {selected.items.map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontSize:13 }}>{item.name}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Size {item.size} × {item.qty}</div>
                    </div>
                    <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:16, color:'rgba(255,255,255,0.7)' }}>{formatPrice(item.price * item.qty)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)' }}>Total</span>
                  <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, color:'#c3ce94' }}>{formatPrice(selected.total)}</span>
                </div>
              </div>

              {/* Tracking */}
              <div style={{ marginBottom:16, padding:'14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>Shipment Tracking</div>
                  <button
                    className="adm-act-btn"
                    style={{ fontSize:9, background:'rgba(195,206,148,0.08)', border:'1px solid rgba(195,206,148,0.25)', color:'var(--adm-sage)', opacity: srPushing ? 0.6 : 1 }}
                    onClick={pushToShiprocket}
                    disabled={srPushing}
                    title="Create this order on Shiprocket and get AWB code"
                  >
                    {srPushing ? '⏳ Pushing…' : '🚀 Push to Shiprocket'}
                  </button>
                </div>
                {srMsg && (
                  <div style={{ marginBottom:8, fontSize:11, color: srMsg.startsWith('✓') ? 'var(--adm-sage)' : '#f4a25a', letterSpacing:'0.03em' }}>{srMsg}</div>
                )}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <select className="adm-field-select" style={{ flex:1, minWidth:130 }} value={courier} onChange={e => setCourier(e.target.value)}>
                    <option value="">Select courier…</option>
                    {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="adm-field-input" style={{ flex:2, minWidth:160 }} placeholder="AWB / Tracking number" value={tracking} onChange={e => setTracking(e.target.value)} />
                  <button className="adm-act-btn adm-act-btn--sage" onClick={saveTracking}>Save</button>
                </div>
                {selected.trackingNumber && (
                  <div style={{ marginTop:8, fontSize:12, color:'var(--adm-sage)' }}>
                    ✓ {selected.courier ? `${selected.courier} — ` : ''}{selected.trackingNumber}
                    {selected.trackingNumber && (
                      <a
                        href={`https://shiprocket.co/tracking/${selected.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft:8, fontSize:10, color:'rgba(195,206,148,0.6)', textDecoration:'underline' }}
                      >
                        Track ↗
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Internal note */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:6 }}>Internal Note</div>
                <textarea className="adm-field-textarea" rows={2} value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Add an internal note (not visible to customer)…" />
                <button className="adm-act-btn" style={{ marginTop:6 }} onClick={saveNote}>Save Note</button>
                {selected.notes && <div style={{ marginTop:6, fontSize:11, color:'rgba(255,255,255,0.35)' }}>Last saved: {selected.notes}</div>}
              </div>

              {/* Status + payment badges */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span className={`adm-badge adm-badge--${selected.status}`}>{selected.status}</span>
                <span className={`adm-badge adm-badge--${selected.paymentMethod === 'COD' ? 'processing' : 'active'}`}>{selected.paymentMethod}</span>
                <span className={`adm-badge adm-badge--${selected.payment}`}>{selected.payment}</span>
              </div>
            </div>

            <div className="adm-modal-footer">
              <select className="adm-filter-select" value={selected.status}
                onChange={e => updateStatus(selected.id, e.target.value as AdminOrder['status'])}>
                {['pending','processing','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="adm-header-btn adm-header-btn--primary" onClick={() => setSelected(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
