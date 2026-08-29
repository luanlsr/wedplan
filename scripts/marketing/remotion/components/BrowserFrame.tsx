import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';

export function BrowserFrame({
  screenshot,
  title,
  width = 910,
  height = 1120,
}: {
  screenshot: string;
  title: string;
  width?: number;
  height?: number;
}) {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 24], [34, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 36,
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 45px 110px rgba(15, 23, 42, 0.24)',
        transform: `translateY(${y}px)`,
        opacity,
        border: '1px solid rgba(148, 163, 184, 0.24)',
      }}
    >
      <div
        style={{
          height: 74,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 24px',
          background: 'rgba(248, 250, 252, 0.96)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 999, background: '#fb7185' }} />
        <span style={{ width: 16, height: 16, borderRadius: 999, background: '#fbbf24' }} />
        <span style={{ width: 16, height: 16, borderRadius: 999, background: '#34d399' }} />
        <span
          style={{
            marginLeft: 14,
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: 24,
            fontWeight: 850,
            color: '#475569',
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: height - 74,
          backgroundColor: '#f8fafc',
          backgroundImage: `url("${staticFile(screenshot)}"), radial-gradient(circle at 20% 10%, rgba(217, 70, 134, 0.14), transparent 28%), linear-gradient(135deg, #fff7fb, #f8fafc 52%, #eef8f3)`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(100, 116, 139, 0.28)',
            fontFamily: 'Inter, Arial, sans-serif',
            fontSize: 54,
            fontWeight: 900,
            zIndex: -1,
          }}
        >
          WedPlan
        </div>
      </div>
    </div>
  );
}
