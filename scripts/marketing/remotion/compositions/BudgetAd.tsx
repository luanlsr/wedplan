import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { AdBackground } from '../components/AdBackground';
import { AnimatedCursor } from '../components/AnimatedCursor';
import { BrowserFrame } from '../components/BrowserFrame';
import { CTA } from '../components/CTA';
import { FeatureTitle } from '../components/FeatureTitle';
import { Logo } from '../components/Logo';

export function BudgetAd() {
  return (
    <AdBackground>
      <div style={{ position: 'absolute', left: 64, top: 54 }}>
        <Logo compact />
      </div>
      <Sequence from={0} durationInFrames={120}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 56, padding: '86px 72px' }}>
          <FeatureTitle title="Voce sabe quanto seu casamento realmente vai custar?" />
          <BrowserFrame screenshot="marketing/screenshots/pro_couple/budget-story.png" title="Financeiro" />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={120} durationInFrames={210}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 52, padding: '86px 72px' }}>
          <FeatureTitle title="Fornecedores, parcelas e saldo em uma visao clara." />
          <BrowserFrame screenshot="marketing/screenshots/pro_couple/budget-story.png" title="Controle de orçamento" />
          <AnimatedCursor from={[790, 960]} to={[450, 610]} startFrame={130} endFrame={210} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={330} durationInFrames={120}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 76 }}>
          <Logo />
          <CTA label="Planeje com o WedPlan" />
        </AbsoluteFill>
      </Sequence>
    </AdBackground>
  );
}
