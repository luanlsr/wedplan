import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export function CTA({ label = 'Comece gratuitamente', url = 'www.wedplan.com.br' }: { label?: string; url?: string }) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame % 90, [0, 45, 90], [1, 1.035, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          padding: '24px 42px',
          borderRadius: 999,
          background: '#d94686',
          color: 'white',
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: 42,
          fontWeight: 900,
          boxShadow: '0 24px 70px rgba(217, 70, 134, 0.35)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: '#475569',
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: 30,
          fontWeight: 800,
        }}
      >
        {url}
      </div>
    </div>
  );
}
