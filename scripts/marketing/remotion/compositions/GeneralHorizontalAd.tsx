import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { AdBackground } from '../components/AdBackground';
import { BrowserFrame } from '../components/BrowserFrame';
import { CTA } from '../components/CTA';
import { FeatureTitle } from '../components/FeatureTitle';
import { Logo } from '../components/Logo';

export function GeneralHorizontalAd() {
  return (
    <AdBackground>
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 72, padding: '88px 96px' }}>
        <Sequence from={0} durationInFrames={300}>
          <div style={{ width: 650, display: 'flex', flexDirection: 'column', gap: 52 }}>
            <Logo />
            <FeatureTitle title="Seu casamento organizado em uma plataforma bonita e simples." subtitle="Orçamento, convidados, tarefas, fornecedores e site do casal." />
            <CTA />
          </div>
          <BrowserFrame screenshot="marketing/screenshots/pro_couple/dashboard-horizontal.png" title="WedPlan" width={980} height={760} />
        </Sequence>
      </AbsoluteFill>
    </AdBackground>
  );
}
