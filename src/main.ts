import { ORDERED_MODES_BY_BRIGHTNESS } from './core/modes';
import { Step } from './core/types';
import { AudioEngine } from './audio/audioEngine';
import { MasteryTracker } from './learning/masteryTracker';
import { ChallengeSelector } from './learning/challengeSelector';
import { RunController, GameState } from './game/runController';
import { SceneRenderer } from './render/sceneRenderer';

// Initialize core Singletons
const audioEngine = new AudioEngine();
const masteryTracker = new MasteryTracker();
const challengeSelector = new ChallengeSelector(masteryTracker);
const runController = new RunController();

// DOM elements
const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
const challengeTitleEl = document.getElementById('challenge-title') as HTMLElement;
const challengeSubEl = document.getElementById('challenge-sub') as HTMLElement;
const scaleRibbonEl = document.getElementById('scale-ribbon') as HTMLElement;
const comboDisplayEl = document.getElementById('combo-display') as HTMLElement;
const silentHintEl = document.getElementById('silent-hint') as HTMLElement;

const btnHalf = document.getElementById('btn-half') as HTMLButtonElement;
const btnWhole = document.getElementById('btn-whole') as HTMLButtonElement;
const btnSound = document.getElementById('btn-sound') as HTMLButtonElement;
const btnMap = document.getElementById('btn-map') as HTMLButtonElement;
const btnDaily = document.getElementById('btn-daily') as HTMLButtonElement;

const revealModal = document.getElementById('reveal-modal') as HTMLElement;
const revealTitleEl = document.getElementById('reveal-title') as HTMLElement;
const revealTaglineEl = document.getElementById('reveal-tagline') as HTMLElement;
const statAccuracyEl = document.getElementById('stat-accuracy') as HTMLElement;
const statBoxEl = document.getElementById('stat-box') as HTMLElement;
const statStreakEl = document.getElementById('stat-streak') as HTMLElement;
const btnNextRun = document.getElementById('btn-next-run') as HTMLButtonElement;
const btnCompareAudio = document.getElementById('btn-compare-audio') as HTMLButtonElement;

const mapModal = document.getElementById('map-modal') as HTMLElement;
const mapWorldListEl = document.getElementById('map-world-list') as HTMLElement;
const btnCloseMap = document.getElementById('btn-close-map') as HTMLButtonElement;

// Initialize SceneRenderer
const sceneRenderer = new SceneRenderer(canvas);

// Sound-off and synesthetic pulse integration
audioEngine.setPulseCallback((pulse) => {
  const currentMode = runController.getModeDef();
  const color = pulse.isError
    ? '#ff3366'
    : pulse.isCharacteristic
    ? currentMode?.palette.accent || '#ff007f'
    : currentMode?.palette.primary || '#00f5d4';

  sceneRenderer.triggerPulse(color, pulse.intensity);
});

// Sync UI with scale ribbon
function renderScaleRibbon(): void {
  const ctx = runController.getScaleContext();
  const stepIdx = runController.getCurrentStepIndex();
  scaleRibbonEl.innerHTML = '';

  ctx.spelledNotes.forEach((note, i) => {
    const pill = document.createElement('div');
    pill.className = 'ribbon-pill';
    const isReached = i <= stepIdx;
    const isActive = i === stepIdx;
    const isChar = i > 0 && i - 1 === ctx.mode.characteristicIndex;

    if (isActive) pill.classList.add('active');
    else if (isReached) pill.classList.add('reached');
    if (isChar) pill.classList.add('characteristic');

    const degree = ctx.degreeLabels[i];
    pill.innerHTML = `<div>${note}</div><div style="font-size:9px;opacity:0.75">${degree}</div>`;
    scaleRibbonEl.appendChild(pill);
  });
}

function updateHUD(): void {
  const chal = runController.getChallenge();
  const mode = runController.getModeDef();
  const stats = runController.getStats();

  challengeTitleEl.textContent = chal.title;
  challengeSubEl.textContent = `${mode.biomeName} · Brightness ${mode.brightness.toFixed(2)}`;

  if (stats.currentCombo > 1) {
    comboDisplayEl.style.display = 'block';
    comboDisplayEl.textContent = `RESONANCE x${stats.currentCombo}`;
  } else {
    comboDisplayEl.style.display = 'none';
  }

  renderScaleRibbon();
  sceneRenderer.updateState(mode, runController.getCurrentStepIndex(), runController.getState());
}

// Controller state listener
runController.onStateChange((state: GameState) => {
  updateHUD();

  if (state === 'OCTAVE_CLIMAX') {
    const ctx = runController.getScaleContext();
    audioEngine.playVictoryArpeggio(ctx.midiNotes);
  } else if (state === 'REVEAL_CARD') {
    showRevealCard();
  }
});

