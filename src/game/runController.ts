import { MODES } from '../core/modes';
import { createScaleContext, judgeStep, ScaleContext } from '../core/scale';
import { ModeDef, Step, StepJudgement } from '../core/types';
import { ChallengeDef } from '../learning/types';

export type GameState =
  | 'INIT'
  | 'INTRO'
  | 'AWAITING_STEP'
  | 'RESOLVING_STEP'
  | 'STUMBLE'
  | 'OCTAVE_CLIMAX'
  | 'REVEAL_CARD';

export interface RunStats {
  correctCount: number;
  totalAttempts: number;
  maxCombo: number;
  currentCombo: number;
  startTime: number;
  endTime: number;
  history: StepJudgement[];
}

export class RunController {
  private state: GameState = 'INIT';
  private challenge!: ChallengeDef;
  private modeDef!: ModeDef;
  private scaleCtx!: ScaleContext;
  private currentStepIndex: number = 0; // 0 to 6 (7 steps total)
  private stats: RunStats = {
    correctCount: 0,
    totalAttempts: 0,
    maxCombo: 0,
    currentCombo: 0,
    startTime: 0,
    endTime: 0,
    history: []
  };

  private listeners: ((state: GameState) => void)[] = [];

  constructor() {}

  public onStateChange(listener: (state: GameState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private setState(newState: GameState): void {
    this.state = newState;
    this.listeners.forEach((l) => l(newState));
  }

  public getState(): GameState {
    return this.state;
  }

  public getChallenge(): ChallengeDef {
    return this.challenge;
  }

  public getModeDef(): ModeDef {
    return this.modeDef;
  }

  public getScaleContext(): ScaleContext {
    return this.scaleCtx;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public getStats(): RunStats {
    return { ...this.stats };
  }

  /**
   * Initializes a new run with the selected challenge
   */
  public startRun(challenge: ChallengeDef): void {
    this.challenge = challenge;
    this.modeDef = MODES[challenge.modeId];
    this.scaleCtx = createScaleContext(challenge.tonicName, this.modeDef);
    this.currentStepIndex = 0;
    this.stats = {
      correctCount: 0,
      totalAttempts: 0,
      maxCombo: 0,
      currentCombo: 0,
      startTime: Date.now(),
      endTime: 0,
      history: []
    };

    this.setState('INTRO');
    setTimeout(() => {
      if (this.state === 'INTRO') {
        this.setState('AWAITING_STEP');
      }
    }, 600);
  }

  /**
   * Handles player's input ('H' or 'W')
   */
  public submitStep(chosen: Step): {
    judgement: StepJudgement;
    newState: GameState;
  } {
    if (this.state !== 'AWAITING_STEP' && this.state !== 'STUMBLE') {
      throw new Error(`Cannot submit step in state ${this.state}`);
    }

    this.stats.totalAttempts += 1;
    const judgement = judgeStep(this.currentStepIndex, chosen, this.scaleCtx);
    this.stats.history.push(judgement);

    if (judgement.correct) {
      this.stats.correctCount += 1;
      this.stats.currentCombo += 1;
      if (this.stats.currentCombo > this.stats.maxCombo) {
        this.stats.maxCombo = this.stats.currentCombo;
      }

      this.currentStepIndex += 1;

      if (this.currentStepIndex >= 7) {
        // Completed all 7 steps (reached octave)!
        this.stats.endTime = Date.now();
        this.setState('OCTAVE_CLIMAX');
        setTimeout(() => {
          this.setState('REVEAL_CARD');
        }, 1800);
      } else {
        this.setState('RESOLVING_STEP');
        setTimeout(() => {
          this.setState('AWAITING_STEP');
        }, 220);
      }
    } else {
      // Wrong step! Stumble and reset combo
      this.stats.currentCombo = 0;
      this.setState('STUMBLE');
      setTimeout(() => {
        if (this.state === 'STUMBLE') {
          this.setState('AWAITING_STEP');
        }
      }, 500);
    }

    return {
      judgement,
      newState: this.state
    };
  }

  /**
   * Hints the next expected step
   */
  public getHint(): Step {
    return this.scaleCtx.mode.pattern[this.currentStepIndex];
  }
}
