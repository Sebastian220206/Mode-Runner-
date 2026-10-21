export type Step = 'H' | 'W';

export type ModeId =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian';

export interface BiomePalette {
  primary: string;
  secondary: string;
  accent: string;
  bgTop: string;
  bgBottom: string;
  stepSurface: string;
  stepEdge: string;
  glowColor: string;
}

export interface ModeDef {
  id: ModeId;
  name: string;
  rotationIndex: number; // 0 to 6 rotation from Ionian
  pattern: Step[]; // 7 steps to the octave
  brightness: number; // 0.0 (darkest/Locrian) -> 1.0 (brightest/Lydian)
  characteristicIndex: number; // 0-indexed step leading to characteristic degree
  characteristicDegree: string; // e.g. '#4', 'b7', '♮6', 'b2', 'b5'
  formula: string; // e.g. '1 2 b3 4 5 6 b7'
  emotionalTagline: string;
  biomeName: string;
  palette: BiomePalette;
}

export interface ScaleStepInfo {
  stepIndex: number; // 0 to 6
  stepChoice: Step; // 'H' or 'W'
  semitones: number; // 1 or 2
  midiNote: number; // MIDI note number
  noteName: string; // e.g., 'F#', 'Bb'
  degreeLabel: string; // e.g., '1', '2', 'b3', '#4', etc.
  isCharacteristic: boolean;
}

export interface StepJudgement {
  correct: boolean;
  chosen: Step;
  expected: Step;
  stepIndex: number;
  info: ScaleStepInfo;
  isCharacteristic: boolean;
  isFinalStep: boolean;
}
