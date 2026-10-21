import { ModeId } from '../core/types';
import { ChallengeDef, ChallengeTier } from './types';
import { MasteryTracker } from './masteryTracker';

export const COMMON_TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'F#'];

/**
 * Seeded PRNG (Mulberry32) for deterministic daily runs
 */
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class ChallengeSelector {
  constructor(private tracker: MasteryTracker) {}

  /**
   * Generates the next adaptive challenge based on the player's current tier and weakest modes
   */
  public getNextChallenge(tier?: ChallengeTier): ChallengeDef {
    const progress = this.tracker.getProgress();
    const activeTier = tier || progress.currentTier;

    const allModeIds: ModeId[] = [
      'ionian',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian'
    ];

    // Find the mode with the lowest Leitner box or least practiced
    const sorted = [...allModeIds].sort((a, b) => {
      const mA = this.tracker.getModeMastery(a);
      const mB = this.tracker.getModeMastery(b);
      if (mA.box !== mB.box) return mA.box - mB.box;
      return mA.lastPracticed - mB.lastPracticed;
    });

    let selectedMode = sorted[0];
    let selectedTonic = 'C';
    let previewSteps = 7;
    let isMystery = false;

    if (activeTier === 1) {
      // Tier 1: Ionian and Dorian only, fully guided
      const tier1Modes: ModeId[] = ['ionian', 'dorian'];
      selectedMode = tier1Modes[Math.floor(Math.random() * tier1Modes.length)];
      selectedTonic = selectedMode === 'dorian' ? 'D' : 'C';
      previewSteps = 7;
    } else if (activeTier === 2) {
      // Tier 2: Major, Minor, Dorian, Mixolydian. Step hints fade after step 2.
      const tier2Modes: ModeId[] = ['ionian', 'aeolian', 'dorian', 'mixolydian'];
      selectedMode = tier2Modes[Math.floor(Math.random() * tier2Modes.length)];
      selectedTonic = ['C', 'D', 'G', 'A', 'F'][Math.floor(Math.random() * 5)];
      previewSteps = 2;
    } else if (activeTier === 3) {
      // Tier 3: Mystery mode! Discover mode by listening to drone & ambient biome color
      selectedMode = allModeIds[Math.floor(Math.random() * allModeIds.length)];
      selectedTonic = COMMON_TONICS[Math.floor(Math.random() * 5)];
      previewSteps = 0;
      isMystery = true;
    } else {
      // Tier 4: Mixed all modes, varied tonics, full speed
      selectedMode = sorted[0];
      selectedTonic = COMMON_TONICS[Math.floor(Math.random() * COMMON_TONICS.length)];
      previewSteps = 0;
    }

    return {
      id: `chal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tier: activeTier,
      title: isMystery ? `Mystery Biome on ${selectedTonic}` : `Build ${selectedTonic} ${selectedMode.toUpperCase()}`,
      tonicName: selectedTonic,
      modeId: selectedMode,
      previewStepsCount: previewSteps,
      isMysteryMode: isMystery
    };
  }

  /**
   * Deterministic Daily Challenge for a specific date (e.g. '2026-10-19')
   */
  public getDailyChallenge(dateStr?: string): ChallengeDef {
    const date = dateStr || new Date().toISOString().slice(0, 10);
    const rng = mulberry32(hashString(date));

    const allModeIds: ModeId[] = [
      'lydian',
      'ionian',
      'mixolydian',
      'dorian',
      'aeolian',
      'phrygian',
      'locrian'
    ];

    const modeIdx = Math.floor(rng() * allModeIds.length);
    const tonicIdx = Math.floor(rng() * COMMON_TONICS.length);
    const selectedMode = allModeIds[modeIdx];
    const selectedTonic = COMMON_TONICS[tonicIdx];

    return {
      id: `daily_${date}`,
      tier: 4,
      title: `Daily Expedition: ${selectedTonic} ${selectedMode.toUpperCase()}`,
      tonicName: selectedTonic,
      modeId: selectedMode,
      previewStepsCount: 0,
      isMysteryMode: false,
      timeTargetSeconds: 30
    };
  }
}
