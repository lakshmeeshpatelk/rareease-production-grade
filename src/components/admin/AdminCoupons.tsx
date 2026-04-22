'use client';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import type { Coupon } from '@/types';

type CouponType = 'percent' | 'flat';

const emptyForm = () => ({ code:'', type:'percent' as CouponType, value:'', min_order:'', max_uses:'', expires_at:'' });

export default function AdminCoupons() {
  const { coupons, loadCoupons, upsertCoupon, deleteCoupon, loading } = useAdminStore();
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleting,setDeleting]= useState<Coupon | null>(null);
  const [form, setForm]       = useState(emptyForm());
  const [errors, setErrors]   = useState<Record<string, string>>({});

  useEffect(() => { loadCoupons(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fld = (k: keyof ReturnType<typeof emptyForm>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [k]: e.target.value }));
      setErrors(p => ({ ...p, [k]: '' }));
    };

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.code.trim()) e.code = 'Code is required';
    if (coupons.some(c => c.code === form.code.toUpperCase() && c.id !== editing?.id)) e.code = 'Code already exists';
    if (!form.value || Number(form.value) <= 0) e.value = 'Enter a valid discount value';
    if (form.type === 'percent' && Number(form.value) > 80) e.value = 'Max 80% discount allowed';
    if (!form.expires_at) e.expires = 'Set an expiry date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const data = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_order: Number(form.min_order) || 0,
      max_uses: Number(form.max_uses) || 9999,
      expires_at: form.expires_at,
      active: true,
    };
    await upsertCoupon(editing ? { ...data, id: editing.id } : data);
    setAdding(false); setEditing(null); setForm(emptyForm());
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({ code: c.code, type: c.type as CouponType, value: String(c.value), min_order: String(c.min_order), max_uses: String(c.max_uses), expires_at: c.expires_at ?? '' });
    setAdding(true);
  };

  const toggle = async (id: string) => {
    const c = coupons.find(c => c.id === id);
    if (c) await upsertCoupon({ id, code: c.code, active: !c.active });
  };
  const confirmDelete = async () => { if (deleting) { await deleteCoupon(deleting.id); setDeleting(null); } };

  const active   = coupons.filter(c => c.active).length;
  const totalUses = coupons.reduce((s, c) => s + c.used_count, 0);

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Coupons', value: coupons.length },
          { label:'Active', value: active, sage: active > 0 },
          { label:'Total Uses', value: totalUses },
          { label:'Inactive', value: coupons.length - active },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--adm-surface)', border:'1px solid var(--adm-border)', padding:'16px 18px' }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.28em', textTransform:'uppercase', color:'var(--adm-muted)', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:30, letterSpacing:'0.04em', color: s.sage ? 'var(--adm-sage)' : 'var(--adm-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button className="adm-header-btn adm-header-btn--primary" onClick={() => { setAdding(true); setEditing(null); setForm(emptyForm()); setErrors({}); }}>
          + Create Coupon
        </button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>Code</th><th>Type</th><th>Discount</th><th>Min Order</th><th>Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {coupons.map(c => {
              const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
              const exhausted = c.used_count >= c.max_uses;
              return (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, letterSpacing:'0.1em', color: c.active ? 'var(--adm-sage)' : 'var(--adm-muted)' }}>
                      {c.code}
                    </span>
                  </td>
                  <td className="muted">{c.type === 'percent' ? 'Percentage' : 'Flat Amount'}</td>
                  <td>
                    <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:18, letterSpacing:'0.04em' }}>
                      {c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}
                    </span>
                  </td>
                  <td className="muted">{c.min_order > 0 ? `₹${c.min_order}` : 'None'}</td>
                  <td>
                    <span style={{ fontSize:12 }}>{c.used_count}</span>
                    <span style={{ fontSize:11, color:'var(--adm-dim)', marginLeft:4 }}>/ {c.max_uses === 9999 ? '∞' : c.max_uses}</span>
                  </td>
                  <td className="muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}</td>
                  <td>
                    {!c.active ? <span className="adm-badge adm-badge--inactive">Inactive</span>
                    : expired   ? <span className="adm-badge adm-badge--cancelled">Expired</span>
                    : exhausted ? <span className="adm-badge adm-badge--processing">Exhausted</span>
                    :             <span className="adm-badge adm-badge--active">Active</span>}
                  </td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-act-btn adm-act-btn--sage" onClick={() => openEdit(c)}>Edit</button>
                      <button className="adm-act-btn" onClick={() => toggle(c.id)}>{c.active ? 'Pause' : 'Enable'}</button>
                      <button className="adm-act-btn adm-act-btn--red adm-act-btn--icon" onClick={() => setDeleting(c)} aria-label="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {adding && (
        <div className="adm-modal-backdrop" onClick={() => { setAdding(false); setEditing(null); }}>
          <div className="adm-modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <span className="adm-modal-title">{editing ? 'EDIT COUPON' : 'CREATE COUPON'}</span>
              <button className="adm-act-btn adm-act-btn--icon" onClick={() => { setAdding(false); setEditing(null); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="adm-modal-body">
              {/* Code */}
              <div className="adm-field">
                <label className="adm-field-label">Coupon Code <span style={{ color:'var(--adm-red)' }}>*</span></label>
                <input className="adm-field-input" value={form.code} onChange={fld('code')}
                  placeholder="RARE10" style={{ textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:700 }}
                  autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} />
                {errors.code && <div style={{ fontSize:11, color:'var(--adm-red)', marginTop:4 }}>{errors.code}</div>}
              </div>

              {/* Type + Value */}
              <div className="adm-field-row">
                <div className="adm-field">
                  <label className="adm-field-label">Discount Type <span style={{ color:'var(--adm-red)' }}>*</span></label>
                  <select className="adm-field-select" value={form.type} onChange={fld('type')}>
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-field-label">{form.type === 'percent' ? 'Discount %' : 'Discount ₹'} <span style={{ color:'var(--adm-red)' }}>*</span></label>
                  <input type="number" inputMode="decimal" className="adm-field-input" value={form.value} onChange={fld('value')}
                    placeholder={form.type === 'percent' ? '10' : '50'} min={1} max={form.type === 'percent' ? 80 : undefined}
                    autoComplete="off" />
                  {errors.value && <div style={{ fontSize:11, color:'var(--adm-red)', marginTop:4 }}>{errors.value}</div>}
                </div>
              </div>

              {/* Min Order + Max Uses */}
              <div className="adm-field-row">
                <div className="adm-field">
                  <label className="adm-field-label">Min. Order (₹) <span style={{ fontSize:9, color:'var(--adm-dim)' }}>optional</span></label>
                  <input type="number" inputMode="numeric" className="adm-field-input" value={form.min_order} onChange={fld('min_order')} placeholder="0" min={0} autoComplete="off" />
                </div>
                <div className="adm-field">
                  <label className="adm-field-label">Max Uses <span style={{ fontSize:9, color:'var(--adm-dim)' }}>leave blank = unlimited</span></label>
                  <input type="number" inputMode="numeric" className="adm-field-input" value={form.max_uses} onChange={fld('max_uses')} placeholder="∞" min={1} autoComplete="off" />
                </div>
              </div>

              {/* Expiry */}
              <div className="adm-field">
                <label className="adm-field-label">Expiry Date <span style={{ color:'var(--adm-red)' }}>*</span></label>
                <input type="date" className="adm-field-input" value={form.expires_at} onChange={fld('expires_at')}
                  min={new Date().toISOString().split('T')[0]} />
                {errors.expires && <div style={{ fontSize:11, color:'var(--adm-red)', marginTop:4 }}>{errors.expires}</div>}
              </div>

              {/* Preview */}
              {form.code && form.value && (
                <div style={{ padding:'12px 14px', background:'rgba(195,206,148,0.05)', border:'1px solid rgba(195,206,148,0.15)', marginTop:4 }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--adm-muted)', marginBottom:6 }}>Preview</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>
                    Code <strong style={{ color:'var(--adm-sage)', fontFamily:'monospace', letterSpacing:'0.1em' }}>{form.code.toUpperCase()}</strong> gives{' '}
                    <strong>{form.type === 'percent' ? `${form.value}% off` : `₹${form.value} off`}</strong>
                    {form.min_order ? ` on orders above ₹${form.min_order}` : ''}
                    {form.max_uses ? ` · Limited to ${form.max_uses} uses` : ''}
                  </div>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-header-btn" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</button>
              <button className="adm-header-btn adm-header-btn--primary" onClick={save}>
                {editing ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleting && (
        <div className="adm-modal-backdrop" onClick={() => setDeleting(null)}>
          <div className="adm-modal" style={{ maxWidth:380 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd"><span className="adm-modal-title">DELETE COUPON</span></div>
            <div className="adm-modal-body">
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.7 }}>
                Delete coupon <strong style={{ fontFamily:'monospace', color:'var(--adm-sage)' }}>{deleting.code}</strong>?
                It has been used <strong>{deleting.used_count}</strong> times. This cannot be undone.
              </p>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-header-btn" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="adm-header-btn" style={{ background:'rgba(255,107,107,0.15)', borderColor:'rgba(255,107,107,0.4)', color:'var(--adm-red)' }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
