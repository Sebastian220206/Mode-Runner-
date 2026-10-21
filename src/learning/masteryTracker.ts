import { ModeId } from '../core/types';
import { DEFAULT_PLAYER_PROGRESS, ModeMasteryData, PlayerProgress } from './types';

const STORAGE_KEY = 'mode_runner_player_save_v1';

export class MasteryTracker {
  private progress: PlayerProgress;

  constructor() {
    this.progress = this.loadFromStorage();
  }

  public getProgress(): PlayerProgress {
    return { ...this.progress };
  }

  public getModeMastery(modeId: ModeId): ModeMasteryData {
    return this.progress.mastery[modeId] || {
      modeId,
      box: 1,
      runsCompleted: 0,
      accuracySum: 0,
      lastPracticed: 0
    };
  }

  /**
   * Promotes or demotes Leitner box based on run accuracy (e.g. 7/7 correct = +1 box, mistakes = -1 box or reset)
   */
  public recordRun(modeId: ModeId, correctSteps: number, totalSteps: number = 7): void {
    const data = this.getModeMastery(modeId);
    const accuracy = correctSteps / totalSteps;

    data.runsCompleted += 1;
    data.accuracySum += accuracy;
    data.lastPracticed = Date.now();

    if (accuracy >= 1.0) {
      // Flawless run promotes up to Box 5
      data.box = Math.min(5, data.box + 1);
    } else if (accuracy < 0.7) {
      // Significant mistakes drop box back
      data.box = Math.max(1, data.box - 1);
    }

    this.progress.mastery[modeId] = data;
    this.updateStreak();
    this.saveToStorage();
  }

  /**
   * Updates streaks with a 1-day grace freeze so a single missed day doesn't wipe progress
   */
  public updateStreak(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.progress.lastActiveDay === today) {
      return;
    }

    if (!this.progress.lastActiveDay) {
      this.progress.streakDays = 1;
      this.progress.lastActiveDay = today;
      return;
    }

    const prevDate = new Date(this.progress.lastActiveDay);
    const currDate = new Date(today);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      this.progress.streakDays += 1;
    } else if (diffDays === 2 && this.progress.graceFreezesRemaining > 0) {
      // Used grace freeze
      this.progress.graceFreezesRemaining -= 1;
      this.progress.streakDays += 1;
    } else {
      // Streak broken, reset
      this.progress.streakDays = 1;
      this.progress.graceFreezesRemaining = 1;
    }

    this.progress.lastActiveDay = today;
    this.saveToStorage();
  }

  public recordDailyRun(dateStr: string): void {
    if (!this.progress.dailyCompletedDates.includes(dateStr)) {
      this.progress.dailyCompletedDates.push(dateStr);
      this.saveToStorage();
    }
  }

  public isDailyCompleted(dateStr: string): boolean {
    return this.progress.dailyCompletedDates.includes(dateStr);
  }

  private loadFromStorage(): PlayerProgress {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...DEFAULT_PLAYER_PROGRESS,
            ...parsed,
            mastery: {
              ...DEFAULT_PLAYER_PROGRESS.mastery,
              ...(parsed.mastery || {})
            }
          };
        }
      }
    } catch (e) {
      console.warn('Storage unavailable or blocked, falling back to in-memory state.', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PLAYER_PROGRESS));
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }
}
