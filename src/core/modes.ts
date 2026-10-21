import { ModeDef, ModeId, Step } from './types';

// The canonical Ionian (Major) step pattern: W W H W W W H
export const MAJOR_PATTERN: Step[] = ['W', 'W', 'H', 'W', 'W', 'W', 'H'];

/**
 * Rotates an array to generate the 7 church modes from Major.
 * Step 0: Ionian (Major)
 * Step 1: Dorian
 * Step 2: Phrygian
 * Step 3: Lydian
 * Step 4: Mixolydian
 * Step 5: Aeolian (Natural Minor)
 * Step 6: Locrian
 */
export function rotatePattern(pattern: Step[], steps: number): Step[] {
  const n = pattern.length;
  const normalized = ((steps % n) + n) % n;
  return [...pattern.slice(normalized), ...pattern.slice(0, normalized)];
}

export const MODES: Record<ModeId, ModeDef> = {
  lydian: {
    id: 'lydian',
    name: 'Lydian',
    rotationIndex: 3,
    pattern: rotatePattern(MAJOR_PATTERN, 3), // W W W H W W H
    brightness: 1.0,
    characteristicIndex: 3, // leading to degree #4 (note index 4)
    characteristicDegree: '♯4',
    formula: '1  2  3  ♯4  5  6  7',
    emotionalTagline: 'Cosmic wonder, ethereal floating, heroic elevation',
    biomeName: 'Astral Prism Spire',
    palette: {
      primary: '#00F5D4',
      secondary: '#FFF3B0',
      accent: '#FF007F',
      bgTop: '#14002E',
      bgBottom: '#480CA8',
      stepSurface: '#7B2CBF',
      stepEdge: '#00F5D4',
      glowColor: '#00F5D4'
    }
  },
  ionian: {
    id: 'ionian',
    name: 'Ionian (Major)',
    rotationIndex: 0,
    pattern: rotatePattern(MAJOR_PATTERN, 0), // W W H W W W H
    brightness: 0.83,
    characteristicIndex: 6, // leading to leading tone 7 (or 3 for major feel)
    characteristicDegree: '7',
    formula: '1  2  3  4  5  6  7',
    emotionalTagline: 'Luminous resolution, triumphant clarity, grounded joy',
    biomeName: 'Sunlit Marble Citadel',
    palette: {
      primary: '#00AFB9',
      secondary: '#FDFCDC',
      accent: '#F07167',
      bgTop: '#003049',
      bgBottom: '#0077B6',
      stepSurface: '#0096C7',
      stepEdge: '#FDFCDC',
      glowColor: '#90E0EF'
    }
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolydian',
    rotationIndex: 4,
    pattern: rotatePattern(MAJOR_PATTERN, 4), // W W H W W H W
    brightness: 0.67,
    characteristicIndex: 6, // leading to degree b7
    characteristicDegree: '♭7',
    formula: '1  2  3  4  5  6  ♭7',
    emotionalTagline: 'Warm bluesy swagger, Celtic journey, unbuttoned major',
    biomeName: 'Amber Canyon Sunset',
    palette: {
      primary: '#FB8500',
      secondary: '#FFB703',
      accent: '#219EBC',
      bgTop: '#1B1424',
      bgBottom: '#6A040F',
      stepSurface: '#9D0208',
      stepEdge: '#FFB703',
      glowColor: '#FB8500'
    }
  },
  dorian: {
    id: 'dorian',
    name: 'Dorian',
    rotationIndex: 1,
    pattern: rotatePattern(MAJOR_PATTERN, 1), // W H W W W H W
    brightness: 0.5,
    characteristicIndex: 4, // step 4: leads to degree 6 (A -> B in D Dorian)
    characteristicDegree: '♮6',
    formula: '1  2  ♭3  4  5  6  ♭7',
    emotionalTagline: 'Hopeful minor, noble melancholy, medieval ballad',
    biomeName: 'Bioluminescent Canopy',
    palette: {
      primary: '#2A9D8F',
      secondary: '#E9C46A',
      accent: '#E76F51',
      bgTop: '#0D1B2A',
      bgBottom: '#1B4332',
      stepSurface: '#2D6A4F',
      stepEdge: '#52B788',
      glowColor: '#74C69D'
    }
  },
  aeolian: {
    id: 'aeolian',
    name: 'Aeolian (Minor)',
    rotationIndex: 5,
    pattern: rotatePattern(MAJOR_PATTERN, 5), // W H W W H W W
    brightness: 0.33,
    characteristicIndex: 4, // leading to b6
    characteristicDegree: '♭6',
    formula: '1  2  ♭3  4  5  ♭6  ♭7',
    emotionalTagline: 'Deep introspective sorrow, cinematic weight, solemn depth',
    biomeName: 'Moonlit Indigo Ruins',
    palette: {
      primary: '#457B9D',
      secondary: '#A8DADC',
      accent: '#E63946',
      bgTop: '#0B091A',
      bgBottom: '#1D3557',
      stepSurface: '#243E56',
      stepEdge: '#A8DADC',
      glowColor: '#457B9D'
    }
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian',
    rotationIndex: 2,
    pattern: rotatePattern(MAJOR_PATTERN, 2), // H W W W H W W
    brightness: 0.17,
    characteristicIndex: 0, // step 0 is H, immediate flat 2!
    characteristicDegree: '♭2',
    formula: '1  ♭2  ♭3  4  5  ♭6  ♭7',
    emotionalTagline: 'Flamenco fire, dark exotic tension, fierce urgency',
    biomeName: 'Obsidian Crimson Forge',
    palette: {
      primary: '#E63946',
      secondary: '#FF758F',
      accent: '#FFAA00',
      bgTop: '#100007',
      bgBottom: '#3D0014',
      stepSurface: '#590D22',
      stepEdge: '#E63946',
      glowColor: '#FF4D6D'
    }
  },
  locrian: {
    id: 'locrian',
    name: 'Locrian',
    rotationIndex: 6,
    pattern: rotatePattern(MAJOR_PATTERN, 6), // H W W H W W W
    brightness: 0.0,
    characteristicIndex: 4, // leading to diminished 5th (b5)
    characteristicDegree: '♭5',
    formula: '1  ♭2  ♭3  4  ♭5  ♭6  ♭7',
    emotionalTagline: 'Unstable abyss, diminished vertigo, otherworldly void',
    biomeName: 'Void Eclipse Monolith',
    palette: {
      primary: '#9D4EDD',
      secondary: '#E0AAFF',
      accent: '#3A0CA3',
      bgTop: '#05020A',
      bgBottom: '#10002B',
      stepSurface: '#240046',
      stepEdge: '#7B2CBF',
      glowColor: '#C77DFF'
    }
  }
};

export const ORDERED_MODES_BY_BRIGHTNESS: ModeDef[] = Object.values(MODES).sort(
  (a, b) => b.brightness - a.brightness
);
