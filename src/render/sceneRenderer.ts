import { ModeDef, Step } from '../core/types';
import { GameState } from '../game/runController';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  maxLife: number;
  life: number;
}

export class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private particles: Particle[] = [];
  private runnerPos = { step: 0, x: 0, y: 0 };
  private targetRunnerPos = { x: 0, y: 0 };
  private stumbleOffset = 0;
  private animFrameId: number = 0;
  private lastTime: number = 0;

  // Visual state
  private modeDef?: ModeDef;
  private currentStepIndex: number = 0;
  private pulseIntensity: number = 0;
  private pulseColor: string = '#ffffff';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.handleResize = this.handleResize.bind(this);
    this.renderLoop = this.renderLoop.bind(this);

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.renderLoop);
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    cancelAnimationFrame(this.animFrameId);
  }

  public updateState(
    modeDef: ModeDef,
    stepIndex: number,
    state: GameState
  ): void {
    this.modeDef = modeDef;
    this.currentStepIndex = stepIndex;

    if (state === 'STUMBLE') {
      this.stumbleOffset = -18;
    }
  }

  public triggerPulse(color: string, intensity: number = 1.0): void {
    this.pulseColor = color;
    this.pulseIntensity = intensity;
    this.spawnParticles(this.runnerPos.x, this.runnerPos.y, color, intensity > 0.8 ? 24 : 12);
  }

  private handleResize(): void {
    const parent = this.canvas.parentElement || document.body;
    const rect = parent.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // capped at 2 for mobile performance

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: 2.5 + Math.random() * 3.5,
        alpha: 1.0,
        color,
        maxLife: 40 + Math.random() * 30,
        life: 0
      });
    }
  }

  private renderLoop(time: number): void {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.render(time, dt);
    this.animFrameId = requestAnimationFrame(this.renderLoop);
  }

  private render(time: number, dt: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const palette = this.modeDef?.palette || {
      primary: '#00F5D4',
      secondary: '#FFF3B0',
      accent: '#FF007F',
      bgTop: '#10002B',
      bgBottom: '#240046',
      stepSurface: '#3C096C',
      stepEdge: '#7B2CBF',
      glowColor: '#C77DFF'
    };

    // 1. Atmospheric Biome Sky Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, palette.bgTop);
    bgGrad.addColorStop(1, palette.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Synesthetic Mode Sun / Moon / Vortex
    const sunY = h * 0.22;
    const sunX = w * 0.5;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, w * 0.45);
    sunGrad.addColorStop(0, `${palette.primary}44`);
    sunGrad.addColorStop(0.5, `${palette.glowColor}22`);
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, w * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // 3. Compute 2.5D Isometric Staircase Coordinates
    // 8 steps (0 to 7) representing Tonic up to Octave
    const pattern = this.modeDef?.pattern || (['W', 'W', 'H', 'W', 'W', 'W', 'H'] as Step[]);
    const startX = w * 0.22;
    const startY = h * 0.72;
    const stepRise = (h * 0.45) / 7; // vertical climb per step
    const stepRun = (w * 0.6) / 7; // horizontal advance per step

    interface StepCoord {
      stepIdx: number;
      x: number;
      y: number;
      width: number;
      height: number;
      isHalf: boolean;
      isCharacteristic: boolean;
    }

    const stepCoords: StepCoord[] = [];
    let currentX = startX;
    let currentY = startY;

    for (let i = 0; i <= 7; i++) {
      const stepType = i < 7 ? pattern[i] : 'W';
      const isHalf = stepType === 'H';
      const isCharacteristic = i > 0 && i - 1 === this.modeDef?.characteristicIndex;

      // Half steps are compact (1 unit wide), Whole steps are wide (1.8 units wide)
      const visualWidth = isHalf ? 44 : 72;
      const visualHeight = 16;

      stepCoords.push({
        stepIdx: i,
        x: currentX,
        y: currentY,
        width: visualWidth,
        height: visualHeight,
        isHalf,
        isCharacteristic
      });

      if (i < 7) {
        currentX += stepRun;
        currentY -= stepRise;
      }
    }

    // 4. Draw Isometric Steps
    stepCoords.forEach((step, idx) => {
      const isReached = idx <= this.currentStepIndex;
      const isCurrent = idx === this.currentStepIndex;

      ctx.save();
      ctx.translate(step.x, step.y);

      // Step Glow if reached or characteristic
      if (isReached || step.isCharacteristic) {
        ctx.shadowColor = step.isCharacteristic ? palette.accent : palette.glowColor;
        ctx.shadowBlur = isCurrent ? 20 : 10;
      }

      // Step Isometric Top Surface
      ctx.beginPath();
      ctx.fillStyle = isReached ? palette.secondary : palette.stepSurface;
      ctx.roundRect(-step.width / 2, -step.height / 2, step.width, step.height, 4);
      ctx.fill();

      // Step Edge Rim
      ctx.strokeStyle = step.isCharacteristic ? palette.accent : palette.stepEdge;
      ctx.lineWidth = isCurrent ? 2.5 : 1.2;
      ctx.stroke();

      // Characteristic Prism Indicator
      if (step.isCharacteristic) {
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw H / W glyph badge below step
      if (idx < 7) {
        const glyph = pattern[idx];
        ctx.fillStyle = isReached ? `${palette.primary}cc` : '#ffffff55';
        ctx.font = '600 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(glyph === 'H' ? '½' : '1', 0, 16);
      }

      ctx.restore();
    });

    // 5. Update & Draw Runner Character
    const targetCoord = stepCoords[Math.min(this.currentStepIndex, 7)];
    this.targetRunnerPos.x = targetCoord.x;
    this.targetRunnerPos.y = targetCoord.y - 24;

    // Smooth position interpolation
    this.runnerPos.x += (this.targetRunnerPos.x - this.runnerPos.x) * 0.18;
    this.runnerPos.y += (this.targetRunnerPos.y - this.runnerPos.y) * 0.18;

    // Recovery from stumble
    if (this.stumbleOffset < 0) {
      this.stumbleOffset += 35 * dt;
      if (this.stumbleOffset > 0) this.stumbleOffset = 0;
    }

    const runnerDrawX = this.runnerPos.x + this.stumbleOffset;
    const runnerDrawY = this.runnerPos.y + (Math.sin(time * 0.006) * 3); // subtle kinetic idle bounce

    // Runner Glow
    ctx.save();
    ctx.shadowColor = palette.primary;
    ctx.shadowBlur = 18;

    // Runner Body (Kinetic Diamond / Prism Entity)
    ctx.translate(runnerDrawX, runnerDrawY);
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();

    // Runner Core Energy
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 6. Update and Draw Ambient & Burst Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. Sound-Off Synesthetic Pulse Ripple
    if (this.pulseIntensity > 0) {
      this.pulseIntensity -= dt * 2.2;
      if (this.pulseIntensity < 0) this.pulseIntensity = 0;

      ctx.save();
      ctx.strokeStyle = this.pulseColor;
      ctx.lineWidth = 4 * this.pulseIntensity;
      ctx.globalAlpha = this.pulseIntensity * 0.6;
      ctx.beginPath();
      ctx.arc(runnerDrawX, runnerDrawY, (1 - this.pulseIntensity) * 90 + 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
