'use client';
import { useState, useRef, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { CATEGORIES } from '@/lib/categories'; // fallback only

interface StockMap { [variantId: string]: number }

export default function AdminInventory() {
  const { products: allProducts, loadProducts, updateVariantStock, categories: dbCategories, loadCategories } = useAdminStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const [stock, setStock] = useState<StockMap>({});
  const [dirtyVariants, setDirtyVariants] = useState<Set<string>>(new Set());
  // Keep a ref so the stock-sync effect always reads the latest dirty set
  const dirtyVariantsRef = useRef<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});

  useEffect(() => { loadProducts(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref in sync with state
  useEffect(() => { dirtyVariantsRef.current = dirtyVariants; }, [dirtyVariants]);

  // Merge DB categories with static fallback
  const categories = dbCategories.length > 0 ? dbCategories : CATEGORIES;

  // Sync stock map whenever products load — use the ref so we never have a stale closure
  useEffect(() => {
    setStock(prev => {
      const m: StockMap = { ...prev };
      allProducts.forEach(p => p.inventory?.forEach(inv => {
        if (!inv.variant_id) return;
        // Only overwrite if not locally edited
        if (!dirtyVariantsRef.current.has(inv.variant_id)) m[inv.variant_id] = inv.quantity;
      }));
      return m;
    });
  }, [allProducts]);

  const toggle = (id: string) => setExpanded(p => ({...p, [id]: !p[id]}));

  const products = allProducts.filter(p => {
    const matchCat = filter === 'all' || p.category_id === filter;
    const q = query.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const totalLow = Object.values(stock).filter(q => q <= 3 && q > 0).length;
  const totalOos = Object.values(stock).filter(q => q === 0).length;

  const updateQty = (variantId: string, val: string) => {
    const n = Math.max(0, parseInt(val) || 0);
    setStock(p => ({...p, [variantId]: n}));
    setDirtyVariants(p => new Set([...p, variantId]));
    setSaved(false);
  };

  const saveAll = async () => {
    setSaving(true);
    // Only push variants that were locally edited
    await Promise.all([...dirtyVariants].map(variantId => {
      const qty = stock[variantId];
      if (qty === undefined) return Promise.resolve();
      // Find which product owns this variant
      const product = allProducts.find(p => p.variants?.some(v => v.id === variantId));
      if (!product) return Promise.resolve();
      return updateVariantStock(product.id, variantId, qty);
    }));
    setDirtyVariants(new Set());
    setSaving(false);
    setSaved(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaved(false), 2500);
  };

  const getCatLabel = (catId: string) => categories.find(c => c.id === catId)?.name ?? catId;

  return (
    <div>
      {/* Summary strip */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        {[
          { label:'Total SKUs', value: Object.keys(stock).length },
          { label:'Low Stock (≤3)', value: totalLow, warn: totalLow > 0 },
          { label:'Out of Stock', value: totalOos, err: totalOos > 0 },
        ].map(s => (
          <div key={s.label} style={{background:'var(--adm-surface)',border:`1px solid ${s.err ? 'rgba(255,107,107,0.25)' : s.warn ? 'rgba(244,162,90,0.25)' : 'var(--adm-border)'}`,padding:'14px 20px',flex:1}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--adm-muted)',marginBottom:6}}>{s.label}</div>
            <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:32,letterSpacing:'0.04em',color:s.err ? 'var(--adm-red)' : s.warn ? 'var(--adm-orange)' : 'var(--adm-text)'}}>{s.value}</div>
          </div>
        ))}
        <button className="adm-header-btn adm-header-btn--primary" style={{alignSelf:'center',padding:'12px 22px'}} onClick={saveAll} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : `Save${dirtyVariants.size > 0 ? ` (${dirtyVariants.size})` : ' All'}`}
        </button>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input className="adm-search-input" placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} />
        </div>
        <select className="adm-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {products.map(p => {
        const variants = p.variants ?? [];
        const isOpen = expanded[p.id] !== false; // default open
        return (
          <div className="adm-inv-product" key={p.id}>
            <div className="adm-inv-product-hd" onClick={() => toggle(p.id)}>
              <div>
                <div className="adm-inv-product-name">{p.name}</div>
                <div className="adm-inv-product-cat">{getCatLabel(p.category_id)} · {p.id}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                {variants.some(v => stock[v.id] === 0) && <span className="adm-badge adm-badge--cancelled">OOS</span>}
                {variants.some(v => (stock[v.id] ?? 0) <= 3 && (stock[v.id] ?? 0) > 0) && <span className="adm-badge adm-badge--processing">Low</span>}
                {dirtyVariants.size > 0 && variants.some(v => dirtyVariants.has(v.id)) && (
                  <span style={{fontSize:9,color:'var(--adm-orange)',fontWeight:700,letterSpacing:'0.1em'}}>UNSAVED</span>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{transform: isOpen ? 'rotate(180deg)' : 'none',transition:'transform 0.2s'}}>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {isOpen && (
              <div style={{padding:'16px 18px'}}>
                {variants.length === 0 ? (
                  <div style={{fontSize:11,color:'var(--adm-muted)',padding:'8px 0'}}>No variants found for this product.</div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
                    {variants.map(v => {
                      const qty = stock[v.id] ?? 0;
                      const isDirty = dirtyVariants.has(v.id);
                      return (
                        <div className="adm-inv-variant" key={v.id} style={{border: isDirty ? '1px solid rgba(244,162,90,0.4)' : undefined}}>
                          <div className="adm-inv-size">{v.size}</div>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className={`adm-inv-qty-input${qty === 0 ? ' oos' : qty <= 3 ? ' low' : ''}`}
                            value={qty}
                            onChange={e => updateQty(v.id, e.target.value)}
                            autoComplete="off"
                          />
                          <div style={{fontSize:9,color:'rgba(255,255,255,0.2)',letterSpacing:'0.1em'}}>
                            {qty === 0 ? 'OOS' : qty <= 3 ? 'LOW' : 'OK'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