function startNewChallenge(challenge = challengeSelector.getNextChallenge()): void {
  revealModal.classList.remove('visible');
  runController.startRun(challenge);
  const mode = runController.getModeDef();
  const scale = runController.getScaleContext();

  // Start background tonic drone
  audioEngine.startTonicDrone(scale.tonicMidi, mode.brightness);
  // Play tonic starting note
  audioEngine.playStepNote(scale.midiNotes[0]);
  updateHUD();
}

async function handleStepInput(step: Step): Promise<void> {
  // Unlock audio on first touch if needed
  if (!audioEngine.isAudioUnlocked()) {
    await audioEngine.unlock();
  }

  const currentState = runController.getState();
  if (currentState !== 'AWAITING_STEP') return;

  const res = runController.submitStep(step);
  const { judgement } = res;

  if (judgement.correct) {
    audioEngine.playStepNote(judgement.info.midiNote, judgement.isCharacteristic);
  } else {
    audioEngine.playStumbleTone(judgement.info.midiNote);
  }
}

function showRevealCard(): void {
  const mode = runController.getModeDef();
  const stats = runController.getStats();
  const chal = runController.getChallenge();

  // Record Leitner progress
  masteryTracker.recordRun(mode.id, stats.correctCount, 7);
  if (chal.id.startsWith('daily_')) {
    masteryTracker.recordDailyRun(new Date().toISOString().slice(0, 10));
  }

  const masteryData = masteryTracker.getModeMastery(mode.id);
  const progress = masteryTracker.getProgress();
  const accuracyPct = Math.round((stats.correctCount / Math.max(1, stats.totalAttempts)) * 100);

  revealTitleEl.textContent = `${mode.name} Complete!`;
  revealTaglineEl.textContent = `"${mode.emotionalTagline}" Characteristic tone: ${mode.characteristicDegree}`;
  statAccuracyEl.textContent = `${accuracyPct}%`;
  statBoxEl.textContent = `Box ${masteryData.box}/5`;
  statStreakEl.textContent = `🔥 ${progress.streakDays}`;

  revealModal.classList.add('visible');
}

function showMasteryMap(): void {
  mapWorldListEl.innerHTML = '';
  const progress = masteryTracker.getProgress();

  ORDERED_MODES_BY_BRIGHTNESS.forEach((m) => {
    const data = progress.mastery[m.id];
    const item = document.createElement('div');
    item.style.background = 'rgba(255,255,255,0.05)';
    item.style.border = `1px solid ${m.palette.stepEdge}`;
    item.style.padding = '10px 14px';
    item.style.borderRadius = '12px';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';

    const stars = '★'.repeat(data.box) + '☆'.repeat(5 - data.box);

    item.innerHTML = `
      <div>
        <div style="font-weight:700; color:${m.palette.primary}">${m.name}</div>
        <div style="font-size:11px; color:#94a3b8">${m.biomeName} · ${m.formula}</div>
      </div>
      <div style="text-align:right">
        <div style="color:#ffb703; font-size:13px">${stars}</div>
        <div style="font-size:10px; color:#94a3b8">${data.runsCompleted} runs</div>
      </div>
    `;

    mapWorldListEl.appendChild(item);
  });

  mapModal.classList.add('visible');
}

// User interactions
btnHalf.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleStepInput('H');
});

btnWhole.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleStepInput('W');
});

// Desktop keyboard controls
window.addEventListener('keydown', (e) => {
  if (revealModal.classList.contains('visible')) {
    if (e.key === ' ' || e.key === 'Enter') {
      startNewChallenge();
    }
    return;
  }

  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'h') {
    handleStepInput('H');
  } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'w') {
    handleStepInput('W');
  }
});

btnSound.addEventListener('click', async () => {
  if (!audioEngine.isAudioUnlocked()) {
    await audioEngine.unlock();
  }
  const muted = audioEngine.toggleMute();
  btnSound.textContent = muted ? '🔇' : '🔊';
  silentHintEl.style.display = muted ? 'inline-flex' : 'none';
});

btnMap.addEventListener('click', () => {
  showMasteryMap();
});

btnCloseMap.addEventListener('click', () => {
  mapModal.classList.remove('visible');
});

btnDaily.addEventListener('click', () => {
  const daily = challengeSelector.getDailyChallenge();
  startNewChallenge(daily);
});

btnNextRun.addEventListener('click', () => {
  startNewChallenge();
});

btnCompareAudio.addEventListener('click', () => {
  const compareScale = runController.getScaleContext().midiNotes;
  audioEngine.playComparisonSequence(compareScale);
});

// Start initial run
window.addEventListener('DOMContentLoaded', () => {
  startNewChallenge();
});
