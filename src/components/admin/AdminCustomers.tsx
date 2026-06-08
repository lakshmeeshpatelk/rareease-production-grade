'use client';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';

function formatPrice(n: number) { return n === 0 ? '—' : '₹' + n.toLocaleString('en-IN'); }

type Customer = {
  id: string; name: string; email: string; phone: string; city: string;
  orders: number; totalSpent: number; joined: string; lastOrder: string;
};

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { orders: allOrders } = useAdminStore();
  const customerOrders = allOrders.filter(o =>
    o.customer === customer.name || o.email === customer.email
  );

  const avgOrder = customer.orders > 0 && customer.totalSpent > 0
    ? Math.round(customer.totalSpent / customer.orders) : 0;

  const tag = customer.totalSpent > 4000 ? 'VIP' : customer.orders > 1 ? 'Repeat' : 'New';
  const tagColor = tag === 'VIP' ? 'var(--adm-sage)' : tag === 'Repeat' ? 'var(--adm-orange)' : 'rgba(255,255,255,0.3)';

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth:600 }} onClick={e => e.stopPropagation()}>
        <div className="adm-modal-hd">
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(195,206,148,0.12)', border:'1px solid rgba(195,206,148,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:18, color:'var(--adm-sage)', flexShrink:0 }}>
              {customer.name.split(' ').map(w => w[0]).join('').slice(0,2)}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className="adm-modal-title">{customer.name}</span>
                <span style={{ fontSize:10, fontWeight:700, color:tagColor, padding:'2px 8px', border:`1px solid ${tagColor}`, borderRadius:2, letterSpacing:'0.12em' }}>{tag}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--adm-muted)', marginTop:2 }}>{customer.email} · {customer.phone}</div>
            </div>
          </div>
          <button className="adm-act-btn adm-act-btn--icon" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="adm-modal-body">
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Total Spent',  value: formatPrice(customer.totalSpent), accent: true },
              { label:'Orders',       value: customer.orders },
              { label:'Avg Order',    value: formatPrice(avgOrder) },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', padding:'12px 14px' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:24, color: s.accent ? 'var(--adm-sage)' : 'var(--adm-text)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {[['City', customer.city], ['Joined', customer.joined], ['Last Order', customer.lastOrder], ['Phone', customer.phone]].map(([k,v]) => (
              <div key={k}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Email action */}
          <div style={{ marginBottom:20, display:'flex', gap:8 }}>
            <a href={`mailto:${customer.email}`} className="adm-act-btn adm-act-btn--sage" style={{ textDecoration:'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email Customer
            </a>
            <a href={`https://wa.me/91${customer.phone}`} target="_blank" rel="noopener noreferrer" className="adm-act-btn" style={{ textDecoration:'none' }}>WhatsApp</a>
          </div>

          {/* Order history */}
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:10 }}>Order History</div>
            {customerOrders.length === 0 ? (
              <div style={{ fontSize:12, color:'var(--adm-dim)', padding:'16px 0' }}>No orders found for this customer.</div>
            ) : customerOrders.map(o => (
              <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:14, letterSpacing:'0.06em', color:'rgba(255,255,255,0.7)', marginBottom:3 }}>#{o.id}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>
                    {o.items.map(i => `${i.name} (${i.size})`).join(', ')}
                  </div>
                  <div style={{ fontSize:10, color:'var(--adm-dim)', marginTop:2 }}>
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span className={`adm-badge adm-badge--${o.status}`}>{o.status}</span>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:16, color:'rgba(255,255,255,0.6)', marginTop:4 }}>{formatPrice(o.total)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-modal-footer">
          <button className="adm-header-btn adm-header-btn--primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomers() {
  const { customers, loadCustomers, loadOrders, loading } = useAdminStore();
  const [query,   setQuery]   = useState('');
  const [sortBy,  setSortBy]  = useState<'joined'|'spent'|'orders'>('joined');
  const [detail,  setDetail]  = useState<Customer | null>(null);

  useEffect(() => { loadCustomers(); loadOrders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders  = customers.reduce((s, c) => s + c.orders, 0);

  const filtered = customers
    .filter(c => {
      const q = query.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'spent')  return b.totalSpent - a.totalSpent;
      if (sortBy === 'orders') return b.orders - a.orders;
      return b.id.localeCompare(a.id);
    });

  const exportCSV = () => {
    const header = 'Name,Email,Phone,City,Orders,Total Spent,Joined,Last Order';
    const rows = filtered.map(c =>
      `"${c.name}","${c.email}","${c.phone}","${c.city}",${c.orders},${c.totalSpent},"${c.joined}","${c.lastOrder}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='rareease-customers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading.customers && customers.length === 0) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--adm-muted)', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading customers…</div>;
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Customers', value: customers.length },
          { label:'Total Orders',    value: totalOrders },
          { label:'Total Revenue',   value: '₹' + totalRevenue.toLocaleString('en-IN'), accent: true },
          { label:'Avg Order Value', value: totalOrders > 0 ? '₹' + Math.round(totalRevenue / totalOrders).toLocaleString('en-IN') : '—' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--adm-surface)', border:'1px solid var(--adm-border)', padding:'16px 18px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.28em', textTransform:'uppercase', color:'var(--adm-muted)', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:30, letterSpacing:'0.04em', color: s.accent ? 'var(--adm-sage)' : 'var(--adm-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <span className="adm-search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
          <input className="adm-search-input" placeholder="Search customers…" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} />
        </div>
        <select className="adm-filter-select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
          <option value="joined">Sort: Newest</option>
          <option value="spent">Sort: Top Spenders</option>
          <option value="orders">Sort: Most Orders</option>
        </select>
        <button className="adm-header-btn" onClick={exportCSV} style={{ marginLeft:'auto' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>Customer</th><th>Contact</th><th>City</th><th>Orders</th><th>Total Spent</th><th>Joined</th><th>Last Order</th><th>Action</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.2)' }}>No customers found</td></tr>
            )}
            {filtered.map(c => {
              const tag = c.totalSpent > 4000 ? 'VIP' : c.orders > 1 ? 'Repeat' : null;
              return (
                <tr key={c.id} style={{ cursor:'pointer' }} onClick={() => setDetail(c)}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(195,206,148,0.12)', border:'1px solid rgba(195,206,148,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bebas Neue,sans-serif', fontSize:13, color:'var(--adm-sage)', flexShrink:0 }}>
                        {c.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <span style={{ fontWeight:600 }}>{c.name}</span>
                        {tag && <span style={{ marginLeft:6, fontSize:9, fontWeight:700, color: tag === 'VIP' ? 'var(--adm-sage)' : 'var(--adm-orange)', padding:'1px 5px', border:`1px solid currentColor`, borderRadius:2, letterSpacing:'0.1em' }}>{tag}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize:12 }}>{c.email}</div>
                    <div style={{ fontSize:11, color:'var(--adm-muted)', marginTop:2 }}>{c.phone}</div>
                  </td>
                  <td className="muted">{c.city}</td>
                  <td style={{ textAlign:'center' }}>{c.orders}</td>
                  <td><span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:16, color: c.totalSpent > 0 ? 'var(--adm-text)' : 'var(--adm-dim)' }}>{formatPrice(c.totalSpent)}</span></td>
                  <td className="muted">{c.joined}</td>
                  <td className="muted">{c.lastOrder}</td>
                  <td><button className="adm-act-btn adm-act-btn--sage" onClick={e => { e.stopPropagation(); setDetail(c); }}>View</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && <CustomerDetail customer={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
