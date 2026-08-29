import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export function FeatureTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        transform: `translateY(${(1 - enter) * 42}px)`,
        opacity,
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#111827',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 70, lineHeight: 1.02, fontWeight: 950, letterSpacing: 0 }}>{title}</div>
      {subtitle && (
        <div style={{ marginTop: 18, fontSize: 34, lineHeight: 1.25, fontWeight: 750, color: '#475569' }}>{subtitle}</div>
      )}
    </div>
  );
}
