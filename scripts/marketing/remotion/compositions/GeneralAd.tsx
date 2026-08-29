import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { AdBackground } from '../components/AdBackground';
import { AnimatedCursor } from '../components/AnimatedCursor';
import { BrowserFrame } from '../components/BrowserFrame';
import { CTA } from '../components/CTA';
import { FeatureTitle } from '../components/FeatureTitle';
import { Logo } from '../components/Logo';

function Scene({
  from,
  duration,
  title,
  subtitle,
  screenshot,
}: {
  from: number;
  duration: number;
  title: string;
  subtitle?: string;
  screenshot: string;
}) {
  return (
    <Sequence from={from} durationInFrames={duration}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 52, padding: '82px 72px' }}>
        <FeatureTitle title={title} subtitle={subtitle} />
        <BrowserFrame screenshot={screenshot} title="app.wedplan.com.br" />
        <AnimatedCursor from={[730, 1020]} to={[365, 785]} startFrame={20} endFrame={86} />
      </AbsoluteFill>
    </Sequence>
  );
}

export function GeneralAd() {
  const frame = useCurrentFrame();
  const logoOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AdBackground>
      <div style={{ position: 'absolute', left: 64, top: 54, opacity: logoOpacity }}>
        <Logo compact />
      </div>

      <Scene
        from={0}
        duration={150}
        title="Organizar seu casamento nao precisa ser complicado."
        subtitle="Tenha clareza desde o primeiro fornecedor."
        screenshot="marketing/screenshots/pro_couple/dashboard-story.png"
      />
      <Scene
        from={150}
        duration={90}
        title="Controle todos os gastos em um so lugar."
        screenshot="marketing/screenshots/pro_couple/budget-story.png"
      />
      <Scene
        from={240}
        duration={90}
        title="Organize convidados e confirmacoes."
        screenshot="marketing/screenshots/pro_couple/guests-story.png"
      />
      <Scene
        from={330}
        duration={90}
        title="Saiba exatamente o que falta fazer."
        screenshot="marketing/screenshots/pro_couple/checklist-story.png"
      />
      <Sequence from={420} durationInFrames={120}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 70, padding: '90px 74px' }}>
          <FeatureTitle title="Seu casamento. Todo organizado." subtitle="Do orçamento ao site dos noivos." />
          <BrowserFrame screenshot="marketing/screenshots/pro_couple/dashboard-story.png" title="WedPlan" />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={540} durationInFrames={60}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 76 }}>
          <Logo />
          <CTA />
        </AbsoluteFill>
      </Sequence>
    </AdBackground>
  );
}
