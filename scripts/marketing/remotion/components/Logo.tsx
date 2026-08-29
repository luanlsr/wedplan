import React from 'react';
import { Img, staticFile } from 'remotion';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        color: '#111827',
        fontFamily: 'Inter, Arial, sans-serif',
        fontWeight: 900,
        fontSize: compact ? 36 : 52,
        letterSpacing: 0,
      }}
    >
      <div
        style={{
          width: compact ? 60 : 78,
          height: compact ? 60 : 78,
          borderRadius: 22,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(255, 255, 255, 0.86)',
          boxShadow: '0 24px 70px rgba(149, 36, 91, 0.18)',
        }}
      >
        <Img src={staticFile('image/favicon.png')} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
      </div>
      <span>WedPlan</span>
    </div>
  );
}
