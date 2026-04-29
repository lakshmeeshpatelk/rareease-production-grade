'use client';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { formatPrice } from '@/lib/utils';

type Range = '7d' | '30d' | 'all';

function buildRevData(range: Range, revenueByDay: Record<string, number>) {
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 14;
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = range === '7d'
      ? d.toLocaleDateString('en-IN', { weekday: 'short' })
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    labels.push(label);
    values.push(revenueByDay[key] ?? 0);
  }
  return { labels, values };
}

function getTopProducts(orders: import('@/lib/adminData').AdminOrder[]) {
  const map: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 };
      map[item.name].qty += item.qty;
      map[item.name].revenue += item.price * item.qty;
    });
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

export default function AdminDashboard({ onNav }: { onNav: (p: string) => void }) {
  const [range, setRange] = useState<Range>('7d');
  const { dashboardStats, orders, loadDashboard, loadOrders, loading } = useAdminStore();

  useEffect(() => {
    loadDashboard();
    loadOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = dashboardStats;
  const revenueByDay = stats?.revenueByDay ?? {};
  const { labels, values } = buildRevData(range, revenueByDay);
  const maxRev = Math.max(...values, 1);
  const totalRev = values.reduce((s, v) => s + v, 0);
  const recentOrders = orders.slice(0, 6);
  const topProducts = getTopProducts(orders);

  const isLoading = loading.dashboard;

  if (isLoading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--adm-muted)', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="adm-stats-grid">
        {[
          { label: 'Total Revenue',       value: formatPrice(stats?.revenue ?? 0),          sub: `${stats?.totalOrders ?? 0} orders`, accent: true },
          { label: 'Pending / Processing', value: stats?.pending ?? 0,                       sub: 'Needs attention' },
          { label: 'Shipped',              value: stats?.shipped ?? 0,                        sub: 'In transit' },
          { label: 'Pending Reviews',      value: stats?.pendingReviews ?? 0,                sub: 'Awaiting approval' },
        ].map(s => (
          <div className="adm-stat-card" key={s.label}>
            <div className="adm-stat-label">{s.label}</div>
            <div className={`adm-stat-value${s.accent ? ' adm-stat-accent' : ''}`}>{s.value}</div>
            <div className="adm-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', padding: '20px 22px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--adm-muted)' }}>Revenue</span>
          <div style={{ display: 'flex', gap: 1 }}>
            {(['7d', '30d', 'all'] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                style={{ padding: '4px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', border: '1px solid var(--adm-border)', background: range === r ? 'rgba(195,206,148,0.15)' : 'transparent', color: range === r ? 'var(--adm-sage)' : 'var(--adm-muted)', transition: 'all 0.15s' }}>
                {r === 'all' ? '2 Wks' : r}
              </button>
            ))}
          </div>
          <span style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 22, letterSpacing: '0.04em', color: 'var(--adm-sage)' }}>
            {formatPrice(totalRev)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: range === '30d' ? 3 : 8, height: 80 }}>
          {values.map((rev, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div title={rev > 0 ? formatPrice(rev) : 'No orders'}
                style={{ width: '100%', height: Math.max(4, (rev / maxRev) * 64), background: rev > 0 ? `rgba(195,206,148,${0.3 + (rev / maxRev) * 0.7})` : 'rgba(255,255,255,0.06)', border: `1px solid ${rev > 0 ? 'rgba(195,206,148,0.4)' : 'rgba(255,255,255,0.06)'}`, transition: 'height 0.3s ease' }} />
              {range !== '30d' && <div style={{ fontSize: 9, color: 'var(--adm-dim)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{labels[i]}</div>}
            </div>
          ))}
        </div>
        {range === '30d' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--adm-dim)' }}>
            <span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span>
          </div>
        )}
      </div>

      {/* Two-col grid */}
      <div className="adm-dash-grid">
        {/* Recent Orders */}
        <div className="adm-dash-card">
          <div className="adm-dash-card-hd">
            <span className="adm-dash-card-title">Recent Orders</span>
            <button className="adm-act-btn adm-act-btn--sage" onClick={() => onNav('orders')}>View All</button>
          </div>
          <div className="adm-dash-card-body">
            {recentOrders.length === 0 && (
              <div className="adm-empty" style={{ padding: '30px 0' }}>
                <div className="adm-empty-icon">📦</div>
                <div className="adm-empty-text">No orders yet</div>
              </div>
            )}
            {recentOrders.map(o => (
              <div className="adm-dash-row" key={o.id}>
                <div className="adm-dash-row-left">
                  <div className="adm-dash-row-name">#{o.id} — {o.customer}</div>
                  <div className="adm-dash-row-sub">{o.city} · {o.items.length} item{o.items.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`adm-badge adm-badge--${o.status}`}>{o.status}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Bebas Neue,sans-serif', letterSpacing: '0.05em' }}>{formatPrice(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="adm-dash-card">
          <div className="adm-dash-card-hd">
            <span className="adm-dash-card-title">Top Products</span>
            <button className="adm-act-btn adm-act-btn--sage" onClick={() => onNav('products')}>View All</button>
          </div>
          <div className="adm-dash-card-body">
            {topProducts.length === 0 && (
              <div className="adm-empty" style={{ padding: '30px 0' }}>
                <div className="adm-empty-icon">📊</div>
                <div className="adm-empty-text">No sales data yet</div>
              </div>
            )}
            {topProducts.map((p, i) => (
              <div className="adm-dash-row" key={p.name}>
                <div className="adm-dash-row-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 18, color: 'rgba(195,206,148,0.4)', minWidth: 22 }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <div className="adm-dash-row-name">{p.name}</div>
                    <div className="adm-dash-row-sub">{p.qty} unit{p.qty !== 1 ? 's' : ''} sold</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 15, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.6)' }}>{formatPrice(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="adm-dash-card">
          <div className="adm-dash-card-hd">
            <span className="adm-dash-card-title">Low Stock Alerts</span>
            <button className="adm-act-btn adm-act-btn--sage" onClick={() => onNav('inventory')}>Manage</button>
          </div>
          <div className="adm-dash-card-body">
            {(stats?.lowStock ?? []).length === 0 ? (
              <div className="adm-empty" style={{ padding: '30px 0' }}>
                <div className="adm-empty-icon">✓</div>
                <div className="adm-empty-text">All stock levels healthy</div>
              </div>
            ) : (stats?.lowStock ?? []).map((item, i) => (
              <div className="adm-dash-row" key={i}>
                <div className="adm-dash-row-left">
                  <div className="adm-dash-row-name">{item.name}</div>
                  <div className="adm-dash-row-sub">Size {item.size}</div>
                </div>
                <span className={`adm-badge adm-badge--${item.qty === 0 ? 'cancelled' : 'processing'}`}>
                  {item.qty === 0 ? 'Out of Stock' : `${item.qty} left`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Exchange requests */}
        <div className="adm-dash-card">
          <div className="adm-dash-card-hd">
            <span className="adm-dash-card-title">Pending Requests</span>
            <button className="adm-act-btn adm-act-btn--sage" onClick={() => onNav('exchanges')}>View All</button>
          </div>
          <div className="adm-dash-card-body">
            {(stats?.pendingExchanges ?? 0) === 0 ? (
              <div className="adm-empty" style={{ padding: '30px 0' }}>
                <div className="adm-empty-icon">✓</div>
                <div className="adm-empty-text">No pending exchange requests</div>
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 48, color: 'var(--adm-orange)', letterSpacing: '0.04em' }}>{stats?.pendingExchanges}</div>
                <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 4 }}>Exchange / Cancellation request{stats?.pendingExchanges !== 1 ? 's' : ''} need attention</div>
                <button className="adm-act-btn adm-act-btn--sage" style={{ marginTop: 12 }} onClick={() => onNav('exchanges')}>Review Now</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
