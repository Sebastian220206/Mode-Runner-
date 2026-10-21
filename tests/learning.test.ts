import { describe, it, expect, beforeEach } from 'vitest';
import { MasteryTracker, ChallengeSelector, mulberry32 } from '../src/learning';

describe('Learning Layer - MasteryTracker & Leitner Boxes', () => {
  let tracker: MasteryTracker;

  beforeEach(() => {
    tracker = new MasteryTracker();
  });

  it('starts modes in Leitner box 1', () => {
    const dorian = tracker.getModeMastery('dorian');
    expect(dorian.box).toBe(1);
    expect(dorian.runsCompleted).toBe(0);
  });

  it('promotes mode to Box 2 on flawless run (7/7)', () => {
    tracker.recordRun('dorian', 7, 7);
    const dorian = tracker.getModeMastery('dorian');
    expect(dorian.box).toBe(2);
    expect(dorian.runsCompleted).toBe(1);
  });

  it('caps promotion at Box 5', () => {
    for (let i = 0; i < 10; i++) {
      tracker.recordRun('dorian', 7, 7);
    }
    const dorian = tracker.getModeMastery('dorian');
    expect(dorian.box).toBe(5);
  });

  it('demotes box on high mistake count (< 70% accuracy)', () => {
    tracker.recordRun('dorian', 7, 7); // Box 2
    tracker.recordRun('dorian', 7, 7); // Box 3
    expect(tracker.getModeMastery('dorian').box).toBe(3);

    tracker.recordRun('dorian', 2, 7); // Mistake-heavy run (< 30%)
    expect(tracker.getModeMastery('dorian').box).toBe(2);
  });
});

describe('Learning Layer - Daily Run Determinism', () => {
  it('generates the exact same daily challenge for a given date across instances', () => {
    const tracker = new MasteryTracker();
    const selector = new ChallengeSelector(tracker);

    const chal1 = selector.getDailyChallenge('2026-10-19');
    const chal2 = selector.getDailyChallenge('2026-10-19');

    expect(chal1.modeId).toBe(chal2.modeId);
    expect(chal1.tonicName).toBe(chal2.tonicName);
    expect(chal1.id).toBe(chal2.id);
  });

  it('produces pseudo-random deterministic sequence with Mulberry32', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);
    for (let i = 0; i < 5; i++) {
      expect(rng1()).toBe(rng2());
    }
  });
});
