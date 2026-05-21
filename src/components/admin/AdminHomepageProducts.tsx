'use client';

/**
 * AdminHomepageProducts
 *
 * Two-tab admin panel:
 *  Tab 1 – "Homepage Selection"
 *    • Shows all active products as a searchable, filterable checklist.
 *    • Tick/untick products to include them on the homepage.
 *    • Counter shows how many are selected (cap: 60).
 *    • Within the selected list you can drag rows to reorder homepage display order.
 *
 *  Tab 2 – "Collection Order"
 *    • Shows all active products as a drag-reorderable list.
 *    • This order controls how products appear on the All Products / collection page.
 *
 *  Both tabs have a "Save" button that calls POST /api/admin/homepage-products.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CATEGORIES as STATIC_CATEGORIES } from '@/lib/categories';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  price: number;
  badge?: string;
  is_active: boolean;
  is_featured: boolean;
  homepage_featured: boolean;
  homepage_sort_order: number;
  collection_sort_order: number;
  product_media?: { url: string; position: number; type: string }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryLabel(catId: string) {
  return STATIC_CATEGORIES.find(c => c.id === catId)?.label ?? catId;
}

function getThumb(p: AdminProduct) {
  const imgs = (p.product_media ?? [])
    .filter(m => m.type === 'image')
    .sort((a, b) => a.position - b.position);
  return imgs[0]?.url ?? null;
}

function formatPrice(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

// ── Drag-and-drop hook ────────────────────────────────────────────────────────

function useDraggableList<T extends { id: string }>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);

  useEffect(() => { setItems(initial); }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDragStart = useCallback((i: number) => { dragIdx.current = i; }, []);
  const onDragOver  = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault();
    overIdx.current = i;
  }, []);
  const onDrop = useCallback(() => {
    if (dragIdx.current === null || overIdx.current === null) return;
    if (dragIdx.current === overIdx.current) { dragIdx.current = overIdx.current = null; return; }
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(overIdx.current!, 0, moved);
      dragIdx.current = overIdx.current = null;
      return next;
    });
  }, []);

  return { items, setItems, onDragStart, onDragOver, onDrop };
}

// ── ProductRow — shared between both tabs ────────────────────────────────────

function DraggableRow({
  product,
  index,
  showCheckbox,
  checked,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  product: AdminProduct;
  index: number;
  showCheckbox: boolean;
  checked?: boolean;
  onToggle?: () => void;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDrop: () => void;
  isDragOver: boolean;
}) {
  const thumb = getThumb(product);
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => onDragOver(e, index)}
      onDrop={onDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 6,
        background: isDragOver ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: isDragOver ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.07)',
        cursor: 'grab',
        transition: 'background 0.15s, border-color 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Drag handle */}
      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, flexShrink: 0, lineHeight: 1 }}>⠿</span>

      {/* Rank number */}
      <span style={{ width: 24, textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
        {index + 1}
      </span>

      {/* Checkbox */}
      {showCheckbox && (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
          style={{ width: 15, height: 15, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--blush,#e7b0a6)' }}
        />
      )}

      {/* Thumbnail */}
      <div style={{
        width: 38, height: 38, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
        background: 'rgba(255,255,255,0.06)', position: 'relative',
      }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
              {product.name.slice(0, 2).toUpperCase()}
            </div>
        }
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          {getCategoryLabel(product.category_id)} · {formatPrice(product.price)}
          {product.badge && <span style={{ marginLeft: 6, color: 'var(--blush,#e7b0a6)' }}>{product.badge}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Homepage Selection ─────────────────────────────────────────────────

function HomepageTab({
  allProducts,
  onSave,
  saving,
}: {
  allProducts: AdminProduct[];
  onSave: (homepageIds: string[]) => Promise<void>;
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Selected IDs in order (order matters for homepage_sort_order)
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    allProducts
      .filter(p => p.homepage_featured)
      .sort((a, b) => a.homepage_sort_order - b.homepage_sort_order)
      .map(p => p.id)
  );

  const MAX = 60;
  const dragIdx  = useRef<number | null>(null);
  const overIdx  = useRef<number | null>(null);
  const [overI, setOverI] = useState<number | null>(null);

  // Filtered checklist (all products, left panel)
  const checklistProducts = useMemo(() => {
    let list = allProducts.filter(p => p.is_active);
    if (catFilter !== 'all') list = list.filter(p => p.category_id === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, catFilter, search]);

  // Selected products in order (right panel)
  const selectedProducts = useMemo(() =>
    selectedIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as AdminProduct[],
    [selectedIds, allProducts]
  );

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX) { alert(`Maximum ${MAX} products allowed on homepage.`); return prev; }
      return [...prev, id];
    });
  };

  // Drag on right panel (reorder selected products)
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => { e.preventDefault(); overIdx.current = i; setOverI(i); };
  const onDrop = () => {
    if (dragIdx.current === null || overIdx.current === null) { setOverI(null); return; }
    if (dragIdx.current !== overIdx.current) {
      setSelectedIds(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx.current!, 1);
        next.splice(overIdx.current!, 0, moved);
        return next;
      });
    }
    dragIdx.current = overIdx.current = null;
    setOverI(null);
  };

  const uniques = Array.from(new Set(allProducts.map(p => p.category_id)));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, height: '100%' }}>

      {/* ── LEFT: checklist ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>
          ALL PRODUCTS — tick to add to homepage
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text" placeholder="Search products…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 10px', color: '#fff', fontSize: 12 }}
          />
          <select
            value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 8px', color: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="all">All categories</option>
            {uniques.map(id => (
              <option key={id} value={id}>{getCategoryLabel(id)}</option>
            ))}
          </select>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 4 }}>
          {checklistProducts.map(p => {
            const checked = selectedIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  borderRadius: 6, cursor: 'pointer',
                  background: checked ? 'rgba(231,176,166,0.1)' : 'rgba(255,255,255,0.03)',
                  border: checked ? '1px solid rgba(231,176,166,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                <input
                  type="checkbox" readOnly checked={checked}
                  onClick={e => { e.stopPropagation(); toggle(p.id); }}
                  style={{ width: 14, height: 14, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--blush,#e7b0a6)' }}
                />
                <div style={{ width: 32, height: 32, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
                  {getThumb(p)
                    ? <img src={getThumb(p)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: checked ? '#fff' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                    {getCategoryLabel(p.category_id)} · {formatPrice(p.price)}
                  </div>
                </div>
                {checked && (
                  <span style={{ fontSize: 10, color: 'var(--blush,#e7b0a6)', fontWeight: 700, flexShrink: 0 }}>
                    #{selectedIds.indexOf(p.id) + 1}
                  </span>
                )}
              </div>
            );
          })}
          {checklistProducts.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 30, fontSize: 12 }}>
              No products found.
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: ordered selected list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>
            HOMEPAGE ORDER — drag to reorder
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: selectedIds.length >= MAX ? 'var(--blush,#e7b0a6)' : 'rgba(255,255,255,0.5)' }}>
            {selectedIds.length} / {MAX}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 4 }}>
          {selectedProducts.map((p, i) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDrop={onDrop}
              onDragEnd={() => { setOverI(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 6, cursor: 'grab', userSelect: 'none',
                background: overI === i ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                border: overI === i ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.09)',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, flexShrink: 0 }}>⠿</span>
              <span style={{ width: 20, textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {i + 1}
              </span>
              <div style={{ width: 32, height: 32, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
                {getThumb(p)
                  ? <img src={getThumb(p)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{getCategoryLabel(p.category_id)}</div>
              </div>
              <button
                onClick={() => toggle(p.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.6)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                title="Remove from homepage"
              >✕</button>
            </div>
          ))}
          {selectedProducts.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: 40, fontSize: 12, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>
              No products selected yet.<br />
              <span style={{ fontSize: 11 }}>Tick products on the left to add them.</span>
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={() => onSave(selectedIds)}
          disabled={saving}
          style={{
            marginTop: 4, padding: '10px 20px', borderRadius: 6,
            background: saving ? 'rgba(255,255,255,0.06)' : 'var(--blush,#e7b0a6)',
            color: saving ? 'rgba(255,255,255,0.4)' : '#111',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
            transition: 'background 0.15s',
          }}
        >
          {saving ? 'Saving…' : `Save Homepage (${selectedIds.length} products)`}
        </button>
      </div>
    </div>
  );
}

// ── Tab 2: Collection Order ───────────────────────────────────────────────────

function CollectionTab({
  allProducts,
  onSave,
  saving,
}: {
  allProducts: AdminProduct[];
  onSave: (ids: string[]) => Promise<void>;
  saving: boolean;
}) {
  const activeProducts = useMemo(
    () => [...allProducts.filter(p => p.is_active)].sort((a, b) => a.collection_sort_order - b.collection_sort_order),
    [allProducts]
  );

  const [order, setOrder] = useState<AdminProduct[]>(activeProducts);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const dragIdx  = useRef<number | null>(null);
  const overIdx  = useRef<number | null>(null);
  const [overI, setOverI] = useState<number | null>(null);

  useEffect(() => { setOrder(activeProducts); }, [activeProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = useMemo(() => {
    let list = order;
    if (catFilter !== 'all') list = list.filter(p => p.category_id === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [order, catFilter, search]);

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => { e.preventDefault(); overIdx.current = i; setOverI(i); };
  const onDrop = () => {
    if (dragIdx.current === null || overIdx.current === null) { setOverI(null); return; }
    if (dragIdx.current !== overIdx.current) {
      // We need to map displayed indices to full order indices
      const fromItem = displayed[dragIdx.current];
      const toItem   = displayed[overIdx.current];
      const fromFull = order.findIndex(p => p.id === fromItem.id);
      const toFull   = order.findIndex(p => p.id === toItem.id);
      setOrder(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromFull, 1);
        next.splice(toFull, 0, moved);
        return next;
      });
    }
    dragIdx.current = overIdx.current = null;
    setOverI(null);
  };

  const uniques = Array.from(new Set(allProducts.filter(p => p.is_active).map(p => p.category_id)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
        Drag products to set the order they appear on the <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Collection / All Products</strong> page.
        Filters below let you find specific items — reordering within a filtered view still updates the global order correctly.
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text" placeholder="Search…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 10px', color: '#fff', fontSize: 12 }}
        />
        <select
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 8px', color: '#fff', fontSize: 12, cursor: 'pointer' }}
        >
          <option value="all">All categories</option>
          {uniques.map(id => (
            <option key={id} value={id}>{getCategoryLabel(id)}</option>
          ))}
        </select>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
          {displayed.length} / {order.length}
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
        {displayed.map((p, i) => {
          const globalRank = order.findIndex(x => x.id === p.id) + 1;
          return (
            <div
              key={p.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDrop={onDrop}
              onDragEnd={() => setOverI(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 6, cursor: 'grab', userSelect: 'none',
                background: overI === i ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
                border: overI === i ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.07)',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, flexShrink: 0 }}>⠿</span>
              <span style={{ width: 30, textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                #{globalRank}
              </span>
              <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
                {getThumb(p)
                  ? <img src={getThumb(p)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                  {getCategoryLabel(p.category_id)} · {formatPrice(p.price)}
                  {p.badge && <span style={{ marginLeft: 6, color: 'var(--blush,#e7b0a6)' }}>{p.badge}</span>}
                </div>
              </div>
              {p.homepage_featured && (
                <span title="On Homepage" style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(231,176,166,0.15)', color: 'var(--blush,#e7b0a6)', fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0 }}>
                  HOME
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Save */}
      <button
        onClick={() => onSave(order.map(p => p.id))}
        disabled={saving}
        style={{
          padding: '10px 20px', borderRadius: 6,
          background: saving ? 'rgba(255,255,255,0.06)' : 'var(--blush,#e7b0a6)',
          color: saving ? 'rgba(255,255,255,0.4)' : '#111',
          border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
          transition: 'background 0.15s',
        }}
      >
        {saving ? 'Saving…' : `Save Collection Order (${order.length} products)`}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminHomepageProducts() {
  const [products, setProducts]   = useState<AdminProduct[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [tab, setTab]             = useState<'homepage' | 'collection'>('homepage');
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/homepage-products');
      if (!res.ok) throw new Error(await res.text());
      const data: AdminProduct[] = await res.json();
      setProducts(data);
    } catch (e) {
      showToast(`Failed to load: ${e instanceof Error ? e.message : String(e)}`, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveHomepage = async (homepageIds: string[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/homepage-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homepageIds }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Save failed');
      showToast(`✓ Homepage updated — ${homepageIds.length} products`, true);
      await load();
    } catch (e) {
      showToast(`✕ ${e instanceof Error ? e.message : String(e)}`, false);
    } finally {
      setSaving(false);
    }
  };

  const saveCollection = async (ids: string[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/homepage-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionOrder: ids }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Save failed');
      showToast(`✓ Collection order saved — ${ids.length} products`, true);
      await load();
    } catch (e) {
      showToast(`✕ ${e instanceof Error ? e.message : String(e)}`, false);
    } finally {
      setSaving(false);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600,
    fontSize: 12, letterSpacing: '0.04em', transition: 'all 0.15s',
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', gap: 0,
      background: 'transparent', position: 'relative',
    }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.ok ? 'rgba(100,200,100,0.15)' : 'rgba(200,80,80,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(100,200,100,0.3)' : 'rgba(200,80,80,0.3)'}`,
          color: toast.ok ? '#8ef08e' : '#ff9090',
          backdropFilter: 'blur(8px)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Homepage & Collection Manager</h2>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            Choose which products appear on the homepage (up to 60) and control their display order.
            Separately control the order products appear in the collection grid.
          </p>
        </div>
        <button
          onClick={load}
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        <button style={tabStyle(tab === 'homepage')}   onClick={() => setTab('homepage')}>
          🏠 Homepage Selection
        </button>
        <button style={tabStyle(tab === 'collection')} onClick={() => setTab('collection')}>
          ⠿ Collection Order
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            No products found. Add products first.
          </div>
        ) : tab === 'homepage' ? (
          <HomepageTab allProducts={products} onSave={saveHomepage} saving={saving} />
        ) : (
          <CollectionTab allProducts={products} onSave={saveCollection} saving={saving} />
        )}
      </div>

    </div>
  );
}