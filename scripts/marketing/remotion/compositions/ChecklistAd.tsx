import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { AdBackground } from '../components/AdBackground';
import { AnimatedCursor } from '../components/AnimatedCursor';
import { BrowserFrame } from '../components/BrowserFrame';
import { CTA } from '../components/CTA';
import { FeatureTitle } from '../components/FeatureTitle';
import { Logo } from '../components/Logo';

export function ChecklistAd() {
  return (
    <AdBackground>
      <div style={{ position: 'absolute', left: 64, top: 54 }}>
        <Logo compact />
      </div>
      <Sequence from={0} durationInFrames={120}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 56, padding: '86px 72px' }}>
          <FeatureTitle title="Vai casar e nao sabe o que deveria resolver agora?" />
          <BrowserFrame screenshot="marketing/screenshots/pro_couple/checklist-story.png" title="Checklist" />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={120} durationInFrames={210}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 52, padding: '86px 72px' }}>
          <FeatureTitle title="Veja prioridades, progresso e proximas tarefas." />
          <BrowserFrame screenshot="marketing/screenshots/pro_couple/checklist-story.png" title="Planejamento por etapas" />
          <AnimatedCursor from={[760, 1010]} to={[420, 640]} startFrame={128} endFrame={204} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={330} durationInFrames={120}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 76 }}>
          <Logo />
          <CTA label="Tenha seu plano em um lugar" />
        </AbsoluteFill>
      </Sequence>
    </AdBackground>
  );
}
