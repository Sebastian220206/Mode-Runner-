import { ModeId } from '../core/types';

export type ChallengeTier = 1 | 2 | 3 | 4;

export interface ChallengeDef {
  id: string;
  tier: ChallengeTier;
  title: string;
  tonicName: string;
  modeId: ModeId;
  previewStepsCount: number; // how many steps show W/H hint labels (e.g. 7 for Tier 1, 2 for Tier 2, 0 for Tier 3/4)
  isMysteryMode: boolean; // if true, mode name is hidden initially; player discovers it by sound & color!
  timeTargetSeconds?: number;
}

export interface ModeMasteryData {
  modeId: ModeId;
  box: number; // Leitner box: 1 (learning) to 5 (mastered)
  runsCompleted: number;
  accuracySum: number; // total correct steps / total steps
  lastPracticed: number; // epoch ms
}

export interface PlayerProgress {
  currentTier: ChallengeTier;
  streakDays: number;
  lastActiveDay: string; // YYYY-MM-DD
  graceFreezesRemaining: number;
  mastery: Record<ModeId, ModeMasteryData>;
  dailyCompletedDates: string[]; // ['2026-10-19', ...]
}

export const DEFAULT_PLAYER_PROGRESS: PlayerProgress = {
  currentTier: 1,
  streakDays: 0,
  lastActiveDay: '',
  graceFreezesRemaining: 1,
  dailyCompletedDates: [],
  mastery: {
    ionian: { modeId: 'ionian', box: 1, runsCompleted: 0, accuracySum: 0, lastPracticed: 0 },
    dorian: { modeId: 'dorian', box: 1, runsCompleted: 0, accuracySum: 0, lastPracticed: 0 },
    phrygian: { modeId: 'phrygian', box: 1, runsCompleted: 0, accuracySum: 0, lastPracticed: 0 },
    lydian: { modeId: 'lydian', box: 1, runsCompleted: 0, accuracySum: 0, lastPracticed: 0 },
    mixolydian: { modeId: 'mixolydian', box: 1, runsCompleted: 0, accuracySum: 0, lastPracticed: 0 },
    aeolian: { modeId: 'aeolian', box: 1, runsCompleted: 0, accuracySum: 0, lastPracticed: 0 },
    locrian: { modeId: 'locrian', box: 1, runsCompleted: 0, accuracySum: 0, lastPracticed: 0 }
  }
};
