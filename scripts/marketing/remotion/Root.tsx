import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { BudgetAd } from './compositions/BudgetAd';
import { ChecklistAd } from './compositions/ChecklistAd';
import { GeneralAd } from './compositions/GeneralAd';
import { GeneralHorizontalAd } from './compositions/GeneralHorizontalAd';
import { GuestsAd } from './compositions/GuestsAd';

export function RemotionRoot() {
  return (
    <>
      <Composition id="GeneralAd" component={GeneralAd} durationInFrames={600} fps={30} width={1080} height={1920} />
      <Composition id="BudgetAd" component={BudgetAd} durationInFrames={450} fps={30} width={1080} height={1920} />
      <Composition id="GuestsAd" component={GuestsAd} durationInFrames={450} fps={30} width={1080} height={1920} />
      <Composition id="ChecklistAd" component={ChecklistAd} durationInFrames={450} fps={30} width={1080} height={1920} />
      <Composition id="GeneralHorizontalAd" component={GeneralHorizontalAd} durationInFrames={300} fps={30} width={1920} height={1080} />
    </>
  );
}

registerRoot(RemotionRoot);
