'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    border: '2px solid transparent',
    transition: 'all 0.28s cubic-bezier(.23,1,.32,1)',
    cursor: disabled || loading ? 'not-allowed' : 'none',
    opacity: disabled ? 0.45 : 1,
    position: 'relative',
    overflow: 'hidden',
    width: fullWidth ? '100%' : undefined,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const sizeMap: Record<Size, React.CSSProperties> = {
    sm: { fontSize: 10, padding: '10px 20px' },
    md: { fontSize: 11, padding: '15px 32px' },
    lg: { fontSize: 12, padding: '19px 40px' },
  };

  const variantMap: Record<Variant, React.CSSProperties> = {
    primary: {
      background: 'var(--white)',
      color: 'var(--black)',
      borderColor: 'var(--white)',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--white)',
      borderColor: 'rgba(255,255,255,0.25)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--mid-gray)',
      borderColor: 'transparent',
    },
    danger: {
      background: 'transparent',
      color: 'var(--blush)',
      borderColor: 'rgba(200,200,200,0.3)',
    },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...sizeMap[size], ...variantMap[variant], ...style }}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        const el = e.currentTarget;
        if (variant === 'primary') {
          el.style.background = 'var(--sage)';
          el.style.borderColor = 'var(--sage)';
        } else if (variant === 'secondary') {
          el.style.borderColor = 'var(--sage)';
          el.style.color = 'var(--sage)';
        } else if (variant === 'ghost') {
          el.style.color = 'var(--white)';
        } else if (variant === 'danger') {
          el.style.background = 'rgba(200,200,200,0.1)';
          el.style.borderColor = 'var(--blush)';
        }
      }}
      onMouseLeave={(e) => {
        if (disabled || loading) return;
        const el = e.currentTarget;
        Object.assign(el.style, variantMap[variant]);
      }}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 14, height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            display: 'inline-block',
          }} />
          Processing...
        </span>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
}
