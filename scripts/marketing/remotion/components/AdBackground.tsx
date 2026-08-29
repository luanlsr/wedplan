import React, { type ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export function AdBackground({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 600], [0, 120], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(145deg, #fff8fb 0%, #f8fafc 46%, #eef8f2 100%), linear-gradient(90deg, rgba(217,70,134,0.08) 0 1px, transparent 1px 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -120,
          opacity: 0.34,
          backgroundImage:
            'linear-gradient(120deg, transparent 0%, transparent 34%, rgba(217, 70, 134, 0.16) 34%, rgba(217, 70, 134, 0.16) 35%, transparent 35%, transparent 100%)',
          backgroundSize: '420px 420px',
          transform: `translateX(${drift}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.76) 100%)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </AbsoluteFill>
  );
}
