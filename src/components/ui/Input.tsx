'use client';

import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: focused ? 'var(--sage)' : 'var(--mid-gray)',
          transition: 'color 0.2s',
        }}>
          {label}
        </label>
      )}
      <input
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: focused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${error ? 'var(--blush)' : focused ? 'var(--sage)' : 'rgba(255,255,255,0.1)'}`,
          color: 'var(--white)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          letterSpacing: '0.02em',
          outline: 'none',
          transition: 'border-color 0.2s, background 0.2s',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 11, color: 'var(--blush)', letterSpacing: '0.05em' }}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, style, ...props }: SelectProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: focused ? 'var(--sage)' : 'var(--mid-gray)',
          transition: 'color 0.2s',
        }}>
          {label}
        </label>
      )}
      <select
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: focused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${error ? 'var(--blush)' : focused ? 'var(--sage)' : 'rgba(255,255,255,0.1)'}`,
          color: props.value ? 'var(--white)' : 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          letterSpacing: '0.02em',
          outline: 'none',
          transition: 'border-color 0.2s, background 0.2s',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 16px center',
          paddingRight: 40,
          ...style,
        }}
        {...props}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: '#111', color: 'var(--white)' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--blush)', letterSpacing: '0.05em' }}>
          {error}
        </span>
      )}
    </div>
  );
}
