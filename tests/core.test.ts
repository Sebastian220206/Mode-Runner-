import { describe, it, expect } from 'vitest';
import {
  MODES,
  ORDERED_MODES_BY_BRIGHTNESS,
  rotatePattern,
  MAJOR_PATTERN,
  buildScaleMidi,
  spellScale,
  createScaleContext,
  judgeStep
} from '../src/core';

describe('Theory Core - Mode Rotations and Properties', () => {
  it('correctly derives all 7 modes from Major pattern rotations', () => {
    // Ionian
    expect(rotatePattern(MAJOR_PATTERN, 0)).toEqual(['W', 'W', 'H', 'W', 'W', 'W', 'H']);
    // Dorian
    expect(rotatePattern(MAJOR_PATTERN, 1)).toEqual(['W', 'H', 'W', 'W', 'W', 'H', 'W']);
    // Phrygian
    expect(rotatePattern(MAJOR_PATTERN, 2)).toEqual(['H', 'W', 'W', 'W', 'H', 'W', 'W']);
    // Lydian
    expect(rotatePattern(MAJOR_PATTERN, 3)).toEqual(['W', 'W', 'W', 'H', 'W', 'W', 'H']);
    // Mixolydian
    expect(rotatePattern(MAJOR_PATTERN, 4)).toEqual(['W', 'W', 'H', 'W', 'W', 'H', 'W']);
    // Aeolian
    expect(rotatePattern(MAJOR_PATTERN, 5)).toEqual(['W', 'H', 'W', 'W', 'H', 'W', 'W']);
    // Locrian
    expect(rotatePattern(MAJOR_PATTERN, 6)).toEqual(['H', 'W', 'W', 'H', 'W', 'W', 'W']);
  });

  it('matches predefined MODES table accurately', () => {
    expect(MODES.ionian.pattern).toEqual(['W', 'W', 'H', 'W', 'W', 'W', 'H']);
    expect(MODES.dorian.pattern).toEqual(['W', 'H', 'W', 'W', 'W', 'H', 'W']);
    expect(MODES.phrygian.pattern).toEqual(['H', 'W', 'W', 'W', 'H', 'W', 'W']);
    expect(MODES.lydian.pattern).toEqual(['W', 'W', 'W', 'H', 'W', 'W', 'H']);
    expect(MODES.mixolydian.pattern).toEqual(['W', 'W', 'H', 'W', 'W', 'H', 'W']);
    expect(MODES.aeolian.pattern).toEqual(['W', 'H', 'W', 'W', 'H', 'W', 'W']);
    expect(MODES.locrian.pattern).toEqual(['H', 'W', 'W', 'H', 'W', 'W', 'W']);
  });

  it('verifies brightness ordering (Lydian -> Locrian)', () => {
    const ids = ORDERED_MODES_BY_BRIGHTNESS.map((m) => m.id);
    expect(ids).toEqual([
      'lydian',
      'ionian',
      'mixolydian',
      'dorian',
      'aeolian',
      'phrygian',
      'locrian'
    ]);
  });
});

describe('Theory Core - Enharmonic Spelling Engine', () => {
  it('correctly spells C Ionian (all naturals)', () => {
    const spelled = spellScale('C', MODES.ionian);
    expect(spelled).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']);
  });

  it('correctly spells D Dorian (all naturals, D to D)', () => {
    const spelled = spellScale('D', MODES.dorian);
    expect(spelled).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C', 'D']);
  });

  it('correctly spells F Lydian (all naturals, F to F)', () => {
    const spelled = spellScale('F', MODES.lydian);
    expect(spelled).toEqual(['F', 'G', 'A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('correctly spells G Mixolydian (all naturals, G to G)', () => {
    const spelled = spellScale('G', MODES.mixolydian);
    expect(spelled).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('correctly spells A Aeolian (all naturals, A to A)', () => {
    const spelled = spellScale('A', MODES.aeolian);
    expect(spelled).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A']);
  });

  it('correctly spells E Phrygian (all naturals, E to E)', () => {
    const spelled = spellScale('E', MODES.phrygian);
    expect(spelled).toEqual(['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E']);
  });

  it('correctly spells B Locrian (all naturals, B to B)', () => {
    const spelled = spellScale('B', MODES.locrian);
    expect(spelled).toEqual(['B', 'C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('correctly spells non-natural tonics: Bb Mixolydian & Eb Dorian', () => {
    const bbMixo = spellScale('Bb', MODES.mixolydian);
    expect(bbMixo).toEqual(['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A♭', 'B♭']);

    const ebDorian = spellScale('Eb', MODES.dorian);
    expect(ebDorian).toEqual(['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C', 'D♭', 'E♭']);
  });
});

describe('Theory Core - Scale Building & Step Judging', () => {
  it('builds 8-note MIDI array reaching exact octave (+12 semitones)', () => {
    const midi = buildScaleMidi(60, MODES.dorian.pattern);
    expect(midi.length).toBe(8);
    expect(midi[0]).toBe(60);
    expect(midi[7]).toBe(72);
  });

  it('evaluates player step choices correctly and flags characteristic degree', () => {
    const ctx = createScaleContext('D', MODES.dorian);

    // Step 0: D -> E (W)
    const judge0 = judgeStep(0, 'W', ctx);
    expect(judge0.correct).toBe(true);
    expect(judge0.info.noteName).toBe('E');

    // Step 1: E -> F (H)
    const judge1Wrong = judgeStep(1, 'W', ctx);
    expect(judge1Wrong.correct).toBe(false);
    expect(judge1Wrong.expected).toBe('H');

    // Step 4: Dorian step 4 is G -> A (W), Step 5 is A -> B (H in pattern? Dorian pattern is W, H, W, W, W, H, W.
    // Index 0: D->E (W)
    // Index 1: E->F (H)
    // Index 2: F->G (W)
    // Index 3: G->A (W)
    // Index 4: A->B (W) (leads to 6th degree B!)
    // Index 5: B->C (H)
    // Index 6: C->D (W)
    const judge4 = judgeStep(4, 'W', ctx);
    expect(judge4.correct).toBe(true);
    expect(judge4.isCharacteristic).toBe(true);
    expect(judge4.info.degreeLabel).toBe('6');
  });
});
