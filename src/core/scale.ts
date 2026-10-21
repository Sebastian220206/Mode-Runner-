import { ModeDef, ScaleStepInfo, Step, StepJudgement } from './types';
import { buildScaleMidi, getScaleDegreeLabels, spellScale, tonicToMidi } from './spelling';

export interface ScaleContext {
  tonicName: string;
  tonicMidi: number;
  mode: ModeDef;
  midiNotes: number[]; // 8 notes [tonic..octave]
  spelledNotes: string[]; // 8 spelled notes
  degreeLabels: string[]; // 8 degree labels
}

export function createScaleContext(tonicName: string, mode: ModeDef, octave: number = 4): ScaleContext {
  const tonicMidi = tonicToMidi(tonicName, octave);
  const midiNotes = buildScaleMidi(tonicMidi, mode.pattern);
  const spelledNotes = spellScale(tonicName, mode);
  const degreeLabels = getScaleDegreeLabels(mode);

  return {
    tonicName,
    tonicMidi,
    mode,
    midiNotes,
    spelledNotes,
    degreeLabels
  };
}

/**
 * Evaluates a player's step choice (H or W) at index i (0..6).
 */
export function judgeStep(
  stepIndex: number,
  chosen: Step,
  ctx: ScaleContext
): StepJudgement {
  const expected = ctx.mode.pattern[stepIndex];
  const correct = chosen === expected;

  // The step leads from index stepIndex to stepIndex + 1
  const targetNoteIndex = stepIndex + 1;
  const isCharacteristic = stepIndex === ctx.mode.characteristicIndex;
  const isFinalStep = stepIndex === 6;

  // If wrong, calculate what MIDI note they actually hit with their chosen step
  const actualSemitones = chosen === 'H' ? 1 : 2;
  const playedMidi = correct
    ? ctx.midiNotes[targetNoteIndex]
    : ctx.midiNotes[stepIndex] + actualSemitones;

  const info: ScaleStepInfo = {
    stepIndex,
    stepChoice: chosen,
    semitones: actualSemitones,
    midiNote: playedMidi,
    noteName: correct ? ctx.spelledNotes[targetNoteIndex] : '?',
    degreeLabel: correct ? ctx.degreeLabels[targetNoteIndex] : '✖',
    isCharacteristic
  };

  return {
    correct,
    chosen,
    expected,
    stepIndex,
    info,
    isCharacteristic,
    isFinalStep
  };
}
