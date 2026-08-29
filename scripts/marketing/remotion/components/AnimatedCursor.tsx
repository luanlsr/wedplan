import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export function AnimatedCursor({ from, to, startFrame, endFrame }: { from: [number, number]; to: [number, number]; startFrame: number; endFrame: number }) {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [startFrame, endFrame], [from[0], to[0]], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(frame, [startFrame, endFrame], [from[1], to[1]], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = interpolate(frame % 38, [0, 19, 38], [1, 1.18, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 42,
        height: 42,
        borderRadius: 999,
        border: '4px solid #d94686',
        background: 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 16px 45px rgba(15, 23, 42, 0.18)',
        transform: `scale(${pulse})`,
      }}
    />
  );
}
