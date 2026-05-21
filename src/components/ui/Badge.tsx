'use client';

import React from 'react';

type BadgeVariant = 'new' | 'limited' | 'bestseller' | 'sale' | 'sold-out';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  style?: React.CSSProperties;
}

const BADGE_CONFIG: Record<BadgeVariant, { bg: string; color: string; defaultLabel: string }> = {
  new: { bg: 'var(--sage)', color: 'var(--black)', defaultLabel: 'New' },
  limited: { bg: 'var(--blush)', color: 'var(--black)', defaultLabel: 'Limited' },
  bestseller: { bg: 'var(--white)', color: 'var(--black)', defaultLabel: 'Bestseller' },
  sale: { bg: '#e8d5b7', color: 'var(--black)', defaultLabel: 'Sale' },
  'sold-out': { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', defaultLabel: 'Sold Out' },
};

export default function Badge({ variant, label, style }: BadgeProps) {
  const config = BADGE_CONFIG[variant];
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      padding: '5px 10px',
      background: config.bg,
      color: config.color,
      ...style,
    }}>
      {label ?? config.defaultLabel}
    </span>
  );
}
