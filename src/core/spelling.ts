import { ModeDef, Step } from './types';

export const DIATONIC_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type DiatonicLetter = (typeof DIATONIC_LETTERS)[number];

// Semitone offset from C for natural notes
export const NATURAL_SEMITONES: Record<DiatonicLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

export interface NoteSpelling {
  letter: DiatonicLetter;
  accidental: string; // '', '#', 'b', '##', 'bb'
  midi: number;
  fullName: string; // e.g. 'F#', 'Bb'
}

/**
 * Parses tonic string like 'C', 'D#', 'Eb', 'F#', 'Ab', 'B'
 */
export function parseNoteName(name: string): { letter: DiatonicLetter; accidental: string } {
  const clean = name.trim();
  const letter = clean[0].toUpperCase() as DiatonicLetter;
  if (!DIATONIC_LETTERS.includes(letter)) {
    throw new Error(`Invalid note letter in ${name}`);
  }
  const accidental = clean.slice(1);
  return { letter, accidental };
}

/**
 * Converts a tonic note name into standard pitch class (0..11)
 */
export function noteNameToPitchClass(name: string): number {
  const { letter, accidental } = parseNoteName(name);
  let pc = NATURAL_SEMITONES[letter];
  for (const char of accidental) {
    if (char === '#') pc += 1;
    else if (char === 'b') pc -= 1;
  }
  return ((pc % 12) + 12) % 12;
}

/**
 * Given a base octave (e.g. 4 for C4 = 60), returns starting MIDI note
 */
export function tonicToMidi(tonicName: string, octave: number = 4): number {
  const pc = noteNameToPitchClass(tonicName);
  // Standard MIDI: C4 is 60 (octave 4, pc 0)
  return (octave + 1) * 12 + pc;
}

/**
 * Builds 8-note MIDI array from tonic MIDI note following mode step pattern
 */
export function buildScaleMidi(tonicMidi: number, pattern: Step[]): number[] {
  const notes = [tonicMidi];
  let current = tonicMidi;
  for (const s of pattern) {
    current += s === 'H' ? 1 : 2;
    notes.push(current);
  }
  return notes;
}

/**
 * Proper 7-letter diatonic enharmonic speller.
 * Every heptatonic mode MUST contain consecutive diatonic letters:
 * e.g., D Dorian MUST spell D - E - F - G - A - B - C - D
 * F Lydian MUST spell F - G - A - B - C - D - E - F
 * Eb Minor MUST spell Eb - F - Gb - Ab - Bb - Cb - Db - Eb
 */
export function spellScale(tonicName: string, mode: ModeDef): string[] {
  const { letter: startLetter } = parseNoteName(tonicName);
  const letterIdx = DIATONIC_LETTERS.indexOf(startLetter);

  const midiNotes = buildScaleMidi(tonicToMidi(tonicName, 4), mode.pattern);
  const spelled: string[] = [];

  for (let i = 0; i < 8; i++) {
    const letter = DIATONIC_LETTERS[(letterIdx + i) % 7];
    const targetMidi = midiNotes[i];
    const targetPc = targetMidi % 12;
    const naturalPc = NATURAL_SEMITONES[letter];

    // Compute delta between target pitch class and natural letter pitch class
    let diff = (targetPc - naturalPc + 12) % 12;
    if (diff > 6) diff -= 12; // handle flats (e.g. diff = 11 means -1, so flat)

    let accidental = '';
    if (diff === 1) accidental = '♯';
    else if (diff === 2) accidental = '𝄪';
    else if (diff === -1) accidental = '♭';
    else if (diff === -2) accidental = '𝄫';
    else if (diff !== 0) {
      // Fallback for extreme cases
      accidental = diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff);
    }

    spelled.push(`${letter}${accidental}`);
  }

  return spelled;
}

/**
 * Returns human-readable scale degree symbols (1, b2, 2, b3, 3, 4, #4, 5, b6, 6, b7, 7, 8)
 */
export function getScaleDegreeLabels(mode: ModeDef): string[] {
  const degreeMap: Record<number, string> = {
    0: '1',
    1: '♭2',
    2: '2',
    3: '♭3',
    4: '3',
    5: '4',
    6: '♯4/♭5',
    7: '5',
    8: '♭6',
    9: '6',
    10: '♭7',
    11: '7',
    12: '8'
  };

  const labels = ['1'];
  let semitones = 0;
  for (let i = 0; i < mode.pattern.length; i++) {
    semitones += mode.pattern[i] === 'H' ? 1 : 2;
    if (i === 6) {
      labels.push('8');
    } else {
      labels.push(degreeMap[semitones] || `${semitones}st`);
    }
  }
  return labels;
}
